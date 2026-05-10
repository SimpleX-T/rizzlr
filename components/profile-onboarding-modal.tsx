'use client'

import type { UserProfile } from '@/lib/rizz-api'
import { fetchNonce, saveProfile } from '@/lib/rizz-api'
import { formatSolanaWalletError } from '@/lib/wallet-error'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { X as XIcon } from 'lucide-react'

interface ProfileOnboardingModalProps {
  open: boolean
  walletAddress: string
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>
  onComplete: (profile: UserProfile) => void
  onDismiss: () => void
}

export function ProfileOnboardingModal({
  open,
  walletAddress,
  signMessage,
  onComplete,
  onDismiss,
}: ProfileOnboardingModalProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submit = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 32) {
      setError('Use 2–32 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { nonce } = await fetchNonce(walletAddress)
      const profile = await saveProfile({
        wallet: walletAddress,
        displayName: trimmed,
        nonce,
        signMessage,
      })
      onComplete(profile)
      setName('')
    } catch (e) {
      setError(formatSolanaWalletError(e))
    } finally {
      setBusy(false)
    }
  }

  const shellStyle: CSSProperties = {
    background: [
      `radial-gradient(ellipse 90% 55% at 100% -15%, color-mix(in oklch, var(--accent) 28%, transparent), transparent 52%)`,
      `radial-gradient(ellipse 70% 45% at 0% 105%, color-mix(in oklch, var(--chain) 14%, transparent), transparent 50%)`,
      `linear-gradient(180deg, color-mix(in oklch, var(--surface) 40%, var(--bg)) 0%, var(--bg) 38%)`,
    ].join(', '),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-6"
      style={shellStyle}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-xl"
        style={{
          borderColor: 'var(--border-soft)',
          background: 'color-mix(in oklch, var(--surface-strong) 94%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
          style={{
            background:
              'color-mix(in oklch, var(--surface-strong) 90%, transparent)',
            border: '1px solid var(--border-soft)',
            color: 'var(--muted)',
          }}
          aria-label="Close"
        >
          <XIcon className="w-4 h-4" />
        </button>

        <p
          className="text-[10px] uppercase tracking-[0.22em] mb-2"
          style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
        >
          first launch
        </p>
        <h2
          className="text-2xl mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            letterSpacing: '0.04em',
          }}
        >
          CLAIM YOUR NAME
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
        >
          Your avatar is tied to your wallet. Pick a display name for the Hall of Shame and
          history.
        </p>

        <label className="block mb-2">
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
          >
            display name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            autoFocus
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
            }}
            placeholder="how they remember you"
          />
        </label>

        {error && (
          <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="w-full h-12 mt-2 transition-opacity disabled:opacity-40"
          style={{
            background: 'var(--accent)',
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            letterSpacing: '0.14em',
          }}
        >
          {busy ? 'SIGNING…' : 'SAVE & CONTINUE'}
        </button>

        <p
          className="text-[10px] mt-4 truncate text-center"
          style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
        >
          {walletAddress}
        </p>
      </motion.div>
    </motion.div>
  )
}
