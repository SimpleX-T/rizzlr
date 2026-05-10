'use client'

import type { GameSession } from '@/lib/game-store'
import { ALL_PERSONAS, FREE_PERSONAS } from '@/lib/game-store'
import type { SessionListItem } from '@/lib/rizz-api'
import { fetchSessionHistory } from '@/lib/rizz-api'
import { motion } from 'framer-motion'
import { X as XIcon, History } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

interface SessionHistoryProps {
  open: boolean
  wallet: string
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>
  onClose: () => void
  onOpenReplay: (session: GameSession, won: boolean) => void
}

function rowToGameSession(row: SessionListItem): GameSession {
  const persona =
    ALL_PERSONAS.find((p) => p.id === row.personaId) ?? FREE_PERSONAS[0]
  return {
    persona,
    mode: 'voice',
    startTime: new Date(row.startedAt).getTime(),
    endTime: new Date(row.endedAt).getTime(),
    messages: row.messages,
    rizzScore: row.score,
    exitLine: row.exitLine ?? undefined,
  }
}

export function SessionHistory({
  open,
  wallet,
  signMessage,
  onClose,
  onOpenReplay,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!wallet) return
    setLoading(true)
    try {
      const list = await fetchSessionHistory(wallet, signMessage)
      setSessions(list)
    } finally {
      setLoading(false)
    }
  }, [wallet, signMessage])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  if (!open) return null

  const shellStyle: CSSProperties = {
    background: [
      `radial-gradient(ellipse 90% 55% at 100% -15%, color-mix(in oklch, var(--chain) 26%, transparent), transparent 52%)`,
      `radial-gradient(ellipse 70% 45% at 0% 105%, color-mix(in oklch, var(--accent) 12%, transparent), transparent 50%)`,
      `linear-gradient(180deg, color-mix(in oklch, var(--surface) 40%, var(--bg)) 0%, var(--bg) 38%)`,
    ].join(', '),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={shellStyle}
    >
      <div
        className="flex-shrink-0 px-4 pt-7 pb-5 border-b"
        style={{
          borderColor: 'color-mix(in oklch, var(--chain) 35%, var(--border))',
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--chain) 12%, transparent) 0%, transparent 65%)',
        }}
      >
        <div className="max-w-lg mx-auto flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'color-mix(in oklch, var(--chain) 18%, transparent)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <History className="w-5 h-5" style={{ color: 'var(--chain)' }} />
            </div>
            <div>
              <h2
                className="text-xl tracking-wide"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text)',
                }}
              >
                YOUR RUNS
              </h2>
              <p
                className="text-xs"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
              >
                Saved transcripts — tap to replay
              </p>
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
            aria-label="Close history"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {loading && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading…
          </p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No saved runs yet — finish a call with your profile connected.
          </p>
        )}
        {sessions.map((row, i) => {
          const persona =
            ALL_PERSONAS.find((p) => p.id === row.personaId) ?? FREE_PERSONAS[0]
          const ended = new Date(row.endedAt)
          return (
            <motion.button
              key={row.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                onOpenReplay(rowToGameSession(row), row.won)
                onClose()
              }}
              className="w-full text-left rounded-2xl border p-4 transition-opacity hover:opacity-95"
              style={{
                borderColor: 'var(--border-soft)',
                background: 'color-mix(in oklch, var(--surface-strong) 88%, transparent)',
              }}
            >
              <div className="flex gap-3">
                <img
                  src={persona.avatar}
                  alt=""
                  className="w-12 h-12 rounded-full shrink-0 object-cover"
                  style={{ border: '2px solid var(--border-soft)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="font-semibold truncate"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: 'var(--text)',
                      }}
                    >
                      {persona.name}
                    </span>
                    <span
                      className="text-[10px] uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: row.won ? 'var(--chain)' : 'var(--danger)',
                        border: `1px solid color-mix(in oklch, ${row.won ? 'var(--chain)' : 'var(--danger)'} 40%, transparent)`,
                        background: row.won
                          ? 'color-mix(in oklch, var(--chain) 10%, transparent)'
                          : 'color-mix(in oklch, var(--danger) 10%, transparent)',
                      }}
                    >
                      {row.won ? 'win' : 'loss'}
                    </span>
                  </div>
                  <p
                    className="text-xs tabular-nums"
                    style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                  >
                    {ended.toLocaleString()} · score {row.score}
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
