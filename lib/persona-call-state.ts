import type { GamePhase } from '@/lib/game-store'
import type { ElevenLabsSdkStatus } from '@/lib/elevenlabs-status'

export type PersonaCardCallState = 'idle' | 'connecting' | 'connected' | 'ended'

export type DeriveCardCallStateInput = {
  personaId: string
  currentPersonaId: string | null
  phase: GamePhase
  voiceStatus: ElevenLabsSdkStatus
  /** When set and `Date.now() < endedUntilMs`, selected row shows ended. */
  endedPersonaId: string | null
  endedUntilMs: number | null
  nowMs: number
}

/**
 * Call-state badge for persona rows in the lobby list.
 * `ended` can show briefly on a row even after selection clears (e.g. cancel from ringing).
 */
export function deriveCardCallState({
  personaId,
  currentPersonaId,
  phase,
  voiceStatus,
  endedPersonaId,
  endedUntilMs,
  nowMs,
}: DeriveCardCallStateInput): PersonaCardCallState {
  if (
    endedPersonaId === personaId &&
    endedUntilMs !== null &&
    nowMs < endedUntilMs
  ) {
    return 'ended'
  }
  if (!currentPersonaId || personaId !== currentPersonaId) return 'idle'
  if (phase === 'incoming') {
    if (voiceStatus === 'connected') return 'connected'
    if (voiceStatus === 'error') return 'idle'
    return 'connecting'
  }
  if (phase === 'active') {
    if (voiceStatus === 'connected') return 'connected'
    if (voiceStatus === 'connecting') return 'connecting'
    return 'idle'
  }
  return 'idle'
}
