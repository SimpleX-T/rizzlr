import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

import {
  encodedDepositChallenger,
  encodedInitializeEscrow,
  encodedRefundExpired,
  encodedSettle,
  escrowPdaForChallengeUuid,
} from '@/lib/escrow/codec'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export function memoAcceptChallengeIx(params: {
  challenger: PublicKey
  challengeId: string
}): TransactionInstruction {
  const text = `rizzlr:challenge:accept:${params.challengeId}`
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: params.challenger, isSigner: true, isWritable: false }],
    data: Buffer.from(text, 'utf8'),
  })
}

export function initializeEscrowIx(params: {
  creator: PublicKey
  challengeIdUuid: string
  wagerPerSideLamports: bigint
  expiresTs: bigint
  authority: PublicKey
  programId: PublicKey
}): TransactionInstruction {
  const escrow = escrowPdaForChallengeUuid(params.challengeIdUuid)
  const data = encodedInitializeEscrow(
    params.challengeIdUuid,
    params.wagerPerSideLamports,
    params.expiresTs,
  )
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: params.authority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export function depositChallengerIx(params: {
  challengeIdUuid: string
  challenger: PublicKey
  programId: PublicKey
}): TransactionInstruction {
  const escrow = escrowPdaForChallengeUuid(params.challengeIdUuid)
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: params.challenger, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodedDepositChallenger(),
  })
}

export function settleEscrowIx(params: {
  challengeIdUuid: string
  authority: PublicKey
  winner: PublicKey
  programId: PublicKey
}): TransactionInstruction {
  const escrow = escrowPdaForChallengeUuid(params.challengeIdUuid)
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: params.winner, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodedSettle(),
  })
}

export function refundExpiredIx(params: {
  challengeIdUuid: string
  authority: PublicKey
  creator: PublicKey
  programId: PublicKey
}): TransactionInstruction {
  const escrow = escrowPdaForChallengeUuid(params.challengeIdUuid)
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: params.creator, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodedRefundExpired(),
  })
}

export async function buildUnsignedVersionedTx(opts: {
  connection: Connection
  feePayer: PublicKey
  instructions: TransactionInstruction[]
}): Promise<VersionedTransaction> {
  const { blockhash } = await opts.connection.getLatestBlockhash('confirmed')
  const msg = new TransactionMessage({
    payerKey: opts.feePayer,
    recentBlockhash: blockhash,
    instructions: opts.instructions,
  }).compileToV0Message()
  return new VersionedTransaction(msg)
}
