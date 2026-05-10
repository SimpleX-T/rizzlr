'use client'

import { ReactNode } from 'react'
import { ElevenLabsProvider } from './elevenlabs-provider'
import { SolanaProvider } from './solana-provider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // ConversationProvider must stay mounted for the whole app — never wrap it in
  // conditional UI (e.g. {started && <ConversationProvider>}) or the SDK session will reset.
  return (
    <ElevenLabsProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </ElevenLabsProvider>
  )
}
