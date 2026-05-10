import type { Persona } from '@/lib/game-store'
import type { CSSProperties } from 'react'

/**
 * Replay overlay background — accent glow follows difficulty; premium gets extra chain wash.
 */
export function getReplayShellStyle(
  persona: Pick<Persona, 'difficulty' | 'isPremium'>,
): CSSProperties {
  const tint =
    persona.difficulty === 'easy'
      ? 'var(--chain)'
      : persona.difficulty === 'hard'
        ? 'var(--danger)'
        : 'var(--accent)'
  const secondary = persona.isPremium
    ? 'color-mix(in oklch, var(--chain) 20%, transparent)'
    : 'color-mix(in oklch, var(--accent) 12%, transparent)'

  return {
    background: [
      `radial-gradient(ellipse 90% 55% at 100% -15%, color-mix(in oklch, ${tint} 32%, transparent), transparent 52%)`,
      `radial-gradient(ellipse 70% 45% at 0% 105%, ${secondary}, transparent 50%)`,
      `linear-gradient(180deg, color-mix(in oklch, var(--surface) 40%, var(--bg)) 0%, var(--bg) 38%)`,
    ].join(', '),
  }
}

export function getReplayTintCss(persona: Pick<Persona, 'difficulty'>): string {
  if (persona.difficulty === 'easy') return 'var(--chain)'
  if (persona.difficulty === 'hard') return 'var(--danger)'
  return 'var(--accent)'
}
