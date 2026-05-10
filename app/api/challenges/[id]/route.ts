import { NextRequest, NextResponse } from 'next/server'

import { ALL_PERSONAS } from '@/lib/game-store'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[challenges GET]', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const personaMeta = ALL_PERSONAS.find((p) => p.id === row.persona_id)
  const expired = new Date(row.expires_at).getTime() < Date.now()

  return NextResponse.json({
    id: row.id,
    creatorWallet: row.creator_wallet,
    challengerWallet: row.challenger_wallet,
    personaId: row.persona_id,
    personaName: personaMeta?.name ?? row.persona_id,
    personaAvatar: personaMeta?.avatar,
    sessionSeed: row.session_seed,
    timeLimitSeconds: row.time_limit_seconds,
    creatorScore: row.creator_score,
    challengerScore: row.challenger_score,
    wagerType: row.wager_type,
    wagerLamports: row.wager_lamports,
    escrowState: row.escrow_state,
    status: expired && row.status === 'open' ? 'expired' : row.status,
    expiresAt: row.expires_at,
    winnerWallet: row.winner_wallet,
    createdAt: row.created_at,
  })
}
