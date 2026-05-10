import type { SupabaseClient } from '@supabase/supabase-js'

import { rankCompositeScore, rankWeights, splitPotLamports } from '@/lib/leaderboard-scoring'

export function utcDayIsoRange(potDate: string): { start: string; end: string } {
  const start = `${potDate}T00:00:00.000Z`
  const d = new Date(start)
  d.setUTCDate(d.getUTCDate() + 1)
  return { start, end: d.toISOString() }
}

export async function sumTreasuryPotLamports(
  supabase: SupabaseClient,
  potDate: string,
): Promise<bigint> {
  const { start, end } = utcDayIsoRange(potDate)
  const { data, error } = await supabase
    .from('treasury_ledger')
    .select('amount_lamports, created_at')
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw error
  let sum = BigInt(0)
  for (const row of data ?? []) {
    sum += BigInt(row.amount_lamports as number)
  }
  return sum
}

type RowAgg = {
  wallet: string
  bestScore: number
  composite: number
  budget: number
  used: number
  endedAt: string
}

export async function computeTopWinnersForUtcDay(
  supabase: SupabaseClient,
  potDate: string,
  limit = 10,
): Promise<RowAgg[]> {
  const { start, end } = utcDayIsoRange(potDate)
  const { data: sessions, error } = await supabase
    .from('game_sessions')
    .select(
      'user_id, score, user_budget_seconds, user_seconds_used, ended_at',
    )
    .eq('won', true)
    .gte('ended_at', start)
    .lt('ended_at', end)

  if (error) throw error
  if (!sessions?.length) return []

  const userIds = [...new Set(sessions.map((s) => s.user_id as string))]
  const { data: users, error: uerr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .in('id', userIds)
  if (uerr) throw uerr
  const walletByUser = new Map(
    (users ?? []).map((u) => [u.id as string, u.wallet_address as string]),
  )

  const byWallet = new Map<string, RowAgg>()

  for (const row of sessions) {
    const wallet = walletByUser.get(row.user_id as string)
    if (!wallet) continue
    const score = Number(row.score)
    const budget = Math.max(1, Number(row.user_budget_seconds) || 60)
    const usedRaw = row.user_seconds_used
    const used =
      typeof usedRaw === 'number' && usedRaw >= 0
        ? Math.max(1, usedRaw)
        : budget
    const comp = rankCompositeScore(score, budget, used)
    const endedAt = String(row.ended_at)
    const prev = byWallet.get(wallet)
    if (!prev || comp > prev.composite) {
      byWallet.set(wallet, {
        wallet,
        bestScore: score,
        composite: comp,
        budget,
        used,
        endedAt,
      })
    } else if (comp === prev.composite) {
      if (
        score > prev.bestScore ||
        (score === prev.bestScore && used < prev.used) ||
        (score === prev.bestScore &&
          used === prev.used &&
          endedAt < prev.endedAt)
      ) {
        byWallet.set(wallet, {
          wallet,
          bestScore: score,
          composite: comp,
          budget,
          used,
          endedAt,
        })
      }
    }
  }

  return [...byWallet.values()]
    .sort((a, b) => {
      if (b.composite !== a.composite) return b.composite - a.composite
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
      if (a.used !== b.used) return a.used - b.used
      return a.endedAt.localeCompare(b.endedAt)
    })
    .slice(0, limit)
}

export async function runDailyPotCloseForUtcDate(
  supabase: SupabaseClient,
  potDate: string,
): Promise<{ ok: boolean; message?: string }> {
  const potLamports = await sumTreasuryPotLamports(supabase, potDate)
  const winners = await computeTopWinnersForUtcDay(supabase, potDate, 10)

  await supabase.from('daily_pot_snapshots').upsert(
    {
      pot_date: potDate,
      total_lamports: Number(potLamports),
      finalized: false,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'pot_date' },
  )

  await supabase.from('daily_leaderboard_snapshots').delete().eq('pot_date', potDate)
  await supabase.from('daily_pot_payouts').delete().eq('pot_date', potDate)

  const k = winners.length
  if (k === 0 || potLamports <= BigInt(0)) {
    return { ok: true, message: 'no winners or empty pot' }
  }

  const shares = splitPotLamports(potLamports, k)
  const weights = rankWeights(k)
  const sumW = weights.reduce((a, b) => a + b, 0)

  const lbRows = winners.map((w, i) => ({
    pot_date: potDate,
    wallet_address: w.wallet,
    rank: i + 1,
    composite_score: w.composite,
    share_bps: Math.round((10000 * weights[i]!) / sumW),
    payout_lamports: Number(shares[i] ?? BigInt(0)),
  }))

  const { error: lbErr } = await supabase
    .from('daily_leaderboard_snapshots')
    .insert(lbRows)
  if (lbErr) throw lbErr

  const payRows = winners.map((w, i) => ({
    pot_date: potDate,
    wallet_address: w.wallet,
    lamports: Number(shares[i] ?? BigInt(0)),
    status: 'pending' as const,
  }))

  const { error: payErr } = await supabase.from('daily_pot_payouts').insert(payRows)
  if (payErr) throw payErr

  return { ok: true }
}
