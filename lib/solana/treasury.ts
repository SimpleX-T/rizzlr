import { PublicKey } from '@solana/web3.js'

const DEFAULT_TREASURY =
  'Duzj6WGukxjCesWCEM6uTxZEf6Dhc8LfRGzS6o8xR4HQ'

export function getTreasuryPubkey(): PublicKey {
  const raw =
    process.env.NEXT_PUBLIC_TREASURY_WALLET?.trim() ||
    process.env.TREASURY_WALLET?.trim() ||
    DEFAULT_TREASURY
  return new PublicKey(raw)
}
