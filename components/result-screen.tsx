'use client'

import { ROUND_SECONDS } from '@/lib/game-config'
import { useGameStore, getRizzTier } from '@/lib/game-store'
import { cn } from '@/lib/utils'
import { Phone, Share2, RotateCcw, MessageCircle, Sparkles, MessageSquareText, ArrowRight, Swords } from 'lucide-react'
import { motion } from 'framer-motion'

interface ResultScreenProps {
  onPlayAgain: () => void
  onShare: () => void
  onShowCoach?: () => void
  onShowReplay?: () => void
  /** Create a shareable PvP challenge (Blink + deep link). */
  onIssueChallenge?: () => void
  showIssueChallenge?: boolean
}

export function WinScreen({
  onPlayAgain,
  onShare,
  onShowReplay,
  onIssueChallenge,
  showIssueChallenge,
}: ResultScreenProps) {
  const { session, rizzScore } = useGameStore()
  const displayScore =
    typeof session?.rizzScore === 'number' ? session.rizzScore : rizzScore
  const tier = getRizzTier(displayScore, true)

  if (!session) return null

  const timeUsed = session.endTime 
    ? Math.floor((session.endTime - session.startTime) / 1000)
    : 0
  const timeLeft = Math.max(0, ROUND_SECONDS - timeUsed)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center px-6 z-50 overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <ResultBackdrop avatar={session.persona.avatar} tone="win" />

      {/* Contact card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        data-export-share-card="result-win"
        className="relative w-full max-w-lg rounded-2xl p-7 mb-6"
        style={{
          background: 'linear-gradient(180deg, color-mix(in oklch, var(--surface-strong) 92%, transparent), color-mix(in oklch, var(--surface) 96%, transparent))',
          border: '1px solid color-mix(in oklch, var(--accent) 24%, var(--border))',
          boxShadow: '0 30px 90px color-mix(in oklch, var(--accent) 12%, transparent)',
        }}
      >
        <p
          className="text-xs uppercase tracking-[0.26em] mb-5"
          style={{ color: 'var(--chain)', fontFamily: 'var(--font-body)' }}
        >
          number secured
        </p>

        <div className="flex items-center gap-5 mb-7">
          <div
            className="w-24 h-24 rounded-full overflow-hidden shrink-0"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow: '0 0 0 8px color-mix(in oklch, var(--accent) 16%, transparent)',
            }}
          >
            <img
              src={session.persona.avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3
              className="text-4xl tracking-widest leading-none"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
            >
              {session.persona.name.toUpperCase()}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">saved to contacts</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-foreground">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-base tracking-wide">+1 (555) 867-5309</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground/80 italic text-sm">&quot;text me later&quot;</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 text-sm border-t border-border pt-5">
          <div>
            <p className="text-muted-foreground mb-0.5">time left</p>
            <p className="font-mono text-lg text-foreground">{timeLeft}s</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">score</p>
            <p
              className="font-mono text-lg tabular-nums"
              style={{ color: 'var(--accent)' }}
            >
              {displayScore}%
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-muted-foreground mb-0.5">rating</p>
            <p className="text-base text-foreground">{tier.emoji} {tier.label}</p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="relative w-full max-w-lg space-y-2">
        {onShowReplay && (
          <button
            onClick={onShowReplay}
            className="group relative w-full overflow-hidden rounded-xl border border-transparent px-4 py-3 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:border-border hover:translate-x-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
          >
            <span className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <span className="relative flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" />
              view replay
            </span>
            <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        )}
        
        {showIssueChallenge && onIssueChallenge && (
          <button
            type="button"
            onClick={onIssueChallenge}
            className="group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-sm transition-all duration-200 hover:translate-x-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderColor: 'color-mix(in oklch, var(--chain) 35%, var(--border))',
              color: 'var(--text)',
            }}
          >
            <span className="relative flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4" style={{ color: 'var(--chain)' }} />
                issue PvP challenge
              </span>
              <ArrowRight className="w-4 h-4 opacity-60" />
            </span>
          </button>
        )}
        
        <button
          onClick={onShare}
          className="group relative h-12 w-full overflow-hidden rounded-xl text-primary-foreground transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 14px 34px color-mix(in oklch, var(--accent) 18%, transparent)',
          }}
        >
          <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ background: 'color-mix(in oklch, white 14%, transparent)' }} />
          <span className="relative flex items-center justify-center">
            <Share2 className="w-4 h-4 mr-2" />
            share to X
          </span>
        </button>
        
        <button
          onClick={onPlayAgain}
          className="group relative h-12 w-full overflow-hidden rounded-xl text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
        >
          <span className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <span className="relative flex items-center justify-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            play again
          </span>
        </button>
      </div>
    </motion.div>
  )
}

export function LoseScreen({
  onPlayAgain,
  onShare,
  onShowCoach,
  onShowReplay,
  onIssueChallenge,
  showIssueChallenge,
}: ResultScreenProps) {
  const { session, rizzScore } = useGameStore()
  const displayScore =
    typeof session?.rizzScore === 'number' ? session.rizzScore : rizzScore
  const tier = getRizzTier(displayScore, false)

  if (!session) return null

  const exitLine = session.exitLine || "I've got to go..."

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center px-6 z-50 overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <ResultBackdrop avatar={session.persona.avatar} tone="lose" />

      {/* Result card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        data-export-share-card="result-lose"
        className="relative w-full max-w-lg rounded-2xl p-7 mb-6"
        style={{
          background: 'linear-gradient(180deg, color-mix(in oklch, var(--surface-strong) 92%, transparent), color-mix(in oklch, var(--surface) 96%, transparent))',
          border: '1px solid color-mix(in oklch, var(--danger) 24%, var(--border))',
          boxShadow: '0 30px 90px color-mix(in oklch, var(--danger) 10%, transparent)',
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-20 h-20 rounded-full overflow-hidden shrink-0"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow: '0 0 0 7px color-mix(in oklch, var(--danger) 12%, transparent)',
            }}
          >
            <img
              src={session.persona.avatar}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: 'grayscale(25%) saturate(85%)' }}
            />
          </div>
          <div className="flex-1">
            <h3
              className="text-2xl tracking-widest"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
            >
              {session.persona.name.toUpperCase()}
            </h3>
            <p className="text-xs text-destructive">call ended</p>
          </div>
        </div>

        {/* Exit line */}
        <div className="bg-muted/50 rounded-lg p-3 mb-5">
          <p className="text-sm text-foreground/90 italic">&quot;{exitLine}&quot;</p>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">rizz level</span>
            <span className="font-mono tabular-nums text-foreground">{displayScore}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${displayScore}%` }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className={cn(
                'h-full rounded-full',
                displayScore <= 30 ? 'bg-destructive/70' : 
                displayScore <= 60 ? 'bg-warning/70' : 
                'bg-accent/70'
              )}
            />
          </div>
        </div>

        {/* Rating */}
        <div className="text-center py-2">
          <span className="text-sm text-muted-foreground">
            {tier.emoji} {tier.label}
          </span>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="relative w-full max-w-lg space-y-2">
        <div className="flex gap-2">
          {onShowCoach && (
            <button
              onClick={onShowCoach}
              className="group relative flex-1 overflow-hidden rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2"
            >
              <span className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                rizz coach
              </span>
            </button>
          )}
          {onShowReplay && (
            <button
              onClick={onShowReplay}
              className="group relative flex-1 overflow-hidden rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2"
            >
              <span className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5" />
                replay
              </span>
            </button>
          )}
        </div>

        {showIssueChallenge && onIssueChallenge && (
          <button
            type="button"
            onClick={onIssueChallenge}
            className="group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-sm transition-all duration-200 hover:translate-x-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderColor: 'color-mix(in oklch, var(--chain) 35%, var(--border))',
              color: 'var(--text)',
            }}
          >
            <span className="relative flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4" style={{ color: 'var(--chain)' }} />
                issue PvP challenge
              </span>
              <ArrowRight className="w-4 h-4 opacity-60" />
            </span>
          </button>
        )}

        <button
          onClick={onPlayAgain}
          className="group relative h-12 w-full overflow-hidden rounded-xl text-primary-foreground transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 14px 34px color-mix(in oklch, var(--accent) 18%, transparent)',
          }}
        >
          <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ background: 'color-mix(in oklch, white 14%, transparent)' }} />
          <span className="relative flex items-center justify-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            try again
          </span>
        </button>
        
        <button
          onClick={onShare}
          className="group relative h-12 w-full overflow-hidden rounded-xl text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2"
        >
          <span className="absolute inset-0 bg-muted/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <span className="relative flex items-center justify-center">
            <Share2 className="w-4 h-4 mr-2" />
            share the L on X
          </span>
        </button>
      </div>
    </motion.div>
  )
}

function ResultBackdrop({ avatar, tone }: { avatar: string; tone: 'win' | 'lose' }) {
  return (
    <>
      <img
        src={avatar}
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-150"
        style={{
          filter: tone === 'win' ? 'blur(42px) saturate(135%)' : 'blur(42px) grayscale(38%) saturate(90%)',
          opacity: 0.2,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            tone === 'win'
              ? 'radial-gradient(circle at 50% 10%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 34rem), linear-gradient(180deg, color-mix(in oklch, var(--bg) 76%, transparent), var(--bg) 78%)'
              : 'radial-gradient(circle at 50% 10%, color-mix(in oklch, var(--danger) 14%, transparent), transparent 34rem), linear-gradient(180deg, color-mix(in oklch, var(--bg) 76%, transparent), var(--bg) 78%)',
        }}
      />
    </>
  )
}
