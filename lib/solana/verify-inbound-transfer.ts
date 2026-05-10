import type { Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

/**
 * Confirms a confirmed transaction moved at least `minLamports` native SOL
 * from `from` to `to` (simple transfer; fee may also debit `from`).
 */
export async function verifyNativeTransferToRecipient(
  connection: Connection,
  signature: string,
  opts: { from: PublicKey; to: PublicKey; minLamports: bigint },
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })
  if (!tx?.meta || tx.meta.err) return false

  const keys = tx.transaction.message.getAccountKeys()
  const list = keys.staticAccountKeys
  let fromIdx = -1
  let toIdx = -1
  for (let i = 0; i < list.length; i++) {
    if (list[i]!.equals(opts.from)) fromIdx = i
    if (list[i]!.equals(opts.to)) toIdx = i
  }
  if (fromIdx < 0 || toIdx < 0) return false

  const preF = BigInt(tx.meta.preBalances[fromIdx] ?? 0)
  const postF = BigInt(tx.meta.postBalances[fromIdx] ?? 0)
  const preT = BigInt(tx.meta.preBalances[toIdx] ?? 0)
  const postT = BigInt(tx.meta.postBalances[toIdx] ?? 0)
  const received = postT - preT
  return received >= opts.minLamports
}
