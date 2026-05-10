/** Leaderboard composite: score-first blend with time efficiency (plan defaults). */

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function rankCompositeScore(
  score: number,
  userBudgetSeconds: number,
  userSecondsUsed: number,
): number {
  const s = clamp01(score / 100)
  const used = Math.max(1, userSecondsUsed)
  const efficiency = s * clamp01(userBudgetSeconds / used)
  return 0.72 * score + 0.28 * (100 * efficiency)
}

/** Decaying weights for ranks 1..k (plan: 10,9,...,1). */
export function rankWeights(k: number): number[] {
  const n = Math.min(10, Math.max(1, k))
  const w: number[] = []
  for (let r = 1; r <= n; r++) w.push(Math.max(1, 11 - r))
  return w
}

export function splitPotLamports(
  totalLamports: bigint,
  ranks: number,
): bigint[] {
  const weights = rankWeights(ranks)
  const sumW = weights.reduce((a, b) => a + b, 0)
  const out: bigint[] = []
  let remaining = totalLamports
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      out.push(remaining)
      break
    }
    const part = (totalLamports * BigInt(weights[i]!)) / BigInt(sumW)
    out.push(part)
    remaining -= part
  }
  return out
}
