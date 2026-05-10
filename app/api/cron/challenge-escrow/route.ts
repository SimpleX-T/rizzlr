import { NextRequest, NextResponse } from 'next/server'
import { clusterApiUrl, Connection } from '@solana/web3.js'

import { isEscrowConfigured } from '@/lib/escrow/config'
import { executeRefundGhostCreator } from '@/lib/escrow/settlement'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

function rpc(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  )
}

/** Protect with CRON_SECRET (Authorization: Bearer) or run manually in dev. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')?.trim()
  const ok =
    process.env.NODE_ENV === 'development' ||
    (secret && auth === `Bearer ${secret}`)
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: staleRows } = await supabase
    .from('challenges')
    .select('id, wager_type, escrow_state, status, creator_wallet, expires_at')
    .lt('expires_at', nowIso)
    .in('status', ['open', 'accepted'])

  const refunded: string[] = []
  const cancelled: string[] = []

  for (const row of staleRows ?? []) {
    const id = row.id as string
    if (row.wager_type !== 'sol_escrow') {
      await supabase.from('challenges').update({ status: 'expired' }).eq('id', id)
      cancelled.push(id)
      continue
    }

    if (row.escrow_state === 'pending_creator') {
      await supabase
        .from('challenges')
        .update({ status: 'cancelled', escrow_state: 'aborted' })
        .eq('id', id)
      cancelled.push(id)
      continue
    }

    if (
      row.escrow_state === 'ready_for_challenger' &&
      row.status === 'open' &&
      isEscrowConfigured()
    ) {
      try {
        const sig = await executeRefundGhostCreator({
          challengeIdUuid: id,
          creatorWallet: row.creator_wallet as string,
        })
        await supabase.from('challenge_transactions').insert({
          challenge_id: id,
          tx_type: 'refund',
          signature: sig,
        })
        await supabase
          .from('challenges')
          .update({ status: 'expired', escrow_state: 'refunded' })
          .eq('id', id)
        refunded.push(id)
      } catch (e) {
        console.error('[cron refund]', id, e)
      }
      continue
    }

    await supabase.from('challenges').update({ status: 'expired' }).eq('id', id)
    cancelled.push(id)
  }

  const conn = new Connection(rpc(), 'confirmed')
  const slot = await conn.getSlot('confirmed')

  return NextResponse.json({
    ok: true,
    slot,
    expiredOrCancelled: cancelled.length,
    escrowRefunded: refunded.length,
    ids: { cancelled, refunded },
  })
}
