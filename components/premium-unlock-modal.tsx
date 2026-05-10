'use client'

import type { Persona } from '@/lib/game-store'
import { getTreasuryPubkey } from '@/lib/solana/treasury'
import { sendLamportsToTreasury, solToLamports } from '@/lib/solana/send-treasury-payment'
import { confirmPurchase } from '@/lib/rizz-api'
import { formatSolanaWalletError } from '@/lib/wallet-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConnection } from '@solana/wallet-adapter-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

interface PremiumUnlockModalProps {
  persona: Persona | null
  open: boolean
  onClose: () => void
  onUnlocked: (persona: Persona) => void
}

export function PremiumUnlockModal({
  persona,
  open,
  onClose,
  onUnlocked,
}: PremiumUnlockModalProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handlePay = useCallback(async () => {
    if (!persona?.unlockCost || !wallet.publicKey || !wallet.sendTransaction) {
      setErr('Connect a wallet that can send SOL.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const lamports = solToLamports(persona.unlockCost)
      const sig = await sendLamportsToTreasury({
        connection,
        wallet,
        lamports,
      })
      const res = await confirmPurchase({
        wallet: wallet.publicKey.toBase58(),
        signature: sig,
        kind: 'unlock_persona',
        personaId: persona.id,
      })
      if (!res.ok) {
        setErr(res.error ?? 'Server rejected payment')
        return
      }
      onUnlocked(persona)
      onClose()
    } catch (e) {
      setErr(formatSolanaWalletError(e))
    } finally {
      setBusy(false)
    }
  }, [connection, onClose, onUnlocked, persona, wallet])

  const treasury = getTreasuryPubkey().toBase58()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md border-[var(--border-soft)]"
        style={{
          background:
            'color-mix(in oklch, var(--surface-strong) 96%, transparent)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            unlock {persona?.name.toUpperCase() ?? '…'}
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-body)' }}>
            One-time payment in SOL to the rizzlr treasury. Your wallet signs a
            transfer; the app verifies it on-chain then unlocks this character
            for your wallet.
          </DialogDescription>
        </DialogHeader>
        {persona?.unlockCost != null ? (
          <div className="space-y-4">
            <p
              className="text-sm tabular-nums"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
            >
              Price:{' '}
              <span className="font-semibold">{persona.unlockCost} SOL</span>
            </p>
            <p
              className="text-[10px] uppercase tracking-widest break-all"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              rpc · {connection.rpcEndpoint}
            </p>
            <p
              className="text-[10px] uppercase tracking-widest break-all"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              treasury · {treasury}
            </p>
            {err ? (
              <p className="text-sm text-destructive" role="alert">
                {err}
              </p>
            ) : null}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                cancel
              </Button>
              <Button type="button" onClick={() => void handlePay()} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    paying…
                  </>
                ) : (
                  'pay & unlock'
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
