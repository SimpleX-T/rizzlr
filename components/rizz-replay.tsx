'use client'

import type { GameSession, Persona } from '@/lib/game-store'
import { useGameStore, Message } from '@/lib/game-store'
import { getReplayShellStyle, getReplayTintCss } from '@/lib/persona-replay-style'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Flame,
  X as XIcon,
  Share2,
  Sparkles,
  MapPin,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface RizzReplayProps {
  onClose: () => void
  onShare: () => void
  /** When set (e.g. session history), overrides the live game store session for display only. */
  previewSession?: GameSession | null
}

function analyzeMessageQuality(message: string): 'fire' | 'miss' | 'neutral' {
  const lowerMessage = message.toLowerCase()

  const fireKeywords = [
    'interesting',
    'tell me more',
    'haha',
    'lol',
    'funny',
    'clever',
    'actually',
    'wow',
    'really?',
    'go on',
    'love',
    '?',
  ]

  const missKeywords = [
    'cringe',
    'weird',
    'um',
    'idk',
    'whatever',
    'k',
    'ok',
    'hey',
    'sup',
    "what's up",
  ]

  const fireScore = fireKeywords.filter((k) => lowerMessage.includes(k)).length
  const missScore = missKeywords.filter((k) => lowerMessage.includes(k)).length

  if (fireScore > missScore && fireScore >= 1) return 'fire'
  if (missScore > fireScore && missScore >= 1) return 'miss'
  return 'neutral'
}

export function RizzReplay({
  onClose,
  onShare,
  previewSession,
}: RizzReplayProps) {
  const storeSession = useGameStore((s) => s.session)
  const rizzScore = useGameStore((s) => s.rizzScore)
  const session = previewSession ?? storeSession

  if (!session) return null

  const persona = session.persona
  const tint = getReplayTintCss(persona)
  const shellStyle = getReplayShellStyle(persona)
  const displayScore =
    typeof session.rizzScore === 'number' ? session.rizzScore : rizzScore

  const userMessages = session.messages.filter((m) => m.role === 'user')

  const analyzedMessages = userMessages.map((m) => ({
    ...m,
    quality: analyzeMessageQuality(m.content),
  }))

  const bestLine = analyzedMessages.find((m) => m.quality === 'fire')
  const worstLine = analyzedMessages.find((m) => m.quality === 'miss')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        ...shellStyle,
        ['--replay-tint' as string]: tint,
      }}
    >
      {/* Export target: header + highlights (replay "card") */}
      <div data-export-share-card="replay">
      {/* Header */}
      <div
        className="relative flex-shrink-0 px-4 pt-7 pb-5 border-b"
        style={{
          borderColor: 'color-mix(in oklch, var(--replay-tint) 35%, var(--border))',
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--replay-tint) 14%, transparent) 0%, transparent 65%)',
        }}
      >
        <div className="flex items-start gap-4 justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div
              className="relative shrink-0 rounded-full p-[3px]"
              style={{
                background: `linear-gradient(145deg, ${tint}, color-mix(in oklch, var(--chain) 70%, ${tint}))`,
                boxShadow: `0 12px 36px color-mix(in oklch, ${tint} 22%, transparent)`,
              }}
            >
              <div
                className="rounded-full overflow-hidden w-[72px] h-[72px]"
                style={{
                  border: '2px solid var(--bg)',
                  background: 'var(--surface-strong)',
                }}
              >
                <img
                  src={persona.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              {persona.isPremium && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--surface-strong)',
                    border:
                      '1px solid color-mix(in oklch, var(--chain) 40%, var(--border))',
                  }}
                  title="Premium match"
                >
                  <Sparkles className="w-3 h-3 text-[color:var(--chain)]" />
                </span>
              )}
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2
                  className="text-xl font-bold tracking-wide truncate"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text)',
                  }}
                >
                  {persona.name}
                </h2>
                <span
                  className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: 'var(--replay-tint)',
                    border:
                      '1px solid color-mix(in oklch, var(--replay-tint) 45%, transparent)',
                    background:
                      'color-mix(in oklch, var(--replay-tint) 12%, transparent)',
                  }}
                >
                  {persona.difficulty}
                </span>
              </div>
              <p
                className="text-xs flex items-center gap-1.5 mb-1"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
              >
                <MapPin className="w-3 h-3 shrink-0 opacity-80" />
                <span className="truncate">{persona.location}</span>
              </p>
              <p
                className="text-[11px] leading-snug line-clamp-2 mb-3"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
              >
                {persona.vibe}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    background:
                      'color-mix(in oklch, var(--surface-strong) 85%, var(--replay-tint))',
                    border:
                      '1px solid color-mix(in oklch, var(--replay-tint) 28%, var(--border))',
                  }}
                >
                  <MessageSquare
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--replay-tint)' }}
                  />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      final score
                    </p>
                    <p
                      className="text-lg font-mono tabular-nums leading-none"
                      style={{ color: 'var(--text)' }}
                    >
                      {displayScore}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.messages.length} messages
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
            style={{
              background:
                'color-mix(in oklch, var(--surface-strong) 90%, transparent)',
              border: '1px solid var(--border-soft)',
              color: 'var(--muted)',
            }}
            aria-label="Close replay"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="flex-shrink-0 px-4 py-4 space-y-3">
        {bestLine && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 border"
            style={{
              background:
                'color-mix(in oklch, var(--chain) 14%, var(--surface))',
              borderColor:
                'color-mix(in oklch, var(--chain) 38%, var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-[color:var(--chain)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--chain)]">
                This line landed
              </span>
            </div>
            <p className="text-foreground text-sm">&quot;{bestLine.content}&quot;</p>
          </motion.div>
        )}

        {worstLine && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-4 border"
            style={{
              background:
                'color-mix(in oklch, var(--danger) 12%, var(--surface))',
              borderColor:
                'color-mix(in oklch, var(--danger) 35%, var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <XIcon className="w-4 h-4 text-destructive" />
              <span className="text-xs font-semibold uppercase tracking-wider text-destructive">
                Rough moment
              </span>
            </div>
            <p className="text-foreground text-sm">&quot;{worstLine.content}&quot;</p>
          </motion.div>
        )}
      </div>
      </div>

      {/* Full transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-6 space-y-3">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-4"
          style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
        >
          transcript
        </h3>

        {session.messages.map((message, index) => (
          <ReplayRow
            key={message.id}
            message={message}
            index={index}
            persona={persona}
            tint={tint}
          />
        ))}
      </div>

      {/* Share */}
      <div
        className="flex-shrink-0 p-4 border-t"
        style={{
          borderColor:
            'color-mix(in oklch, var(--replay-tint) 22%, var(--border))',
        }}
      >
        <Button
          onClick={onShare}
          className="w-full border-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, ${tint} 92%, black), ${tint})`,
            color: 'var(--primary-foreground)',
            boxShadow: `0 14px 32px color-mix(in oklch, ${tint} 22%, transparent)`,
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share replay to X
        </Button>
      </div>
    </motion.div>
  )
}

function ReplayRow({
  message,
  index,
  persona,
  tint,
}: {
  message: Message
  index: number
  persona: Persona
  tint: string
}) {
  const isUser = message.role === 'user'
  const quality = isUser ? analyzeMessageQuality(message.content) : 'neutral'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6) }}
      className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-full overflow-hidden mt-0.5"
          style={{
            border: `1px solid color-mix(in oklch, ${tint} 45%, transparent)`,
            background: 'var(--surface-strong)',
          }}
        >
          <img src={persona.avatar} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className={cn('relative max-w-[82%]', isUser && 'order-first')}>
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={
            isUser
              ? {
                  background: `linear-gradient(145deg, ${tint}, color-mix(in oklch, ${tint} 78%, black))`,
                  color: 'var(--primary-foreground)',
                  borderBottomRightRadius: 6,
                  boxShadow: `0 10px 28px color-mix(in oklch, ${tint} 25%, transparent)`,
                }
              : {
                  background:
                    'color-mix(in oklch, var(--surface-strong) 82%, var(--replay-tint))',
                  color: 'var(--text)',
                  border:
                    '1px solid color-mix(in oklch, var(--replay-tint) 28%, var(--border-soft))',
                  borderBottomLeftRadius: 6,
                }
          }
        >
          <p>{message.content}</p>
        </div>

        {isUser && quality !== 'neutral' && (
          <div
            className={cn(
              'absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center',
              quality === 'fire' ? 'bg-success/25' : 'bg-destructive/25'
            )}
          >
            {quality === 'fire' ? (
              <Flame className="w-3 h-3 text-success" />
            ) : (
              <XIcon className="w-3 h-3 text-destructive" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
