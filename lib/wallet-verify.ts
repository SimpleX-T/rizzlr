import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

export function verifySignedMessage(
  walletAddress: string,
  message: string,
  signatureBase64: string,
): boolean {
  try {
    const pk = new PublicKey(walletAddress)
    const sig = Buffer.from(signatureBase64, 'base64')
    const msg = new TextEncoder().encode(message)
    return nacl.sign.detached.verify(msg, sig, pk.toBytes())
  } catch {
    return false
  }
}
