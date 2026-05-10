import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConversationStatus } from '@elevenlabs/react'
import { GameContainer } from '@/components/game-container'
import { ElevenLabsProvider } from '@/components/providers/elevenlabs-provider'
import { FREE_PERSONAS, useGameStore } from '@/lib/game-store'

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: null,
    signMessage: undefined,
    signTransaction: undefined,
    disconnect: vi.fn(),
    connected: false,
  }),
  useConnection: () => ({
    connection: {},
  }),
}))

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  useWalletModal: () => ({ setVisible: vi.fn() }),
}))

/** Mutable ConvAI mock so tests can flip `voiceStatus` and re-render. */
const convai = vi.hoisted(() => ({
  voiceStatus: 'disconnected' as ConversationStatus,
  lastStartOpts: null as Record<string, unknown> | null,
  endVoiceSession: vi.fn(),
  sendUserMessage: vi.fn(),
  setMuted: vi.fn(),
}))

vi.mock('@elevenlabs/react', () => ({
  ConversationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useConversationControls: () => ({
    startSession: (opts: Record<string, unknown>) => {
      convai.lastStartOpts = opts
      const onConnect = opts.onConnect as
        | ((p: { conversationId: string }) => void)
        | undefined
      convai.voiceStatus = 'connecting'
      queueMicrotask(() => {
        convai.voiceStatus = 'connected'
        onConnect?.({ conversationId: 'test-conv' })
      })
    },
    endSession: (...args: unknown[]) => convai.endVoiceSession(...args),
    sendUserMessage: (text: string) => convai.sendUserMessage(text),
  }),
  useConversationStatus: () => ({
    get status() {
      return convai.voiceStatus
    },
    message: undefined,
  }),
  useConversationInput: () => ({
    isMuted: false,
    setMuted: convai.setMuted,
  }),
  useConversationMode: () => ({
    mode: 'listening' as const,
    isSpeaking: false,
    isListening: true,
  }),
}))

function callButton(name: RegExp) {
  const buttons = screen.getAllByRole('button', { name })
  return buttons[buttons.length - 1]!
}

async function waitForLobbyReady() {
  await waitFor(() => {
    expect(
      screen
        .getAllByRole('heading', { level: 1 })
        .some((el) => el.textContent === 'rizzlr')
    ).toBe(true)
  })
}

function renderGame() {
  return render(
    <ElevenLabsProvider>
      <GameContainer />
    </ElevenLabsProvider>
  )
}

describe('GameContainer ConvAI wiring', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_ID', 'agent_env_fallback')
    useGameStore.getState().resetGame()
    convai.voiceStatus = 'disconnected'
    convai.lastStartOpts = null
    convai.endVoiceSession.mockClear()
    convai.sendUserMessage.mockClear()
    convai.setMuted.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    cleanup()
  })

  it('footer CALL passes agentId and connectionType websocket to startSession', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => {
      expect(convai.lastStartOpts).not.toBeNull()
    })
    expect(convai.lastStartOpts).toEqual(
      expect.objectContaining({
        agentId: 'agent_env_fallback',
        connectionType: 'websocket',
      })
    )
    await act(async () => {
      await Promise.resolve()
    })
  })

  it('uses persona elevenLabsAgentId when set', async () => {
    renderGame()
    await waitForLobbyReady()
    const persona = {
      ...FREE_PERSONAS[1],
      elevenLabsAgentId: 'agent_cole_dedicated',
    }
    await act(async () => {
      useGameStore.getState().selectPersona(persona)
    })
    fireEvent.click(callButton(/call cole/i))
    await waitFor(() => {
      expect(convai.lastStartOpts?.agentId).toBe('agent_cole_dedicated')
    })
    expect(convai.lastStartOpts).toEqual(
      expect.objectContaining({ connectionType: 'websocket' })
    )
  })

  it('sendUserMessage is used when sending text while connected', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    const input = screen.getByPlaceholderText(/or type your line/i)
    fireEvent.change(input, { target: { value: 'hey there' } })
    fireEvent.click(callButton(/send message/i))
    await waitFor(() => {
      expect(convai.sendUserMessage).toHaveBeenCalledWith('hey there')
    })
  })

  it('mutes when text field is focused (text mode)', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    const input = screen.getByPlaceholderText(/or type your line/i)
    fireEvent.focus(input)
    expect(convai.setMuted).toHaveBeenCalledWith(true)
  })

  it('mic button in text mode switches to voice and unmutes', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    convai.setMuted.mockClear()
    const input = screen.getByPlaceholderText(/or type your line/i)
    fireEvent.focus(input)
    fireEvent.click(screen.getByRole('button', { name: /switch to voice/i }))
    expect(convai.setMuted).toHaveBeenCalledWith(false)
  })

  it('onMessage user role adds voice transcript to session messages', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    const onMessage = convai.lastStartOpts?.onMessage as
      | ((p: { message: string; role: string }) => void)
      | undefined
    await act(async () => {
      onMessage?.({ message: 'voice line here', role: 'user' })
    })
    const msgs = useGameStore.getState().session?.messages ?? []
    expect(
      msgs.some((m) => m.role === 'user' && m.content === 'voice line here'),
    ).toBe(true)
  })

  it('onMessage agent role updates live caption', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    const onMessage = convai.lastStartOpts?.onMessage as
      | ((p: { message: string; role: string }) => void)
      | undefined
    expect(typeof onMessage).toBe('function')
    await act(async () => {
      onMessage?.({ message: 'Hello from agent', role: 'agent' })
    })
    expect(screen.getByText(/Hello from agent/)).toBeInTheDocument()
  })

  it('hang up triggers voice endSession', async () => {
    renderGame()
    await waitForLobbyReady()
    await act(async () => {
      useGameStore.getState().selectPersona(FREE_PERSONAS[0])
    })
    fireEvent.click(callButton(/call zara/i))
    await waitFor(() => expect(convai.lastStartOpts).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    fireEvent.click(callButton(/hang up/i))
    await waitFor(() => {
      expect(convai.endVoiceSession).toHaveBeenCalled()
    })
  })
})
