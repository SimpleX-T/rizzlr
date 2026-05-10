import { LAMPORTS_PER_SOL } from '@solana/web3.js'

/** Legacy cap for challenges / copy where a max round length is referenced. */
export const ROUND_SECONDS = 120

/** Free tier: seconds of *user* time (timer pauses while the agent speaks). */
export const DEFAULT_USER_BUDGET_SECONDS = 60

/** Paid tier: extended user budget (same pause rules). */
export const EXTENDED_USER_BUDGET_SECONDS = 120

/** Lamports charged for one extended-time purchase (env override). */
export function getTimeExtensionLamports(): number {
  const raw = process.env.NEXT_PUBLIC_TIME_EXTENSION_LAMPORTS?.trim()
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) return Math.floor(n)
  }
  return Math.floor(0.01 * LAMPORTS_PER_SOL)
}

/** Human-readable SOL for UI (derived from lamports default). */
export function getTimeExtensionSolDisplay(): string {
  const lamports = getTimeExtensionLamports()
  return (lamports / LAMPORTS_PER_SOL).toFixed(
    lamports % LAMPORTS_PER_SOL === 0 ? 2 : 4,
  )
}
