'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Another deployment edit

type Summary = {
  sessionsLast7Days: number
  openChallenges: number
  treasuryRows: number
  revenueLamports: number
  premiumUnlocks: number
  pendingPayoutRows: number
}

function utcYesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [potDate, setPotDate] = useState(utcYesterday)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/summary')
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) return
    setSummary((await res.json()) as Summary)
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  async function recompute() {
    setMsg(null)
    const res = await fetch('/api/admin/recompute-pot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ potDate }),
    })
    const j = await res.json().catch(() => ({}))
    setMsg(res.ok ? JSON.stringify(j) : (j as { error?: string }).error ?? 'failed')
  }

  async function sendPayouts() {
    setMsg(null)
    const res = await fetch('/api/admin/payouts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ potDate }),
    })
    const j = await res.json().catch(() => ({}))
    setMsg(res.ok ? JSON.stringify(j) : (j as { error?: string }).error ?? 'failed')
  }

  return (
    <div
      className="min-h-screen px-6 py-10 max-w-xl mx-auto space-y-8"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="flex justify-between items-center">
        <h1
          className="text-xl tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          admin
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          log out
        </Button>
      </div>

      {summary ? (
        <ul className="text-sm space-y-2 font-mono" style={{ color: 'var(--muted)' }}>
          <li>sessions (7d): {summary.sessionsLast7Days}</li>
          <li>open challenges: {summary.openChallenges}</li>
          <li>treasury ledger rows: {summary.treasuryRows}</li>
          <li>revenue (sum lamports): {summary.revenueLamports}</li>
          <li>premium unlock rows: {summary.premiumUnlocks}</li>
          <li>pending payout rows: {summary.pendingPayoutRows}</li>
        </ul>
      ) : (
        <p style={{ color: 'var(--faint)' }}>loading…</p>
      )}

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
          pot date (UTC)
        </label>
        <input
          value={potDate}
          onChange={(e) => setPotDate(e.target.value)}
          className="w-full h-10 px-3 rounded-md border bg-transparent font-mono text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void recompute()}>
          recompute snapshot
        </Button>
        <Button type="button" onClick={() => void sendPayouts()}>
          send payouts
        </Button>
      </div>

      {msg ? (
        <pre
          className="text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
          style={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--border-soft)',
            color: 'var(--muted)',
          }}
        >
          {msg}
        </pre>
      ) : null}
    </div>
  )
}
