import { NextRequest, NextResponse } from 'next/server'
import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from '@solana/web3.js'

import { getTimeExtensionLamports } from '@/lib/game-config'
import { PREMIUM_PERSONAS } from '@/lib/game-store'
import { getTreasuryPubkey } from '@/lib/solana/treasury'
import { verifyNativeTransferToRecipient } from '@/lib/solana/verify-inbound-transfer'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

function rpc(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  )
}

type Body = {
  wallet?: string
  signature?: string
  kind?: 'unlock_persona' | 'time_extension'
  personaId?: string
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const walletStr = body.wallet?.trim()
  const signature = body.signature?.trim()
  const kind = body.kind
  if (!walletStr || !signature || !kind) {
    return NextResponse.json({ error: 'wallet, signature, kind required' }, { status: 400 })
  }

  let walletPk: PublicKey
  try {
    walletPk = new PublicKey(walletStr)
  } catch {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('treasury_ledger')
    .select('id')
    .eq('tx_signature', signature)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyProcessed: true })
  }

  const treasury = getTreasuryPubkey()
  let minLamports = BigInt(0)
  let source: 'premium_unlock' | 'time_extension' = 'time_extension'
  let personaId: string | null = null

  if (kind === 'time_extension') {
    minLamports = BigInt(getTimeExtensionLamports())
    source = 'time_extension'
  } else if (kind === 'unlock_persona') {
    const pid = body.personaId?.trim()
    if (!pid) {
      return NextResponse.json({ error: 'personaId required' }, { status: 400 })
    }
    const persona = PREMIUM_PERSONAS.find((p) => p.id === pid)
    if (!persona?.unlockCost) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 })
    }
    minLamports = BigInt(Math.round(persona.unlockCost * LAMPORTS_PER_SOL))
    source = 'premium_unlock'
    personaId = persona.id
  } else {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  const connection = new Connection(rpc(), 'confirmed')
  const ok = await verifyNativeTransferToRecipient(connection, signature, {
    from: walletPk,
    to: treasury,
    minLamports,
  })
  if (!ok) {
    return NextResponse.json({ error: 'Transfer verification failed' }, { status: 400 })
  }

  const { error: ledgerErr } = await supabase.from('treasury_ledger').insert({
    wallet_address: walletStr,
    amount_lamports: Number(minLamports),
    source,
    tx_signature: signature,
  })
  if (ledgerErr) {
    console.error('[purchases/confirm ledger]', ledgerErr)
    return NextResponse.json({ error: 'Ledger insert failed' }, { status: 500 })
  }

  if (kind === 'unlock_persona' && personaId) {
    const { error: unlockErr } = await supabase.from('persona_unlocks').upsert(
      {
        wallet_address: walletStr,
        persona_id: personaId,
        tx_signature: signature,
      },
      { onConflict: 'wallet_address,persona_id' },
    )
    if (unlockErr) {
      console.error('[purchases/confirm unlock]', unlockErr)
      return NextResponse.json({ error: 'Unlock record failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
