'use client'

import { FC, ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { useStandardWalletAdapters } from '@solana/wallet-standard-wallet-adapter'
import { clusterApiUrl } from '@solana/web3.js'

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css'

interface SolanaProviderProps {
  children: ReactNode
}

/** Registers Wallet Standard wallets; auto-restore only if NEXT_PUBLIC_WALLET_AUTO_CONNECT=true */
function WalletStandardBridge({ children }: { children: ReactNode }) {
  const wallets = useStandardWalletAdapters(useMemo(() => [], []))
  const autoConnect =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_WALLET_AUTO_CONNECT === 'true'
  return (
    <WalletProvider wallets={wallets} autoConnect={autoConnect}>
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
      <WalletStandardBridge>{children}</WalletStandardBridge>
    </ConnectionProvider>
  )
}
