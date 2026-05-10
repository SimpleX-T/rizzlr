import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Lobby } from '@/components/lobby'

describe('Lobby', () => {
  it('renders footer call CTA when a persona is selected', () => {
    render(
      <Lobby
        gamePhase="lobby"
        voiceStatus="disconnected"
        lobbyNowMs={Date.now()}
        cardEndedPersonaId={null}
        cardEndedUntilMs={null}
        onConnectWallet={() => {}}
        isWalletConnected={false}
        profile={null}
        onOpenHistory={() => {}}
        onShowHallOfShame={() => {}}
      />
    )
    expect(screen.getByText('rizzlr')).toBeInTheDocument()
    expect(screen.getByText(/select target first/i)).toBeInTheDocument()
  })
})
