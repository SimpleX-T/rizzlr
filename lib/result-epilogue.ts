import type { Persona } from '@/lib/game-store'

/** Post-game TTS line: creative closer + spoken score for the player. */
export function buildResultEpilogue(
  persona: Persona,
  won: boolean,
  scorePercent: number,
): string {
  const n = persona.name
  const score = Math.max(0, Math.min(100, Math.round(scorePercent)))
  const scoreBit = `Your rizz score: ${score} out of 100.`

  if (won) {
    const creative =
      [
        `Alright — you earned that W with ${n}.`,
        `Okay. You actually showed up. Rare.`,
        `Fine. I'm impressed. That's annoying.`,
      ][Math.floor(Math.random() * 3)]
    return `${creative} ${scoreBit}`
  }

  const creative =
    [
      `Yeah… that wasn't it. Love the confidence though. Sort of.`,
      `I'm gonna pretend this call never happened. You should too.`,
      `That was rough. Go drink water, reflect, and come back with receipts.`,
    ][Math.floor(Math.random() * 3)]
  return `${creative} ${scoreBit}`
}
