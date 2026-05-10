import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js'

import {
  getEscrowProgramId,
  loadEscrowAuthorityKeypair,
} from '@/lib/escrow/config'
import {
  buildUnsignedVersionedTx,
  refundExpiredIx,
  settleEscrowIx,
} from '@/lib/escrow/instructions'

function rpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    clusterApiUrl('devnet')
  )
}

export async function executeSettleWinner(params: {
  challengeIdUuid: string
  winnerWallet: string
}): Promise<string> {
  const kp = loadEscrowAuthorityKeypair()
  if (!kp) {
    throw new Error('SOLANA_ESCROW_AUTHORITY_SECRET not configured')
  }
  const programId = getEscrowProgramId()
  const winner = new PublicKey(params.winnerWallet)
  const ix = settleEscrowIx({
    challengeIdUuid: params.challengeIdUuid,
    authority: kp.publicKey,
    winner,
    programId,
  })
  const connection = new Connection(rpcUrl(), 'confirmed')
  const vtx = await buildUnsignedVersionedTx({
    connection,
    feePayer: kp.publicKey,
    instructions: [ix],
  })
  vtx.sign([kp])
  const sig = await connection.sendRawTransaction(vtx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })
  const latest = await connection.getLatestBlockhash('confirmed')
  await connection.confirmTransaction(
    { signature: sig, ...latest },
    'confirmed',
  )
  return sig
}

export async function executeRefundGhostCreator(params: {
  challengeIdUuid: string
  creatorWallet: string
}): Promise<string> {
  const kp = loadEscrowAuthorityKeypair()
  if (!kp) {
    throw new Error('SOLANA_ESCROW_AUTHORITY_SECRET not configured')
  }
  const programId = getEscrowProgramId()
  const creator = new PublicKey(params.creatorWallet)
  const ix = refundExpiredIx({
    challengeIdUuid: params.challengeIdUuid,
    authority: kp.publicKey,
    creator,
    programId,
  })
  const connection = new Connection(rpcUrl(), 'confirmed')
  const vtx = await buildUnsignedVersionedTx({
    connection,
    feePayer: kp.publicKey,
    instructions: [ix],
  })
  vtx.sign([kp])
  const sig = await connection.sendRawTransaction(vtx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })
  const latest = await connection.getLatestBlockhash('confirmed')
  await connection.confirmTransaction(
    { signature: sig, ...latest },
    'confirmed',
  )
  return sig
}
