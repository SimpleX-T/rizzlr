'use client'

/**
 * Minimal working example from ElevenLabs React SDK docs.
 * Root layout wraps the app with <ConversationProvider /> via ElevenLabsProvider.
 * Uses WebSocket transport by default (see getPublicAgentSessionOptions + provider connectionType).
 */
import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react'
import { useState } from 'react'

import {
  ensureMicrophonePermission,
  getPublicAgentSessionOptions,
} from '@/lib/elevenlabs-convai-session'

export function ElevenLabsMinimalVoiceExample() {
  return <Agent />
}

function Agent() {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const [hint, setHint] = useState<string | null>(null)

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  const handleStart = async () => {
    setHint(null)
    if (!agentId) {
      setHint('Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID')
      return
    }
    try {
      await ensureMicrophonePermission()
    } catch {
      setHint('Microphone permission denied')
      return
    }
    startSession(getPublicAgentSessionOptions(agentId))
  }

  if (status === 'connected') {
    return (
      <button type="button" onClick={endSession}>
        End
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <button type="button" onClick={() => void handleStart()}>
        Start
      </button>
      {hint ? (
        <span className="text-xs text-red-400 max-w-56 text-right">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
