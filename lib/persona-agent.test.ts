import { describe, expect, it, vi } from 'vitest'

import {
  resolveEpilogueVoiceId,
  resolvePersonaAgentId,
  resolvePersonaLiveVoiceId,
} from './persona-agent'

describe('resolvePersonaAgentId', () => {
  it('prefers persona elevenLabsAgentId over env', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_ID', 'agent_from_env')
    expect(
      resolvePersonaAgentId({ elevenLabsAgentId: 'agent_from_persona' })
    ).toBe('agent_from_persona')
    vi.unstubAllEnvs()
  })

  it('falls back to NEXT_PUBLIC_ELEVENLABS_AGENT_ID', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_ID', 'agent_fallback')
    expect(resolvePersonaAgentId({ id: 'zara' })).toBe('agent_fallback')
    vi.unstubAllEnvs()
  })

  it('uses NEXT_PUBLIC_ELEVENLABS_AGENT_<ID> when set', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_ID', 'agent_zara_default')
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_COLE', 'agent_cole_only')
    expect(resolvePersonaAgentId({ id: 'cole' })).toBe('agent_cole_only')
    expect(resolvePersonaAgentId({ id: 'zara' })).toBe('agent_zara_default')
    vi.unstubAllEnvs()
  })
})

describe('resolvePersonaLiveVoiceId', () => {
  it('prefers persona voiceId', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_VOICE_JADE', 'voice_from_env')
    expect(
      resolvePersonaLiveVoiceId({
        id: 'jade',
        voiceId: '  voice_inline  ',
      }),
    ).toBe('voice_inline')
    vi.unstubAllEnvs()
  })

  it('uses NEXT_PUBLIC_ELEVENLABS_VOICE_<ID>', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_VOICE_MARCUS', 'voice_marcus')
    expect(resolvePersonaLiveVoiceId({ id: 'marcus', voiceId: '' })).toBe(
      'voice_marcus',
    )
    vi.unstubAllEnvs()
  })

  it('falls back to NEXT_PUBLIC_ELEVENLABS_VOICE_ID', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_VOICE_ID', 'voice_global')
    expect(resolvePersonaLiveVoiceId({ id: 'zara', voiceId: '' })).toBe(
      'voice_global',
    )
    vi.unstubAllEnvs()
  })
})

describe('resolveEpilogueVoiceId', () => {
  it('matches live voice then epilogue-only env', () => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_VOICE_COLE', 'voice_cole')
    vi.stubEnv('NEXT_PUBLIC_EPILOGUE_VOICE_ID', 'voice_epilogue')
    expect(resolveEpilogueVoiceId({ id: 'cole', voiceId: '' })).toBe(
      'voice_cole',
    )
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_EPILOGUE_VOICE_ID', 'voice_epilogue_only')
    expect(resolveEpilogueVoiceId({ id: 'zara', voiceId: '' })).toBe(
      'voice_epilogue_only',
    )
    vi.unstubAllEnvs()
  })
})
