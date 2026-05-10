'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setErr('Invalid password or admin not configured')
        return
      }
      router.push('/admin')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-6 rounded-xl border"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <h1
          className="text-lg tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          rizzlr admin
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="w-full h-10 px-3 rounded-md border bg-transparent text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? '…' : 'sign in'}
        </Button>
      </form>
    </div>
  )
}
