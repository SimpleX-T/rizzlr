import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import type { Message } from '@/lib/game-store'
import { verifySessionSaveRequest, verifySessionsListRequest } from '@/lib/server-wallet-request'
import { stableStringify } from '@/lib/stable-json'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

type SessionSaveBody = {
  wallet: string
  timestamp?: number
  signature?: string
  personaId: string
  won: boolean
  score: number
  exitLine?: string | null
  messages: Message[]
  startedAt: number
  endedAt: number
  userBudgetSeconds?: number
  userSecondsUsed?: number | null
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const queryWallet = request.nextUrl.searchParams.get('wallet')
  const verified = verifySessionsListRequest(request, queryWallet)
  if (verified instanceof Response) return verified

  const supabase = getSupabaseAdmin()
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', verified.wallet)
    .maybeSingle()

  if (userErr || !user) {
    return NextResponse.json({ sessions: [] })
  }

  const { data: rows, error } = await supabase
    .from('game_sessions')
    .select(
      'id, persona_id, won, score, exit_line, messages_json, started_at, ended_at, user_budget_seconds, user_seconds_used',
    )
    .eq('user_id', user.id)
    .order('ended_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[sessions GET]', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  return NextResponse.json({
    sessions: (rows ?? []).map((r) => ({
      id: r.id,
      personaId: r.persona_id,
      won: r.won,
      score: r.score,
      exitLine: r.exit_line,
      messages: r.messages_json,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      userBudgetSeconds: r.user_budget_seconds ?? undefined,
      userSecondsUsed: r.user_seconds_used ?? undefined,
    })),
  })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const rawBody = await request.text()

  let parsed: SessionSaveBody
  try {
    parsed = JSON.parse(rawBody) as SessionSaveBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const innerPart = {
    wallet: parsed.wallet,
    timestamp: parsed.timestamp,
    personaId: parsed.personaId,
    won: parsed.won,
    score: parsed.score,
    exitLine: parsed.exitLine ?? null,
    messages: parsed.messages,
    startedAt: parsed.startedAt,
    endedAt: parsed.endedAt,
    userBudgetSeconds: parsed.userBudgetSeconds,
    userSecondsUsed: parsed.userSecondsUsed ?? null,
  }

  const bodySha256Hex = createHash('sha256')
    .update(stableStringify(innerPart))
    .digest('hex')

  const verified = verifySessionSaveRequest(
    bodySha256Hex,
    parsed.wallet,
    parsed.signature,
    parsed.timestamp,
    request,
  )
  if (verified instanceof Response) return verified

  const {
    personaId,
    won,
    score,
    exitLine,
    messages,
    startedAt,
    endedAt,
  } = parsed

  if (!personaId || typeof won !== 'boolean' || typeof score !== 'number') {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages must be an array' }, { status: 400 })
  }
  if (typeof startedAt !== 'number' || typeof endedAt !== 'number') {
    return NextResponse.json({ error: 'Invalid timestamps' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', verified.wallet)
    .maybeSingle()

  if (userErr || !user) {
    return NextResponse.json(
      { error: 'Create a profile before saving sessions' },
      { status: 400 },
    )
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('game_sessions')
    .insert({
      user_id: user.id,
      persona_id: personaId,
      won,
      score: Math.round(score),
      exit_line: exitLine ?? null,
      messages_json: messages,
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      user_budget_seconds:
        typeof parsed.userBudgetSeconds === 'number'
          ? Math.round(parsed.userBudgetSeconds)
          : null,
      user_seconds_used:
        typeof parsed.userSecondsUsed === 'number'
          ? Math.round(parsed.userSecondsUsed)
          : null,
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[sessions POST]', insertErr)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  if (!won && exitLine && exitLine.trim()) {
    const { error: roastErr } = await supabase.from('roast_entries').insert({
      source_session_id: inserted.id,
      user_id: user.id,
      persona_id: personaId,
      exit_line: exitLine.trim(),
    })
    if (roastErr && roastErr.code !== '23505') {
      console.warn('[sessions POST roast]', roastErr)
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id })
}
