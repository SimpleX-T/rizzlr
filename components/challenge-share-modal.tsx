'use client'

import type { ChallengeCreatedResponse } from '@/lib/rizz-api'
import { motion } from 'framer-motion'
import { X as XIcon } from 'lucide-react'

interface ChallengeShareModalProps {
  open: boolean
  data: ChallengeCreatedResponse | null
  onClose: () => void
}

export function ChallengeShareModal({
  open,
  data,
  onClose,
}: ChallengeShareModalProps) {
  if (!open || !data) return null

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* noop */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-6"
      style={{
        background: 'color-mix(in oklch, var(--bg) 85%, black)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{
          borderColor: 'var(--border-soft)',
          background: 'color-mix(in oklch, var(--surface-strong) 94%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
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
          challenge live
        </p>
        <h2
          className="text-xl mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text)',
            letterSpacing: '0.04em',
          }}
        >
          SHARE YOUR BLINK
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
        >
          Friends open the Blink to accept, then play the same persona in rizzlr.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              Invite page (browser)
            </span>
            <div className="flex gap-2 mt-1">
              <input
                readOnly
                value={data.inviteUrl}
                className="flex-1 rounded-lg px-3 py-2 text-xs truncate"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={() => void copy(data.inviteUrl)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs uppercase tracking-wider"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                copy
              </button>
            </div>
          </div>
          <div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              Blink (Solana Action)
            </span>
            <div className="flex gap-2 mt-1">
              <input
                readOnly
                value={data.blinkUrl}
                className="flex-1 rounded-lg px-3 py-2 text-xs truncate"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={() => void copy(data.blinkUrl)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs uppercase tracking-wider"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                copy
              </button>
            </div>
          </div>
          <div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              Play link
            </span>
            <div className="flex gap-2 mt-1">
              <input
                readOnly
                value={data.appUrl}
                className="flex-1 rounded-lg px-3 py-2 text-xs truncate"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={() => void copy(data.appUrl)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs uppercase tracking-wider"
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                copy
              </button>
            </div>
          </div>
        </div>

        <p
          className="text-[10px] font-mono break-all opacity-80"
          style={{ color: 'var(--faint)' }}
        >
          id {data.challengeId}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 h-11 text-xs uppercase tracking-[0.15em]"
          style={{
            border: '1px solid var(--border-soft)',
            color: 'var(--muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          done
        </button>
      </motion.div>
    </motion.div>
  )
}
