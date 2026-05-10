'use client'

import { formatSolanaWalletError } from '@/lib/wallet-error'

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return globalThis.btoa(bin)
}

export async function signUtf8(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
  text: string,
): Promise<string> {
  try {
    const sig = await signMessage(new TextEncoder().encode(text))
    return bytesToBase64(sig)
  } catch (e) {
    throw new Error(formatSolanaWalletError(e))
  }
}

export function utf8StringToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}
