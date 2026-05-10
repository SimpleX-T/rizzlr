'use client'

import { ROUND_SECONDS } from '@/lib/game-config'
import {
  useGameStore,
  FREE_PERSONAS,
  PREMIUM_PERSONAS,
  type GamePhase,
} from '@/lib/game-store'
import type { UserProfile } from '@/lib/rizz-api'
import type { ElevenLabsSdkStatus } from '@/lib/elevenlabs-status'
import { deriveCardCallState } from '@/lib/persona-call-state'
import { PersonaCard } from '@/components/persona-card'
import { ChevronRight, Wallet, History, LogOut, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface LobbyProps {
  gamePhase: GamePhase
  voiceStatus: ElevenLabsSdkStatus
  lobbyNowMs: number
  cardEndedPersonaId: string | null
  cardEndedUntilMs: number | null
  onConnectWallet: () => void
  isWalletConnected: boolean
  /** Base58 wallet address when connected; used in account menu. */
  walletAddress?: string | null
  onDisconnectWallet?: () => void
  profile: UserProfile | null
  onOpenHistory: () => void
  onShowHallOfShame: () => void
}

export function Lobby({
  gamePhase,
  voiceStatus,
  lobbyNowMs,
  cardEndedPersonaId,
  cardEndedUntilMs,
  onConnectWallet,
  isWalletConnected,
  walletAddress = null,
  onDisconnectWallet,
  profile,
  onOpenHistory,
  onShowHallOfShame,
}: LobbyProps) {
  const {
    currentPersona,
    selectPersona,
    unlockedPersonas,
    startSession,
  } = useGameStore()

  const [showPremium, setShowPremium] = useState(false)
  const [copied, setCopied] = useState(false)

  const shortAddr = (a: string) =>
    a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a

  const copyAddress = async () => {
    if (!walletAddress) return
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  const handleDisconnect = () => {
    onDisconnectWallet?.()
  }

  const handleStartGame = () => {
    if (!currentPersona) return
    startSession()
  }

  return (
    // h-screen flex-col: header + scrolling body + footer, nothing escapes the viewport
    <div
      className="h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Header (fixed height, never scrolls) ── */}
      <header
        className="shrink-0 z-40"
        style={{
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <h1
            className="text-base tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            rizzlr
          </h1>
          {isWalletConnected ? (
            <div className="flex items-center gap-3 max-w-[min(100%,16rem)]">
              {walletAddress ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-3 min-w-0 max-w-[min(100%,12rem)] rounded-lg py-0.5 pr-1 -my-0.5 text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--accent)_40%,transparent)]"
                      aria-label="Wallet address and disconnect"
                    >
                      {profile ? (
                        <>
                          <img
                            src={profile.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0 pointer-events-none"
                            style={{ border: '2px solid var(--border-soft)' }}
                          />
                          <span
                            className="text-xs truncate pointer-events-none"
                            style={{
                              color: 'var(--text)',
                              fontFamily: 'var(--font-body)',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {profile.displayName}
                          </span>
                        </>
                      ) : (
                        <span
                          className="text-xs font-mono truncate pointer-events-none"
                          style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}
                        >
                          {shortAddr(walletAddress)}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    className="w-[min(calc(100vw-2rem),20rem)] p-4 border shadow-xl"
                    style={{
                      borderColor: 'var(--border-soft)',
                      background:
                        'color-mix(in oklch, var(--surface-strong) 96%, transparent)',
                    }}
                  >
                    <p
                      className="text-[10px] uppercase tracking-[0.2em] mb-2"
                      style={{
                        color: 'var(--faint)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      wallet
                    </p>
                    <p
                      className="font-mono text-[11px] leading-relaxed break-all mb-3 select-all"
                      style={{ color: 'var(--text)' }}
                    >
                      {walletAddress}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 border-[var(--border-soft)]"
                        onClick={() => void copyAddress()}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {copied ? 'copied' : 'copy'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={!onDisconnectWallet}
                        onClick={handleDisconnect}
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1.5" />
                        disconnect
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <span
                  className="text-xs uppercase tracking-widest truncate"
                  style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
                >
                  wallet connected
                </span>
              )}
              <button
                type="button"
                onClick={onOpenHistory}
                className="shrink-0 flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
                title="Your runs"
              >
                <History className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
              style={{
                color: 'var(--faint)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Wallet className="w-3 h-3" />
              connect
            </button>
          )}
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-10 pb-6">

          {/* Hero */}
          <div className="mb-10">
            <p
              className="text-xs uppercase tracking-[0.22em] mb-3"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              protocol active
            </p>
            <h2
              className="text-5xl leading-[1.05] mb-4"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--text)',
                letterSpacing: '0.04em',
              }}
            >
              TALK YOUR<br />WAY IN
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
            >
              {ROUND_SECONDS} seconds. one shot. don&apos;t blow it.
            </p>
          </div>

          {/* Stats row */}
          <div
            className="flex gap-10 mb-10 pb-6"
            style={{ borderBottom: '1px solid var(--border-soft)' }}
          >
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
              >
                wins
              </p>
              <p
                className="text-3xl tabular-nums"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '0.04em' }}
              >
                00
              </p>
            </div>
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
              >
                streak
              </p>
              <p
                className="text-3xl tabular-nums"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '0.04em' }}
              >
                00
              </p>
            </div>
            <button
              onClick={onShowHallOfShame}
              className="ml-auto flex items-center gap-1.5 transition-opacity hover:opacity-70"
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              hall of shame
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Free personas */}
          <div className="mb-8">
            <p
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              select target
            </p>
            <div>
              {FREE_PERSONAS.map((persona, i) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                >
                  <PersonaCard
                    persona={persona}
                    index={i}
                    isUnlocked={unlockedPersonas.includes(persona.id)}
                    isSelected={currentPersona?.id === persona.id}
                    callState={deriveCardCallState({
                      personaId: persona.id,
                      currentPersonaId: currentPersona?.id ?? null,
                      phase: gamePhase,
                      voiceStatus,
                      endedPersonaId: cardEndedPersonaId,
                      endedUntilMs: cardEndedUntilMs,
                      nowMs: lobbyNowMs,
                    })}
                    onSelect={() => selectPersona(persona)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Premium section */}
          <div>
            <button
              onClick={() => setShowPremium(!showPremium)}
              className="w-full flex items-center justify-between py-2 transition-opacity hover:opacity-70"
              style={{
                color: 'var(--faint)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              <span>premium · {PREMIUM_PERSONAS.length} locked</span>
              <ChevronRight
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: showPremium ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showPremium && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {PREMIUM_PERSONAS.map((persona, i) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    index={FREE_PERSONAS.length + i}
                    isUnlocked={unlockedPersonas.includes(persona.id)}
                    isSelected={currentPersona?.id === persona.id}
                    callState={deriveCardCallState({
                      personaId: persona.id,
                      currentPersonaId: currentPersona?.id ?? null,
                      phase: gamePhase,
                      voiceStatus,
                      endedPersonaId: cardEndedPersonaId,
                      endedUntilMs: cardEndedUntilMs,
                      nowMs: lobbyNowMs,
                    })}
                    onSelect={() => {
                      if (unlockedPersonas.includes(persona.id)) selectPersona(persona)
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>

        </div>
      </main>

      {/* ── Footer CTA (fixed height, never scrolls) ── */}
      <div
        className="shrink-0 px-6 py-4"
        style={{ borderTop: '1px solid var(--border-soft)', background: 'var(--bg)' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleStartGame}
            disabled={!currentPersona}
            className="w-full h-12 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              background: currentPersona ? 'var(--accent)' : 'var(--surface-strong)',
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              letterSpacing: '0.14em',
            }}
          >
            {currentPersona
              ? `CALL ${currentPersona.name.toUpperCase()}`
              : 'SELECT TARGET FIRST'}
          </button>
        </div>
      </div>
    </div>
  )
}
