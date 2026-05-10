import type { Message } from '@/lib/game-store'

/** Fallback score when ConvAI client tools are unavailable or never fire. */
export function estimateRizzScoreFromTranscript(messages: Message[]): number {
  const userMsgs = messages.filter((m) => m.role === 'user')
  if (userMsgs.length === 0) return 38

  let score = 48
  for (const m of userMsgs) {
    const t = m.content.toLowerCase()
    if (t.includes('?')) score += 4
    if (m.content.length > 45) score += 3
    if (/^(hey|hi|yo|sup)\b/.test(t) && m.content.length < 18) score -= 6
    if (t.includes('lol') || t.includes('haha')) score += 2
  }

  return Math.max(8, Math.min(92, Math.round(score)))
}
