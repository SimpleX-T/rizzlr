'use client'

import { ConversationProvider } from '@elevenlabs/react'
import { resolveConvaiConnectionType } from '@/lib/elevenlabs-convai-session'
import { ReactNode } from 'react'

interface ElevenLabsProviderProps {
  children: ReactNode
}

export function ElevenLabsProvider({ children }: ElevenLabsProviderProps) {
  const connectionType = resolveConvaiConnectionType(
    process.env.NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE
  )
  return (
    <ConversationProvider connectionType={connectionType}>
      {children}
    </ConversationProvider>
  )
}
