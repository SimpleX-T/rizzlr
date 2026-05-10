import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'

import { getEscrowProgramId } from '@/lib/escrow/config'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 })
  }

  const { id: challengeId } = await ctx.params
  if (!challengeId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  let body: { signature?: string; wallet?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const signature = body.signature?.trim()
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: ch, error: fetchErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle()

  if (fetchErr || !ch) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  if (ch.wager_type !== 'sol_escrow') {
    return NextResponse.json({ error: 'Not an escrow challenge' }, { status: 400 })
  }

  if (ch.escrow_state !== 'pending_creator') {
    return NextResponse.json(
      { error: 'Creator deposit already confirmed or not required' },
      { status: 409 },
    )
  }

  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  const connection = new Connection(rpc, 'confirmed')
  const programId = getEscrowProgramId()

  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })

  if (!tx || tx.meta?.err) {
    return NextResponse.json(
      { error: 'Transaction not found or failed on-chain' },
      { status: 400 },
    )
  }

  const logs = tx.meta?.logMessages ?? []
  const pidStr = programId.toBase58()
  const programOk = logs.some((line) => line.includes(`Program ${pidStr} success`))
  if (!programOk) {
    return NextResponse.json(
      { error: 'Transaction did not successfully invoke the escrow program' },
      { status: 400 },
    )
  }

  const keys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  })
  const feePayer = keys.staticAccountKeys[0]
  if (!feePayer) {
    return NextResponse.json({ error: 'Could not read fee payer' }, { status: 400 })
  }

  const walletHint = body.wallet?.trim()
  if (walletHint && walletHint !== feePayer.toBase58()) {
    return NextResponse.json({ error: 'Fee payer does not match wallet' }, { status: 403 })
  }

  try {
    const creatorPk = new PublicKey(ch.creator_wallet as string)
    if (!feePayer.equals(creatorPk)) {
      return NextResponse.json(
        { error: 'Transaction must be signed by the challenge creator' },
        { status: 403 },
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid creator wallet on record' }, { status: 500 })
  }

  const { error: updErr } = await supabase
    .from('challenges')
    .update({ escrow_state: 'ready_for_challenger' })
    .eq('id', challengeId)
    .eq('escrow_state', 'pending_creator')

  if (updErr) {
    console.error('[confirm-escrow]', updErr)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  await supabase.from('challenge_transactions').insert({
    challenge_id: challengeId,
    tx_type: 'deposit_creator',
    signature,
  })

  return NextResponse.json({ ok: true })
}
