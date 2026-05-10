'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react'
import {
  ensureMicrophonePermission,
  getPublicAgentSessionOptions,
} from '@/lib/elevenlabs-convai-session'
import { estimateRizzScoreFromTranscript } from '@/lib/heuristic-rizz'
import type { GameSession } from '@/lib/game-store'
import { ALL_PERSONAS, FREE_PERSONAS, useGameStore } from '@/lib/game-store'
import { resolveRizzConnectionStatus } from '@/lib/elevenlabs-status'
import { resolvePersonaAgentId, resolveEpilogueVoiceId } from '@/lib/persona-agent'
import { ProfileOnboardingModal } from '@/components/profile-onboarding-modal'
import { Lobby } from '@/components/lobby'
import { IncomingCall } from '@/components/incoming-call'
import { ActiveCall } from '@/components/active-call'
import { WinScreen, LoseScreen } from '@/components/result-screen'
import { RizzCoach } from '@/components/rizz-coach'
import { RizzReplay } from '@/components/rizz-replay'
import { HallOfShame } from '@/components/hall-of-shame'
import { SessionHistory } from '@/components/session-history'
import { ChallengeShareModal } from '@/components/challenge-share-modal'
import type { ChallengeCreatedResponse, UserProfile } from '@/lib/rizz-api'
import {
  createChallenge,
  fetchEntitlements,
  fetchProfile,
  persistGameSession,
  submitChallengeResult,
} from '@/lib/rizz-api'
import { captureElementAsPng, shareBlobFilename } from '@/lib/share-card-capture'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

const SESSION_CONNECT_TIMEOUT_MS = 10_000
const SESSION_END_WAIT_MS = 5_000
/** Cap wait on win/lose so users are never stuck behind slow TTS. */
const RESULT_RECAP_MAX_WAIT_MS = 14_000
/** When no epilogue voice is configured, reveal UI after a short beat. */
const RESULT_RECAP_NO_VOICE_MS = 900

function waitUntilVoiceNotConnected(
  getStatus: () => string,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const id = window.setInterval(() => {
      const s = getStatus()
      if (s === 'disconnected' || s === 'error') {
        window.clearInterval(id)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(id)
        reject(new Error('[Rizz] Timed out waiting for voice disconnect'))
      }
    }, 50)
  })
}

export function GameContainer() {
  const {
    phase,
    setPhase,
    currentPersona,
    session,
    selectPersona,
    startSession,
    updateRizzScore,
    endSession,
    resetGame,
  } = useGameStore()

  const { publicKey, signMessage, signTransaction, disconnect, connected } =
    useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showProfileOnboarding, setShowProfileOnboarding] = useState(false)
  const [showSessionHistory, setShowSessionHistory] = useState(false)
  const [previewReplaySession, setPreviewReplaySession] =
    useState<GameSession | null>(null)
  const [previewReplayOutcome, setPreviewReplayOutcome] = useState<
    'win' | 'lose' | null
  >(null)
  const persistedEndRef = useRef<number | null>(null)
  const lastPersistedSessionIdRef = useRef<string | null>(null)
  const challengeFromUrlRef = useRef<string | null>(null)
  const challengeBootstrapIdRef = useRef<string | null>(null)

  const [challengeShare, setChallengeShare] = useState<ChallengeCreatedResponse | null>(
    null,
  )
  const [showChallengeShare, setShowChallengeShare] = useState(false)

  const [showCoach, setShowCoach] = useState(false)
  const [showReplay, setShowReplay] = useState(false)
  const [showHallOfShame, setShowHallOfShame] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const previewAppliedRef = useRef(false)

  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [agentLiveCaption, setAgentLiveCaption] = useState('')
  const callStartRef = useRef<number | null>(null)
  const [callDurationSeconds, setCallDurationSeconds] = useState(0)
  const [cardEndedFlash, setCardEndedFlash] = useState<{
    personaId: string
    until: number
  } | null>(null)
  const [lobbyNowMs, setLobbyNowMs] = useState(() => Date.now())

  const incomingConnectAttemptRef = useRef(0)
  /** Accumulates assistant streaming text before flush to `session.messages`. */
  const assistantDraftRef = useRef('')
  const scoreFromAgentRef = useRef(false)
  const endAnyVoiceRef = useRef<() => Promise<void>>(async () => {})
  const finalizeAssistantTurnRef = useRef<() => void>(() => {})
  const [recapReady, setRecapReady] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!publicKey) {
      setProfile(null)
      setShowProfileOnboarding(false)
      return
    }
    let cancelled = false
    void (async () => {
      const p = await fetchProfile(publicKey.toBase58())
      if (cancelled) return
      setProfile(p)
      if (!p) setShowProfileOnboarding(true)
    })()
    return () => {
      cancelled = true
    }
  }, [publicKey])

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false
    void (async () => {
      const ids = await fetchEntitlements(publicKey.toBase58())
      if (cancelled || !ids.length) return
      const { unlockPersona } = useGameStore.getState()
      for (const id of ids) {
        unlockPersona(id)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [publicKey])

  useEffect(() => {
    if (phase !== 'win' && phase !== 'lose') return
    const s = session
    if (!s?.endTime || !publicKey) return
    if (persistedEndRef.current === s.endTime) return
    persistedEndRef.current = s.endTime
    const won = phase === 'win'
    const score =
      typeof s.rizzScore === 'number'
        ? s.rizzScore
        : useGameStore.getState().rizzScore

    const challengeIdFromUrl = challengeFromUrlRef.current

    void (async () => {
      const { ok, sessionId } = await persistGameSession({
        wallet: publicKey!.toBase58(),
        personaId: s.persona.id,
        won,
        score,
        exitLine: s.exitLine,
        messages: s.messages,
        startedAt: s.startTime,
        endedAt: s.endTime!,
        userBudgetSeconds: s.userBudgetSeconds,
        userSecondsUsed: s.userSecondsUsed,
        signMessage: signMessage ?? undefined,
      })
      if (ok && sessionId) lastPersistedSessionIdRef.current = sessionId

      const cid = challengeIdFromUrl
      if (!cid || !publicKey) return

      try {
        const infoRes = await fetch(`/api/challenges/${cid}`)
        if (!infoRes.ok) return
        const info = (await infoRes.json()) as { creatorWallet?: string }
        if (info.creatorWallet === publicKey.toBase58()) {
          challengeFromUrlRef.current = null
          window.history.replaceState({}, '', window.location.pathname)
          return
        }

        await submitChallengeResult({
          challengeId: cid,
          wallet: publicKey.toBase58(),
          challengerScore: score,
          signMessage: signMessage ?? undefined,
        })
      } catch (err) {
        console.warn('[challenge submit]', err)
      } finally {
        challengeFromUrlRef.current = null
        window.history.replaceState({}, '', window.location.pathname)
      }
    })()
  }, [phase, session, publicKey, signMessage])

  useEffect(() => {
    if (!hasMounted || phase !== 'lobby') return
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('challenge')
    if (!id) return
    challengeFromUrlRef.current = id
    if (challengeBootstrapIdRef.current === id) return
    challengeBootstrapIdRef.current = id
    let cancelled = false
    void fetch(`/api/challenges/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok || cancelled) return
        const d = (await r.json()) as { personaId?: string; error?: string }
        if (d.error || cancelled || !d.personaId) return
        const persona = ALL_PERSONAS.find((p) => p.id === d.personaId)
        if (persona) selectPersona(persona)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hasMounted, phase, selectPersona])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || previewAppliedRef.current) return
    if (typeof window === 'undefined') return
    if (!hasMounted) return
    if (new URLSearchParams(window.location.search).get('preview') !== 'win') return

    previewAppliedRef.current = true
    selectPersona(FREE_PERSONAS[0])
    startSession()
    updateRizzScore(88)
    endSession(true)
  }, [endSession, hasMounted, selectPersona, startSession, updateRizzScore])

  const {
    startSession: startVoiceSession,
    endSession: endVoiceSession,
    sendUserMessage,
  } = useConversationControls()
  const { status: voiceStatus } = useConversationStatus()
  const { isMuted, setMuted } = useConversationInput()
  const { mode: convaiMode } = useConversationMode()

  /** SDK may replace `setMuted` between renders; keep a stable ref so effect deps stay fixed-size. */
  const setMutedRef = useRef(setMuted)
  setMutedRef.current = setMuted

  const voiceStatusRef = useRef(voiceStatus)
  voiceStatusRef.current = voiceStatus

  const resolvedAgentId = currentPersona
    ? resolvePersonaAgentId(currentPersona)
    : null
  const hasAgentId = Boolean(resolvedAgentId)

  const endAnyVoice = useCallback(async () => {
    const s = voiceStatusRef.current
    if (s !== 'connected' && s !== 'connecting') return
    endVoiceSession()
    try {
      await waitUntilVoiceNotConnected(
        () => voiceStatusRef.current,
        SESSION_END_WAIT_MS
      )
    } catch (err) {
      console.warn('[Rizz] endSession wait:', err)
    }
  }, [endVoiceSession])

  endAnyVoiceRef.current = endAnyVoice

  const finalizeAssistantTurn = useCallback(() => {
    const t = assistantDraftRef.current.trim()
    if (t) {
      useGameStore.getState().addMessage({ role: 'assistant', content: t })
    }
    assistantDraftRef.current = ''
    setAgentLiveCaption('')
  }, [])

  finalizeAssistantTurnRef.current = finalizeAssistantTurn

  useEffect(() => {
    if (session?.startTime) scoreFromAgentRef.current = false
  }, [session?.startTime])

  const startConversation = useCallback(
    async (agentId: string) => {
      if (!agentId?.trim()) {
        throw new Error('[Rizz] No agent id for persona')
      }
      await endAnyVoice()
      try {
        await ensureMicrophonePermission()
      } catch {
        console.warn('[Rizz] Microphone permission denied')
        throw new Error('[Rizz] Microphone permission denied')
      }
      assistantDraftRef.current = ''
      setAgentLiveCaption('')
      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false
          const timer = window.setTimeout(() => {
            if (settled) return
            settled = true
            reject(new Error('[Rizz] Session start timed out'))
          }, SESSION_CONNECT_TIMEOUT_MS)
          const finish = () => {
            if (settled) return
            settled = true
            window.clearTimeout(timer)
          }
          startVoiceSession({
            ...getPublicAgentSessionOptions(agentId),
            clientTools: {
              set_rizz_score: (params: Record<string, unknown>) => {
                try {
                  const raw =
                    params.score ??
                    params.Score ??
                    (params as { value?: unknown }).value
                  const n =
                    typeof raw === 'number' ? raw : Number(raw)
                  if (!Number.isFinite(n)) return 'noop'
                  useGameStore.getState().updateRizzScore(n)
                  scoreFromAgentRef.current = true
                  return 'ok'
                } catch {
                  return 'err'
                }
              },
              end_game: (params: Record<string, unknown>) => {
                try {
                  const st = useGameStore.getState()
                  if (st.phase !== 'active') return 'noop'
                  const won = Boolean(params.won ?? params.Won)
                  void (async () => {
                    finalizeAssistantTurnRef.current()
                    await endAnyVoiceRef.current()
                    useGameStore.getState().endSession(won)
                  })()
                  return 'ok'
                } catch {
                  return 'err'
                }
              },
            },
            onConnect: () => {
              finish()
              resolve()
            },
            onError: (message) => {
              finish()
              reject(new Error(message))
            },
            onMessage: ({ message, role }) => {
              if (!message?.trim()) return
              const text = message.trim()
              // Voice ASR: ConvAI emits user transcripts here (same callback as agent lines).
              if (role === 'user') {
                useGameStore.getState().addMessage({ role: 'user', content: text })
                return
              }
              if (role !== 'agent') return
              if (assistantDraftRef.current.trim()) return
              useGameStore.getState().addMessage({ role: 'assistant', content: text })
            },
            onAgentChatResponsePart: (part) => {
              if (part.type === 'start') {
                finalizeAssistantTurnRef.current()
              } else if (part.type === 'delta' && part.text) {
                assistantDraftRef.current += part.text
                setAgentLiveCaption(assistantDraftRef.current)
              }
            },
            onInterruption: () => {
              finalizeAssistantTurnRef.current()
            },
          })
        })
      } catch (err) {
        console.warn('[Rizz] Session start failed:', err)
        throw err
      }
    },
    [endAnyVoice, startVoiceSession]
  )

  useEffect(() => {
    if (phase !== 'incoming' || !currentPersona || !session) return

    const personaSnapshot = currentPersona
    const attempt = ++incomingConnectAttemptRef.current
    let cancelled = false

    void (async () => {
      const personaIdSnapshot = personaSnapshot.id
      const agentId = resolvePersonaAgentId(personaSnapshot)
      if (!agentId) {
        resetGame()
        return
      }
      try {
        await startConversation(agentId)
      } catch {
        if (!cancelled && attempt === incomingConnectAttemptRef.current) {
          await endAnyVoice()
          resetGame()
          setCardEndedFlash({
            personaId: personaIdSnapshot,
            until: Date.now() + 1500,
          })
        }
        return
      }
      if (cancelled || attempt !== incomingConnectAttemptRef.current) return
      if (useGameStore.getState().phase !== 'incoming') return
      setPhase('active')
    })()

    return () => {
      cancelled = true
    }
  }, [
    phase,
    currentPersona?.id,
    session?.startTime,
    startConversation,
    setPhase,
    resetGame,
    endAnyVoice,
  ])

  useEffect(() => {
    if (phase !== 'lobby') return
    const id = window.setInterval(() => setLobbyNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (cardEndedFlash && Date.now() >= cardEndedFlash.until) {
      setCardEndedFlash(null)
    }
  }, [cardEndedFlash, lobbyNowMs])

  useEffect(() => {
    if (voiceStatus === 'connected' && phase === 'active') {
      if (callStartRef.current === null) {
        callStartRef.current = Date.now()
        setCallDurationSeconds(0)
      }
      setInputMode('voice')
    }
    if (voiceStatus === 'disconnected' || voiceStatus === 'error') {
      callStartRef.current = null
      setCallDurationSeconds(0)
    }
  }, [voiceStatus, phase])

  useEffect(() => {
    if (!(voiceStatus === 'connected' && phase === 'active' && callStartRef.current))
      return
    const start = callStartRef.current
    const id = window.setInterval(() => {
      setCallDurationSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [voiceStatus, phase])

  useEffect(() => {
    try {
      if (inputMode === 'text') {
        setMutedRef.current(true)
      } else if (voiceStatus === 'connected' && phase === 'active') {
        setMutedRef.current(false)
      }
    } catch {
      /* ConvAI may already have torn down the session while voiceStatus still lags (timer/hang-up race). */
    }
  }, [inputMode, voiceStatus, phase])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const { addMessage } = useGameStore.getState()
      addMessage({ role: 'user', content: text })
      if (voiceStatus === 'connected') {
        sendUserMessage(text)
      }
    },
    [voiceStatus, sendUserMessage]
  )

  const connectionStatus = resolveRizzConnectionStatus({
    sdkStatus: voiceStatus,
    hasAgentId,
  })

  const handleDecline = useCallback(async () => {
    const pid = currentPersona?.id ?? null
    setInputMode('voice')
    finalizeAssistantTurn()
    assistantDraftRef.current = ''
    setAgentLiveCaption('')
    await endAnyVoice()
    resetGame()
    if (pid) {
      setCardEndedFlash({ personaId: pid, until: Date.now() + 1500 })
    }
  }, [currentPersona?.id, endAnyVoice, finalizeAssistantTurn, resetGame])

  const handleHangUp = useCallback(async () => {
    finalizeAssistantTurn()
    if (!scoreFromAgentRef.current) {
      const { session: sess, updateRizzScore: upd } = useGameStore.getState()
      if (sess?.messages?.length) {
        upd(estimateRizzScoreFromTranscript(sess.messages))
      }
    }
    setInputMode('voice')
    setAgentLiveCaption('')
    await endAnyVoice()
    endSession(false)
  }, [endAnyVoice, endSession, finalizeAssistantTurn])

  const handleTimeUp = useCallback(async () => {
    finalizeAssistantTurn()
    if (!scoreFromAgentRef.current) {
      const { session: sess, updateRizzScore: upd } = useGameStore.getState()
      if (sess?.messages?.length) {
        upd(estimateRizzScoreFromTranscript(sess.messages))
      }
    }
    setInputMode('voice')
    setAgentLiveCaption('')
    await endAnyVoice()
    endSession(false)
  }, [endAnyVoice, endSession, finalizeAssistantTurn])

  const handleIssueChallenge = useCallback(async () => {
    if (!publicKey || !profile) return
    const st = useGameStore.getState()
    const sess = st.session
    if (!sess) return
    const score =
      typeof sess.rizzScore === 'number' ? sess.rizzScore : st.rizzScore

    const escrowLamportsRaw = process.env.NEXT_PUBLIC_ESCROW_WAGER_LAMPORTS
    const useEscrow =
      typeof escrowLamportsRaw === 'string' &&
      escrowLamportsRaw.length > 0 &&
      Number(escrowLamportsRaw) >= 10_000

    try {
      const data = await createChallenge({
        wallet: publicKey.toBase58(),
        personaId: sess.persona.id,
        creatorScore: score,
        timeLimitSeconds: sess.userBudgetSeconds,
        sourceGameSessionId: lastPersistedSessionIdRef.current,
        signMessage: signMessage ?? undefined,
        wagerType: useEscrow ? 'sol_escrow' : 'free',
        wagerLamports: useEscrow ? Number(escrowLamportsRaw) : 0,
      })

      if (data.creatorDepositTransaction && signTransaction) {
        const { VersionedTransaction } = await import('@solana/web3.js')
        const b64 = data.creatorDepositTransaction
        const bin = atob(b64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const vtx = VersionedTransaction.deserialize(bytes)
        const signed = await signTransaction(vtx)
        const sig = await connection.sendRawTransaction(
          signed.serialize(),
          { skipPreflight: false },
        )
        const latest = await connection.getLatestBlockhash('confirmed')
        await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed')
        await fetch(
          `/api/challenges/${encodeURIComponent(data.challengeId)}/confirm-escrow`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signature: sig,
              wallet: publicKey.toBase58(),
            }),
          },
        )
      }

      setChallengeShare(data)
      setShowChallengeShare(true)
    } catch (e) {
      console.warn('[create challenge]', e)
    }
  }, [publicKey, profile, signMessage, signTransaction, connection])

  const handlePlayAgain = useCallback(() => {
    setShowCoach(false)
    setShowReplay(false)
    setPreviewReplaySession(null)
    setPreviewReplayOutcome(null)
    setInputMode('voice')
    finalizeAssistantTurn()
    assistantDraftRef.current = ''
    setAgentLiveCaption('')
    void endAnyVoice()
    resetGame()
  }, [endAnyVoice, finalizeAssistantTurn, resetGame])

  const handleShare = useCallback(
    async (intent: 'default' | 'replay' = 'default') => {
      const st = useGameStore.getState()
      const preview = previewReplaySession
      const previewOutcome = previewReplayOutcome
      const sess = preview ?? st.session
      const ph = st.phase
      const win =
        preview && previewOutcome != null
          ? previewOutcome === 'win'
          : ph === 'win'
      const name = sess?.persona.name ?? 'them'
      const score =
        typeof sess?.rizzScore === 'number'
          ? sess.rizzScore
          : st.rizzScore
      const base =
        typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname
          : ''
      const qs = new URLSearchParams({
        outcome: win ? 'win' : 'loss',
        score: String(score),
        persona: sess?.persona.id ?? '',
      })
      const url = base ? `${base}?${qs.toString()}` : ''

      let shareText: string
      if (intent === 'replay') {
        shareText = win
          ? `Rewatched my RIZZLER replay vs ${name} (${score}%). Still smooth.`
          : `Rewatched my RIZZLER replay vs ${name} (${score}%). Still recovering.`
      } else if (win) {
        shareText = `Secured the bag vs ${name} on RIZZLER (${score}%). Your turn.`
      } else {
        shareText = `Got cooked by ${name} on RIZZLER (${score}%). Can you do better?`
      }

      const xIntent = () => {
        const u = new URL('https://x.com/intent/tweet')
        u.searchParams.set('text', shareText)
        if (url) u.searchParams.set('url', url)
        window.open(u.toString(), '_blank', 'noopener,noreferrer')
      }

      let selector: string | null = null
      let fileKind: 'win' | 'loss' | 'replay' = win ? 'win' : 'loss'
      if (intent === 'replay') {
        selector = '[data-export-share-card="replay"]'
        fileKind = 'replay'
      } else if (win) {
        selector = '[data-export-share-card="result-win"]'
      } else {
        selector = '[data-export-share-card="result-lose"]'
      }

      let blob: Blob | null = null
      if (typeof document !== 'undefined' && selector) {
        const el = document.querySelector(selector) as HTMLElement | null
        if (el) {
          blob = await captureElementAsPng(el)
        }
      }

      const pngFile =
        blob &&
        new File([blob], shareBlobFilename(fileKind), { type: 'image/png' })

      if (pngFile && navigator.share && navigator.canShare?.({ files: [pngFile] })) {
        try {
          await navigator.share({
            files: [pngFile],
            title: 'rizzlr',
            text: `${shareText}${url ? `\n${url}` : ''}`,
          })
          return
        } catch {
          /* fall through */
        }
      }

      if (blob) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = shareBlobFilename(fileKind)
        a.click()
        URL.revokeObjectURL(a.href)
      }

      xIntent()
    },
    [previewReplayOutcome, previewReplaySession],
  )

  useEffect(() => {
    if (phase === 'active' || phase === 'incoming') {
      setRecapReady(false)
    }
  }, [phase])

  /** Single epilogue string lives on session.exitLine; play TTS then reveal UI (or timeout). */
  useEffect(() => {
    if (phase !== 'win' && phase !== 'lose') return

    const persona = session?.persona
    const text = session?.exitLine?.trim()
    if (!session?.endTime || !persona || !text) {
      setRecapReady(true)
      return
    }

    setRecapReady(false)
    let cancelled = false
    let revealed = false
    let maxTimer: number | undefined
    const reveal = () => {
      if (cancelled || revealed) return
      revealed = true
      if (maxTimer !== undefined) clearTimeout(maxTimer)
      setRecapReady(true)
    }

    maxTimer = window.setTimeout(reveal, RESULT_RECAP_MAX_WAIT_MS)
    const voiceId = resolveEpilogueVoiceId(persona)

    if (!voiceId) {
      const fallbackTimer = window.setTimeout(() => {
        clearTimeout(maxTimer)
        reveal()
      }, RESULT_RECAP_NO_VOICE_MS)
      return () => {
        cancelled = true
        clearTimeout(maxTimer)
        clearTimeout(fallbackTimer)
      }
    }

    void (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
        })
        if (!res.ok || cancelled) {
          reveal()
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => {
          clearTimeout(maxTimer)
          URL.revokeObjectURL(url)
          reveal()
        }
        await audio.play().catch(() => {
          reveal()
        })
      } catch {
        reveal()
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(maxTimer)
    }
  }, [phase, session?.endTime, session?.exitLine, session?.persona?.id])

  const handleConnectWallet = useCallback(() => {
    setVisible(true)
  }, [setVisible])

  const handleDisconnectWallet = useCallback(() => {
    void disconnect()
  }, [disconnect])

  const handleMicIntent = useCallback(() => {
    setInputMode('voice')
    setMutedRef.current(false)
  }, [])

  const handleTextFieldFocus = useCallback(() => {
    setInputMode('text')
    setMutedRef.current(true)
  }, [])

  if (!hasMounted) {
    return <div className="h-full" style={{ background: 'var(--bg)' }} />
  }

  const walletConnected = Boolean(connected && publicKey)

  return (
    <div className="h-full" style={{ background: 'var(--bg)' }}>
      <AnimatePresence mode="wait">
        {phase === 'lobby' && (
          <Lobby
            key="lobby"
            gamePhase={phase}
            voiceStatus={voiceStatus}
            lobbyNowMs={lobbyNowMs}
            cardEndedPersonaId={cardEndedFlash?.personaId ?? null}
            cardEndedUntilMs={cardEndedFlash?.until ?? null}
            onConnectWallet={handleConnectWallet}
            isWalletConnected={walletConnected}
            walletAddress={publicKey?.toBase58() ?? null}
            onDisconnectWallet={handleDisconnectWallet}
            profile={profile}
            onOpenHistory={() => setShowSessionHistory(true)}
            onShowHallOfShame={() => setShowHallOfShame(true)}
          />
        )}

        {phase === 'incoming' && currentPersona && (
          <IncomingCall
            key="incoming"
            persona={currentPersona}
            voiceStatus={voiceStatus}
            onDecline={handleDecline}
          />
        )}

        {phase === 'active' && (
          <ActiveCall
            key="active"
            onHangUp={handleHangUp}
            onTimeUp={handleTimeUp}
            onSendMessage={sendMessage}
            isAISpeaking={convaiMode === 'speaking'}
            messages={session?.messages ?? []}
            connectionStatus={connectionStatus}
            isMuted={isMuted}
            setMuted={setMuted}
            inputMode={inputMode}
            onInputModeVoice={handleMicIntent}
            onTextInputFocus={handleTextFieldFocus}
            agentLiveCaption={agentLiveCaption}
            streamingAssistantText={
              (session?.messages.length ?? 0) > 0 ? agentLiveCaption : ''
            }
            callDurationSeconds={callDurationSeconds}
          />
        )}

        {phase === 'win' && (
          <WinScreen
            key="win"
            recapReady={recapReady}
            onPlayAgain={handlePlayAgain}
            onShare={handleShare}
            onIssueChallenge={handleIssueChallenge}
            showIssueChallenge={Boolean(
              publicKey &&
                profile &&
                (signMessage != null || process.env.NODE_ENV === 'development'),
            )}
            onShowReplay={() => {
              setPreviewReplaySession(null)
              setPreviewReplayOutcome(null)
              setShowReplay(true)
            }}
          />
        )}

        {phase === 'lose' && (
          <LoseScreen
            key="lose"
            recapReady={recapReady}
            onPlayAgain={handlePlayAgain}
            onShare={handleShare}
            onIssueChallenge={handleIssueChallenge}
            showIssueChallenge={Boolean(
              publicKey &&
                profile &&
                (signMessage != null || process.env.NODE_ENV === 'development'),
            )}
            onShowCoach={() => setShowCoach(true)}
            onShowReplay={() => {
              setPreviewReplaySession(null)
              setPreviewReplayOutcome(null)
              setShowReplay(true)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCoach && (
          <RizzCoach key="coach" onClose={() => setShowCoach(false)} />
        )}

        {showReplay && (
          <RizzReplay
            key="replay"
            previewSession={previewReplaySession}
            onClose={() => {
              setPreviewReplaySession(null)
              setPreviewReplayOutcome(null)
              setShowReplay(false)
            }}
            onShare={() => handleShare('replay')}
          />
        )}

        {showHallOfShame && (
          <HallOfShame
            key="shame"
            wallet={publicKey?.toBase58() ?? null}
            onClose={() => setShowHallOfShame(false)}
          />
        )}

        {showSessionHistory && publicKey && (
          <SessionHistory
            key="history"
            open
            wallet={publicKey.toBase58()}
            signMessage={signMessage ?? undefined}
            onClose={() => setShowSessionHistory(false)}
            onOpenReplay={(sess, won) => {
              setPreviewReplaySession(sess)
              setPreviewReplayOutcome(won ? 'win' : 'lose')
              setShowReplay(true)
            }}
          />
        )}

        {showProfileOnboarding && publicKey && (
          <ProfileOnboardingModal
            key="profile-onboarding"
            open
            walletAddress={publicKey.toBase58()}
            signMessage={signMessage ?? undefined}
            onComplete={(p) => {
              setProfile(p)
              setShowProfileOnboarding(false)
            }}
            onDismiss={() => setShowProfileOnboarding(false)}
          />
        )}

        <ChallengeShareModal
          open={showChallengeShare}
          data={challengeShare}
          onClose={() => {
            setShowChallengeShare(false)
            setChallengeShare(null)
          }}
        />
      </AnimatePresence>
    </div>
  )
}
