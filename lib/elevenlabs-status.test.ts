import { describe, expect, it } from 'vitest'

import {
  getRizzConnectionLabel,
  isElevenLabsLive,
  resolveRizzConnectionStatus,
} from './elevenlabs-status'

describe('resolveRizzConnectionStatus', () => {
  it('reports missing-agent before any SDK state', () => {
    expect(
      resolveRizzConnectionStatus({
        sdkStatus: 'connected',
        hasAgentId: false,
      })
    ).toBe('missing-agent')
  })

  it('passes through live ElevenLabs states', () => {
    expect(
      resolveRizzConnectionStatus({
        sdkStatus: 'connecting',
        hasAgentId: true,
      })
    ).toBe('connecting')

    expect(
      resolveRizzConnectionStatus({
        sdkStatus: 'connected',
        hasAgentId: true,
      })
    ).toBe('connected')
  })

  it('reports errors and disconnected state', () => {
    expect(
      resolveRizzConnectionStatus({
        sdkStatus: 'error',
        hasAgentId: true,
      })
    ).toBe('error')

    expect(
      resolveRizzConnectionStatus({
        sdkStatus: 'disconnected',
        hasAgentId: true,
      })
    ).toBe('disconnected')
  })
})

describe('connection status helpers', () => {
  it('labels statuses for the UI', () => {
    expect(getRizzConnectionLabel('connected')).toBe('ElevenLabs connected')
    expect(getRizzConnectionLabel('disconnected')).toBe('ElevenLabs disconnected')
  })

  it('only treats connecting/connected as live ElevenLabs', () => {
    expect(isElevenLabsLive('connecting')).toBe(true)
    expect(isElevenLabsLive('connected')).toBe(true)
    expect(isElevenLabsLive('disconnected')).toBe(false)
  })
})
