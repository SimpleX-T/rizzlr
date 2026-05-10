'use client'

import { FC, ReactNode, useCallback, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import type { WalletError } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'

import { formatSolanaWalletError } from '@/lib/wallet-error'

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css'

interface SolanaProviderProps {
  children: ReactNode
}

/**
 * Pass legacy adapters — `WalletProvider` merges Wallet Standard wallets internally.
 *
 * **autoConnect** defaults on: `WalletModal` only calls `select()`; the signing session is opened by
 * WalletProviderBase auto-connect path when this prop is true. If false, choosing a wallet never
 * calls `adapter.connect()` (looks frozen). Opt out with `NEXT_PUBLIC_WALLET_AUTO_CONNECT=false`.
 */
function SolanaWalletShell({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new SolflareWalletAdapter()], [])
  const autoConnect =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_WALLET_AUTO_CONNECT !== 'false'
  const onWalletError = useCallback((error: WalletError) => {
    console.warn('[wallet]', formatSolanaWalletError(error))
  }, [])
  return (
    <WalletProvider
      wallets={wallets}
      autoConnect={autoConnect}
      onError={onWalletError}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  )
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet'),
    [],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletShell>{children}</SolanaWalletShell>
    </ConnectionProvider>
  )
}
