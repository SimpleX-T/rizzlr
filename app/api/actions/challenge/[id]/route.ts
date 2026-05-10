import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'

import { ALL_PERSONAS } from '@/lib/game-store'
import {
  buildUnsignedVersionedTx,
  depositChallengerIx,
  memoAcceptChallengeIx,
} from '@/lib/escrow/instructions'
import { getEscrowProgramId, isEscrowConfigured } from '@/lib/escrow/config'
import { ACTIONS_CORS_HEADERS } from '@/lib/solana-actions-cors'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

function rpcConnection(): Connection {
  const url =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  return new Connection(url, 'confirmed')
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json(
      { error: 'Missing id' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[actions/challenge GET]', error)
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (!row) {
    return NextResponse.json(
      { error: 'Challenge not found' },
      { status: 404, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const persona = ALL_PERSONAS.find((p) => p.id === row.persona_id)
  const origin = request.nextUrl.origin
  const title = `Beat ${row.creator_score}% rizz`
  const description = `${persona?.name ?? row.persona_id} · ${row.time_limit_seconds}s rounds · rizzlr PvP`

  const payload = {
    icon: `${origin}/rizzler-icon.png`,
    title,
    description,
    label: 'Accept challenge',
    links: {
      actions: [
        {
          label:
            row.wager_type === 'sol_escrow'
              ? `Escrow (${Number(row.wager_lamports) / 1e9} SOL side)`
              : 'Accept (free)',
          href: `${origin}/api/actions/challenge/${id}`,
        },
      ],
    },
  }

  return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS })
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json(
      { error: 'Missing id' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  let body: { account?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const accountStr = typeof body.account === 'string' ? body.account.trim() : ''
  if (!accountStr) {
    return NextResponse.json(
      { error: 'Missing account' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  let challenger: PublicKey
  try {
    challenger = new PublicKey(accountStr)
  } catch {
    return NextResponse.json(
      { error: 'Invalid account' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error: fetchErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !row) {
    return NextResponse.json(
      { error: 'Challenge not found' },
      { status: 404, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase
      .from('challenges')
      .update({ status: 'expired' })
      .eq('id', id)
    return NextResponse.json(
      { error: 'Challenge expired' },
      { status: 410, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (row.creator_wallet === challenger.toBase58()) {
    return NextResponse.json(
      { error: 'Creator cannot accept own challenge' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (row.status !== 'open') {
    return NextResponse.json(
      { error: 'Challenge is no longer open' },
      { status: 409, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (
    row.wager_type === 'sol_escrow' &&
    row.escrow_state !== 'ready_for_challenger'
  ) {
    return NextResponse.json(
      {
        error:
          'Escrow is not ready yet — the creator must confirm their on-chain deposit first.',
      },
      { status: 409, headers: ACTIONS_CORS_HEADERS },
    )
  }

  if (row.wager_type === 'sol_escrow' && !isEscrowConfigured()) {
    return NextResponse.json(
      { error: 'SOL escrow is not configured on this deployment' },
      { status: 503, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const { error: updErr } = await supabase
    .from('challenges')
    .update({
      challenger_wallet: challenger.toBase58(),
      status: 'accepted',
    })
    .eq('id', id)
    .eq('status', 'open')

  if (updErr) {
    console.error('[actions/challenge POST] update', updErr)
    return NextResponse.json(
      { error: 'Could not lock challenge' },
      { status: 500, headers: ACTIONS_CORS_HEADERS },
    )
  }

  const connection = rpcConnection()
  const origin = request.nextUrl.origin
  const nextUrl = `${origin}/?challenge=${id}`

  let vtx
  if (row.wager_type === 'sol_escrow') {
    const programId = getEscrowProgramId()
    const ix = depositChallengerIx({
      challengeIdUuid: id,
      challenger,
      programId,
    })
    vtx = await buildUnsignedVersionedTx({
      connection,
      feePayer: challenger,
      instructions: [ix],
    })
  } else {
    const ix = memoAcceptChallengeIx({ challenger, challengeId: id })
    vtx = await buildUnsignedVersionedTx({
      connection,
      feePayer: challenger,
      instructions: [ix],
    })
  }

  const transaction = Buffer.from(vtx.serialize()).toString('base64')

  return NextResponse.json(
    {
      type: 'transaction',
      transaction,
      message:
        row.wager_type === 'sol_escrow'
          ? 'Deposit wager into escrow — then open rizzlr to play.'
          : 'Sign memo to accept — then open rizzlr to play.',
      links: {
        next: {
          type: 'inline',
          action: {
            type: 'external-link',
            label: 'Play in rizzlr',
            href: nextUrl,
          },
        },
      },
    },
    { headers: ACTIONS_CORS_HEADERS },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: ACTIONS_CORS_HEADERS })
}
