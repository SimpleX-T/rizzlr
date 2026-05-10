'use client'

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

import { getTreasuryPubkey } from '@/lib/solana/treasury'
import { formatSolanaWalletError } from '@/lib/wallet-error'

export async function sendLamportsToTreasury(opts: {
  connection: Connection
  wallet: Pick<WalletContextState, 'publicKey' | 'sendTransaction'>
  lamports: bigint
}): Promise<string> {
  const { connection, wallet } = opts
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected')
  }
  const treasury = getTreasuryPubkey()
  const ix = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: treasury,
    lamports: Number(opts.lamports),
  })
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message()
  const vtx = new VersionedTransaction(messageV0)
  try {
    const sig = await wallet.sendTransaction(vtx, connection, {
      skipPreflight: false,
      maxRetries: 3,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    return sig
  } catch (e) {
    throw new Error(formatSolanaWalletError(e))
  }
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL))
}

export { getTreasuryPubkey, PublicKey }
