import bs58 from 'bs58'
import { Keypair, PublicKey } from '@solana/web3.js'

/** Must match `declare_id!` in `programs/rizzlr-escrow` until you deploy your own program. */
export const DEFAULT_ESCROW_PROGRAM_ID =
  '8VXrjswABWW7y7MNsXfG7EcP39P18E75KxcxmX7yYk1W'

export function getEscrowProgramId(): PublicKey {
  const raw =
    process.env.NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID ??
    process.env.SOLANA_ESCROW_PROGRAM_ID
  return new PublicKey(raw ?? DEFAULT_ESCROW_PROGRAM_ID)
}

export function loadEscrowAuthorityKeypair(): Keypair | null {
  const secret = process.env.SOLANA_ESCROW_AUTHORITY_SECRET?.trim()
  if (!secret) return null
  try {
    if (secret.startsWith('[')) {
      const arr = JSON.parse(secret) as number[]
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    }
    return Keypair.fromSecretKey(bs58.decode(secret))
  } catch {
    return null
  }
}

export function getEscrowAuthorityPubkey(): PublicKey | null {
  const fromPk = process.env.SOLANA_ESCROW_AUTHORITY_PUBKEY?.trim()
  if (fromPk) {
    try {
      return new PublicKey(fromPk)
    } catch {
      return null
    }
  }
  return loadEscrowAuthorityKeypair()?.publicKey ?? null
}

export function isEscrowConfigured(): boolean {
  try {
    getEscrowProgramId()
  } catch {
    return false
  }
  return getEscrowAuthorityPubkey() !== null
}
