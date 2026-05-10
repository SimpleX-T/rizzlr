import { describe, expect, it } from 'vitest'

import { deriveCardCallState } from './persona-call-state'

describe('deriveCardCallState', () => {
  const base = {
    personaId: 'zara',
    currentPersonaId: 'zara' as string | null,
    endedPersonaId: null as string | null,
    endedUntilMs: null as number | null,
    nowMs: 1_000_000,
  }

  it('returns idle when persona is not selected', () => {
    expect(
      deriveCardCallState({
        ...base,
        currentPersonaId: 'cole',
        phase: 'lobby',
        voiceStatus: 'disconnected',
      })
    ).toBe('idle')
  })

  it('returns connecting during incoming phase while voice connects', () => {
    expect(
      deriveCardCallState({
        ...base,
        phase: 'incoming',
        voiceStatus: 'connecting',
      })
    ).toBe('connecting')
  })

  it('returns connected during active phase with live voice', () => {
    expect(
      deriveCardCallState({
        ...base,
        phase: 'active',
        voiceStatus: 'connected',
      })
    ).toBe('connected')
  })

  it('returns ended when flash window is active', () => {
    expect(
      deriveCardCallState({
        ...base,
        currentPersonaId: null,
        phase: 'lobby',
        voiceStatus: 'disconnected',
        endedPersonaId: 'zara',
        endedUntilMs: 2_000_000,
        nowMs: 1_500_000,
      })
    ).toBe('ended')
  })
})
