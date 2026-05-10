'use client'

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

import { getTreasuryPubkey } from '@/lib/solana/treasury'

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
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: blockhash,
  }).add(ix)
  const sig = await wallet.sendTransaction(tx, connection, {
    skipPreflight: false,
  })
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  return sig
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL))
}

export { getTreasuryPubkey, PublicKey }
