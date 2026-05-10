import bs58 from 'bs58'
import { Keypair, PublicKey } from '@solana/web3.js'

export function getEscrowProgramId(): PublicKey {
  const raw =
    process.env.NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID?.trim() ??
    process.env.SOLANA_ESCROW_PROGRAM_ID?.trim()
  if (!raw) {
    throw new Error(
      'Set NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID (or SOLANA_ESCROW_PROGRAM_ID) to your deployed rizzlr_escrow program id.'
    )
  }
  return new PublicKey(raw)
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
