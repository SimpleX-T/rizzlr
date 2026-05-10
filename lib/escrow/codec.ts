import { PublicKey } from '@solana/web3.js'

import { getEscrowProgramId } from '@/lib/escrow/config'

/** Anchor `sha256("global:<name>")[0..8]` instruction discriminators */
export const IX_DISCRIMINATORS = {
  initializeEscrow: Buffer.from([
    0xf3, 0xa0, 0x4d, 0x99, 0x0b, 0x5c, 0x30, 0xd1,
  ]),
  depositChallenger: Buffer.from([
    0x4a, 0xc5, 0x81, 0x78, 0x33, 0xae, 0xc5, 0x0b,
  ]),
  settle: Buffer.from([0xaf, 0x2a, 0xb9, 0x57, 0x90, 0x83, 0x66, 0xd4]),
  refundExpired: Buffer.from([
    0x76, 0x99, 0xa4, 0xf4, 0x28, 0x80, 0xf2, 0xfa,
  ]),
} as const

export function uuidToChallengeBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error('Invalid UUID for challenge bytes')
  }
  return Buffer.from(hex, 'hex')
}

export function escrowPdaForChallengeUuid(challengeUuid: string): PublicKey {
  const challengeId = uuidToChallengeBytes(challengeUuid)
  const programId = getEscrowProgramId()
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow', 'utf8'), challengeId],
    programId,
  )
  return pda
}

export function encodedInitializeEscrow(
  challengeUuid: string,
  wagerPerSideLamports: bigint,
  expiresTs: bigint,
): Buffer {
  const challengeId = uuidToChallengeBytes(challengeUuid)
  const body = Buffer.alloc(16 + 8 + 8)
  challengeId.copy(body, 0)
  body.writeBigUInt64LE(wagerPerSideLamports, 16)
  body.writeBigInt64LE(expiresTs, 24)
  return Buffer.concat([IX_DISCRIMINATORS.initializeEscrow, body])
}

export function encodedDepositChallenger(): Buffer {
  return IX_DISCRIMINATORS.depositChallenger
}

export function encodedSettle(): Buffer {
  return IX_DISCRIMINATORS.settle
}

export function encodedRefundExpired(): Buffer {
  return IX_DISCRIMINATORS.refundExpired
}
