'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Entry = {
  rank: number
  wallet: string
  composite: number
  score: number
  displayName: string | null
  avatarUrl: string | null
}

export default function LeaderboardPage() {
  const [potDate, setPotDate] = useState('')
  const [potLamports, setPotLamports] = useState('0')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const d = new Date()
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const today = `${y}-${m}-${day}`
    setPotDate(today)
    let c = false
    void (async () => {
      const res = await fetch(`/api/leaderboard?date=${encodeURIComponent(today)}`)
      if (!res.ok || c) return
      const data = (await res.json()) as {
        potLamports?: string
        entries?: Entry[]
      }
      setPotLamports(data.potLamports ?? '0')
      setEntries(data.entries ?? [])
      setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [])

  const short = (w: string) =>
    w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w

  return (
    <div
      className="min-h-screen px-6 py-12 max-w-lg mx-auto"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Link
        href="/"
        className="text-[11px] uppercase tracking-[0.2em] mb-8 inline-block opacity-70 hover:opacity-100"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
      >
        ← back
      </Link>
      <h1
        className="text-2xl tracking-widest uppercase mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        daily pot
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        UTC day {potDate} · pot from verified treasury inflows (premium, time
        extensions{/* + wager rake when enabled */})
      </p>
      {loading ? (
        <p style={{ color: 'var(--faint)' }}>loading…</p>
      ) : (
        <>
          <p
            className="text-3xl tabular-nums mb-8"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {(Number(potLamports) / 1e9).toFixed(4)} SOL
          </p>
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
          >
            top wins today
          </p>
          <ol className="space-y-3">
            {entries.length === 0 ? (
              <li style={{ color: 'var(--muted)' }}>No wins recorded for this UTC day yet.</li>
            ) : (
              entries.map((e) => (
                <li
                  key={e.wallet + e.rank}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2"
                  style={{ borderColor: 'var(--border-soft)' }}
                >
                  <span
                    className="tabular-nums w-6 text-right text-sm"
                    style={{ color: 'var(--faint)', fontFamily: 'var(--font-display)' }}
                  >
                    {e.rank}
                  </span>
                  {e.avatarUrl ? (
                    <img src={e.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full"
                      style={{ background: 'var(--surface-strong)' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {e.displayName ?? short(e.wallet)}
                    </p>
                    <p
                      className="text-[10px] font-mono truncate"
                      style={{ color: 'var(--muted)' }}
                    >
                      {short(e.wallet)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm tabular-nums">{Math.round(e.score)}%</p>
                    <p className="text-[10px]" style={{ color: 'var(--faint)' }}>
                      {e.composite.toFixed(1)} pts
                    </p>
                  </div>
                </li>
              ))
            )}
          </ol>
        </>
      )}
    </div>
  )
}
