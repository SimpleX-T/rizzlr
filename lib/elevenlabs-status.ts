export type ElevenLabsSdkStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type RizzConnectionStatus =
  | 'missing-agent'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface ResolveRizzConnectionStatusOptions {
  sdkStatus: ElevenLabsSdkStatus
  hasAgentId: boolean
}

export function resolveRizzConnectionStatus({
  sdkStatus,
  hasAgentId,
}: ResolveRizzConnectionStatusOptions): RizzConnectionStatus {
  if (!hasAgentId) return 'missing-agent'
  if (sdkStatus === 'connected') return 'connected'
  if (sdkStatus === 'connecting') return 'connecting'
  if (sdkStatus === 'error') return 'error'
  return 'disconnected'
}

export function getRizzConnectionLabel(status: RizzConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'ElevenLabs connected'
    case 'connecting':
      return 'ElevenLabs connecting'
    case 'missing-agent':
      return 'Missing agent id'
    case 'error':
      return 'ElevenLabs error'
    case 'disconnected':
    default:
      return 'ElevenLabs disconnected'
  }
}

export function isElevenLabsLive(status: RizzConnectionStatus): boolean {
  return status === 'connected' || status === 'connecting'
}
