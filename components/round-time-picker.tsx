'use client'

import {
  DEFAULT_USER_BUDGET_SECONDS,
  EXTENDED_USER_BUDGET_SECONDS,
  getTimeExtensionLamports,
  getTimeExtensionSolDisplay,
} from '@/lib/game-config'
import { confirmPurchase } from '@/lib/rizz-api'
import { sendLamportsToTreasury } from '@/lib/solana/send-treasury-payment'
import { cn } from '@/lib/utils'
import { useConnection } from '@solana/wallet-adapter-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Loader2, Timer } from 'lucide-react'
import { useCallback, useState } from 'react'

interface RoundTimePickerProps {
  selectedSeconds: number | null
  onSelectStandard: () => void
  onSelectExtended: () => void
}

export function RoundTimePicker({
  selectedSeconds,
  onSelectStandard,
  onSelectExtended,
}: RoundTimePickerProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const extendedSelected = selectedSeconds === EXTENDED_USER_BUDGET_SECONDS
  const standardSelected =
    selectedSeconds === null || selectedSeconds === DEFAULT_USER_BUDGET_SECONDS

  const payExtended = useCallback(async () => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setErr('Connect a wallet to buy extended time.')
      return
    }
    setPaying(true)
    setErr(null)
    try {
      const lamports = BigInt(getTimeExtensionLamports())
      const sig = await sendLamportsToTreasury({
        connection,
        wallet,
        lamports,
      })
      const res = await confirmPurchase({
        wallet: wallet.publicKey.toBase58(),
        signature: sig,
        kind: 'time_extension',
      })
      if (!res.ok) {
        setErr(res.error ?? 'Confirm failed')
        return
      }
      onSelectExtended()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }, [connection, onSelectExtended, wallet])

  return (
    <div className="mb-10">
      <p
        className="text-xs uppercase tracking-widest mb-3 flex items-center gap-2"
        style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
      >
        <Timer className="w-3.5 h-3.5" />
        your timer
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSelectStandard}
          className={cn(
            'rounded-xl border px-3 py-3 text-left transition-all',
            standardSelected
              ? 'border-[color-mix(in_oklch,var(--accent)_55%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)]'
              : 'border-[var(--border-soft)] hover:border-[var(--border)]',
          )}
        >
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
          >
            standard
          </p>
          <p
            className="text-lg tabular-nums"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            {DEFAULT_USER_BUDGET_SECONDS}s
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            free · pauses while they talk
          </p>
        </button>
        <button
          type="button"
          onClick={() => void payExtended()}
          disabled={paying}
          className={cn(
            'rounded-xl border px-3 py-3 text-left transition-all relative',
            extendedSelected
              ? 'border-[color-mix(in_oklch,var(--chain)_50%,var(--border))] bg-[color-mix(in_oklch,var(--chain)_12%,transparent)]'
              : 'border-[var(--border-soft)] hover:border-[var(--border)]',
          )}
        >
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
          >
            extended
          </p>
          <p
            className="text-lg tabular-nums"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            {EXTENDED_USER_BUDGET_SECONDS}s
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            {getTimeExtensionSolDisplay()} SOL · tap to pay
          </p>
          {paying ? (
            <span className="absolute top-2 right-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
            </span>
          ) : null}
        </button>
      </div>
      {err ? (
        <p className="text-xs text-destructive mt-2" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}
