import { WalletError, WalletSignMessageError } from '@solana/wallet-adapter-base'
import { SendTransactionError } from '@solana/web3.js'

function trimDetail(s: string, max = 360) {
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** Phantom / adapters often nest a generic Error whose only text is this. */
function isUnhelpfulWalletMessage(m: string) {
  return m.trim() === 'Unexpected error' || /^unexpected error\.?$/i.test(m.trim())
}

const TX_FALLBACK =
  'Wallet rejected the request or the network rejected the transaction. Use the same network as the app (check RPC: devnet vs mainnet), keep enough SOL for the payment plus fees, then try again.'

const SIGN_FALLBACK =
  'The wallet could not sign this message. Try again, unlock the wallet, switch account if you use multiple addresses, or use another wallet (e.g. Phantom or Solflare) that supports off-chain message signing.'

function detailFromRpcData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const msg = d.message
  if (typeof msg === 'string' && msg.trim()) return trimDetail(msg)
  const logs = d.logs
  if (Array.isArray(logs) && logs.length > 0) {
    const lines = logs.filter((l): l is string => typeof l === 'string')
    if (lines.length) return trimDetail(lines.slice(-6).join(' · '))
  }
  const err = d.err
  if (err !== undefined) {
    try {
      const s = JSON.stringify(err)
      if (s && s !== '{}' && s.length < 400) return trimDetail(s)
    } catch {
      /* noop */
    }
  }
  return null
}

function detailFromWalletInner(inner: unknown): string | null {
  if (inner instanceof SendTransactionError) {
    return trimDetail(inner.message)
  }
  if (
    inner instanceof Error &&
    inner.name === 'SendTransactionError' &&
    inner.message?.trim()
  ) {
    return trimDetail(inner.message)
  }
  if (inner instanceof Error && inner.message?.trim()) {
    if (isUnhelpfulWalletMessage(inner.message)) return null
    return trimDetail(inner.message)
  }
  if (typeof inner === 'string' && inner.trim()) {
    if (isUnhelpfulWalletMessage(inner)) return null
    return trimDetail(inner)
  }
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>
    const tm = o.transactionMessage
    if (typeof tm === 'string' && tm.trim()) return trimDetail(tm)
    const fromData = detailFromRpcData(o.data)
    if (fromData) return fromData
    const logs = o.logs
    if (Array.isArray(logs) && logs.length > 0) {
      const lines = logs.filter((l): l is string => typeof l === 'string')
      if (lines.length) return trimDetail(lines.slice(-6).join(' · '))
    }
    for (const key of ['message', 'reason', 'desc', 'description', 'errorMessage'] as const) {
      const v = o[key]
      if (typeof v === 'string' && v.trim() && !isUnhelpfulWalletMessage(v)) {
        return trimDetail(v)
      }
    }
    const code = o.code
    if (code !== undefined && (typeof code === 'string' || typeof code === 'number')) {
      const msg = typeof o.message === 'string' ? o.message : ''
      const combined = msg.trim() ? `${code}: ${msg}` : String(code)
      return trimDetail(combined)
    }
    try {
      const s = JSON.stringify(inner)
      if (s !== '{}' && s !== 'null' && s.length < 400) return trimDetail(s)
    } catch {
      /* noop */
    }
  }
  return null
}

/** Human-readable detail from wallet-adapter errors (message alone is often "Unexpected error"). */
export function formatSolanaWalletError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return trimDetail(
      'The request took too long (network or server timeout). Try again in a moment.',
    )
  }
  if (err instanceof SendTransactionError) {
    return trimDetail(err.message)
  }
  if (
    err instanceof Error &&
    err.name === 'SendTransactionError' &&
    err.message?.trim()
  ) {
    return trimDetail(err.message)
  }

  /**
   * `instanceof WalletError` breaks when the app bundles more than one copy of
   * `@solana/wallet-adapter-base` (wallet vs page chunk). Duck-type `Wallet*` + `.error`.
   */
  const isWalletErr =
    err instanceof WalletError ||
    (err instanceof Error &&
      typeof err.name === 'string' &&
      err.name.startsWith('Wallet'))

  if (isWalletErr && err instanceof Error) {
    const inner =
      err instanceof WalletError ? err.error : (err as Error & { error?: unknown }).error
    const fromInner = detailFromWalletInner(inner)
    if (fromInner) return fromInner
    if (err.message && !isUnhelpfulWalletMessage(err.message)) {
      return trimDetail(err.message)
    }
    if (
      err instanceof WalletSignMessageError ||
      err.name === 'WalletSignMessageError'
    ) {
      return trimDetail(SIGN_FALLBACK)
    }
    return trimDetail(TX_FALLBACK)
  }
  if (err instanceof Error && err.message?.trim()) {
    if (isUnhelpfulWalletMessage(err.message)) {
      return trimDetail(TX_FALLBACK)
    }
    return trimDetail(err.message)
  }
  return 'Something went wrong with the wallet request.'
}
