import type { Persona } from '@/lib/game-store'

import { PERSONA_EPILOGUE_POOLS } from '@/lib/persona-epilogue-lines'

const DEFAULT_WIN_LINES = [
  `Alright — you earned that W.`,
  `Okay. You actually showed up. Rare.`,
  `Fine. I'm impressed. That's annoying.`,
]

const DEFAULT_LOSE_LINES = [
  `Yeah… that wasn't it. Love the confidence though. Sort of.`,
  `I'm gonna pretend this call never happened. You should too.`,
  `That was rough. Go drink water, reflect, and come back with receipts.`,
]

/** Post-game recap line: persona-colored closer + spoken score (TTS + UI must share one build). */
export function buildResultEpilogue(
  persona: Persona,
  won: boolean,
  scorePercent: number,
): string {
  const score = Math.max(0, Math.min(100, Math.round(scorePercent)))
  const scoreBit = `Your rizz score: ${score} out of 100.`

  const pools = PERSONA_EPILOGUE_POOLS[persona.id]
  const pool = won
    ? pools?.win?.length
      ? pools.win
      : DEFAULT_WIN_LINES
    : pools?.lose?.length
      ? pools.lose
      : DEFAULT_LOSE_LINES

  const creative = pool[Math.floor(Math.random() * pool.length)]
  return `${creative} ${scoreBit}`
}
