import { cookies } from 'next/headers'
import bs58 from 'bs58'
import { NextRequest, NextResponse } from 'next/server'
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'

import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

function rpc(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  )
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  const jar = await cookies()
  if (!secret || !verifyAdminSession(secret, jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payerSecret = process.env.DAILY_PAYOUT_WALLET_SECRET?.trim()
  if (!payerSecret) {
    return NextResponse.json(
      { error: 'DAILY_PAYOUT_WALLET_SECRET not set' },
      { status: 503 },
    )
  }

  let body: { potDate?: string }
  try {
    body = (await request.json()) as { potDate?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const potDate = body.potDate?.trim()
  if (!potDate || !/^\d{4}-\d{2}-\d{2}$/.test(potDate)) {
    return NextResponse.json({ error: 'potDate YYYY-MM-DD required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let kp: Keypair
  try {
    if (payerSecret.startsWith('[')) {
      kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(payerSecret) as number[]))
    } else {
      kp = Keypair.fromSecretKey(bs58.decode(payerSecret))
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payout key' }, { status: 500 })
  }

  const supabase = getSupabaseAdmin()
  const { data: rows, error } = await supabase
    .from('daily_pot_payouts')
    .select('id, wallet_address, lamports')
    .eq('pot_date', potDate)
    .eq('status', 'pending')
    .gt('lamports', 0)

  if (error) {
    console.error('[admin payouts]', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const connection = new Connection(rpc(), 'confirmed')
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')

  const signatures: string[] = []
  for (const row of rows ?? []) {
    const to = new PublicKey(row.wallet_address as string)
    const lamports = Number(row.lamports)
    if (!Number.isFinite(lamports) || lamports < 1) continue
    const tx = new Transaction({
      feePayer: kp.publicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: to,
        lamports,
      }),
    )
    tx.sign(kp)
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    signatures.push(sig)
    await supabase
      .from('daily_pot_payouts')
      .update({ status: 'sent', tx_signature: sig })
      .eq('id', row.id as string)
  }

  return NextResponse.json({
    ok: true,
    sent: signatures.length,
    signatures,
  })
}
