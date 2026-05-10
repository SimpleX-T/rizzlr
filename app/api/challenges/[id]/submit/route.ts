import { NextRequest, NextResponse } from 'next/server'

import { isEscrowConfigured } from '@/lib/escrow/config'
import { executeSettleWinner } from '@/lib/escrow/settlement'
import { verifyChallengeSubmitRequest } from '@/lib/server-wallet-request'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const { id: challengeId } = await ctx.params
  if (!challengeId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  let body: {
    wallet?: string
    timestamp?: number
    signature?: string
    challengerScore?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = body.wallet?.trim()
  if (!wallet || body.timestamp === undefined || body.challengerScore === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const verified = verifyChallengeSubmitRequest(challengeId, request, {
    wallet,
    timestamp: body.timestamp,
    signature: body.signature,
    challengerScore: body.challengerScore,
  })
  if (verified instanceof Response) return verified

  const challengerScore = Math.round(body.challengerScore)
  if (challengerScore < 0 || challengerScore > 100) {
    return NextResponse.json(
      { error: 'challengerScore must be 0–100' },
      { status: 400 },
    )
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

  if (new Date(ch.expires_at).getTime() < Date.now()) {
    await supabase
      .from('challenges')
      .update({ status: 'expired' })
      .eq('id', challengeId)
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 })
  }

  if (['settled', 'expired', 'cancelled'].includes(ch.status as string)) {
    return NextResponse.json(
      { error: 'Challenge already finished' },
      { status: 409 },
    )
  }

  if (ch.creator_wallet === verified.wallet) {
    return NextResponse.json(
      { error: 'Creator cannot submit as challenger' },
      { status: 400 },
    )
  }

  if (ch.status === 'accepted') {
    if (ch.challenger_wallet !== verified.wallet) {
      return NextResponse.json(
        { error: 'Wrong wallet for this challenge' },
        { status: 403 },
      )
    }
  } else if (ch.status === 'open') {
    if (ch.wager_type === 'sol_escrow') {
      return NextResponse.json(
        { error: 'Accept the escrow Blink (deposit) before playing' },
        { status: 409 },
      )
    }
  } else {
    return NextResponse.json(
      { error: 'Challenge is not open for submission' },
      { status: 409 },
    )
  }

  const creatorScore = ch.creator_score as number
  let winnerWallet: string
  if (challengerScore > creatorScore) {
    winnerWallet = verified.wallet
  } else {
    winnerWallet = ch.creator_wallet as string
  }

  let settleSignature: string | undefined
  if (ch.wager_type === 'sol_escrow') {
    if (!isEscrowConfigured()) {
      return NextResponse.json(
        { error: 'Escrow authority is not configured on the server' },
        { status: 503 },
      )
    }
    try {
      settleSignature = await executeSettleWinner({
        challengeIdUuid: challengeId,
        winnerWallet,
      })
    } catch (e) {
      console.error('[challenge settle]', e)
      return NextResponse.json(
        { error: 'On-chain settlement failed' },
        { status: 502 },
      )
    }
  }

  const { error: updateErr } = await supabase
    .from('challenges')
    .update({
      challenger_wallet: verified.wallet,
      challenger_score: challengerScore,
      winner_wallet: winnerWallet,
      status: 'settled',
    })
    .eq('id', challengeId)

  if (updateErr) {
    console.error('[challenge submit]', updateErr)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  if (settleSignature) {
    await supabase.from('challenge_transactions').insert({
      challenge_id: challengeId,
      tx_type: 'settle',
      signature: settleSignature,
    })
  }

  const tie = challengerScore === creatorScore
  const shareCard = {
    headline: tie
      ? 'Dead heat — creator keeps the crown'
      : winnerWallet === verified.wallet
        ? 'You beat their score'
        : 'They defended their score',
    creatorScore,
    challengerScore,
    winnerWallet,
    tie,
  }

  return NextResponse.json({
    winner: winnerWallet,
    result: shareCard.headline,
    tie,
    creatorScore,
    challengerScore,
    shareCard,
    settleSignature: settleSignature ?? null,
  })
}
