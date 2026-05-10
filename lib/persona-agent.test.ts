import { describe, expect, it, vi } from 'vitest'

import { resolvePersonaAgentId } from './persona-agent'

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
    expect(resolvePersonaAgentId({})).toBe('agent_fallback')
    vi.unstubAllEnvs()
  })
})
