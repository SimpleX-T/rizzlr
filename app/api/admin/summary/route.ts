import { NextResponse } from 'next/server'

import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/admin-session'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function GET() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  const jar = await cookies()
  if (!secret || !verifyAdminSession(secret, jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    sessions7d,
    challengesOpen,
    treasurySum,
    unlocksCount,
    payoutsPending,
  ] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('ended_at', since),
    supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase.from('treasury_ledger').select('amount_lamports'),
    supabase.from('persona_unlocks').select('persona_id', { count: 'exact', head: true }),
    supabase
      .from('daily_pot_payouts')
      .select('lamports', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  let revenueLamports = BigInt(0)
  for (const row of treasurySum.data ?? []) {
    revenueLamports += BigInt((row as { amount_lamports: number }).amount_lamports)
  }

  return NextResponse.json({
    sessionsLast7Days: sessions7d.count ?? 0,
    openChallenges: challengesOpen.count ?? 0,
    treasuryRows: treasurySum.data?.length ?? 0,
    revenueLamports: Number(revenueLamports),
    premiumUnlocks: unlocksCount.count ?? 0,
    pendingPayoutRows: payoutsPending.count ?? 0,
  })
}
