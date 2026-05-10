import type { NextRequest } from 'next/server'
import { PublicKey } from '@solana/web3.js'

import {
  buildChallengeCreateMessage,
  buildChallengeSubmitMessage,
  buildProfileAuthMessage,
  isTimestampFresh,
  parseChallengeCreateMessage,
  parseChallengeSubmitMessage,
  parseSessionSaveMessage,
  parseSessionsListMessage,
} from '@/lib/auth-messages'
import { verifySignedMessage } from '@/lib/wallet-verify'

/** In development, trust `x-wallet-address` without a signature (remove before production). */
export function devTrustWalletHeader(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function getTrustedWalletDev(request: NextRequest): string | null {
  if (!devTrustWalletHeader()) return null
  return request.headers.get('x-wallet-address')?.trim() ?? null
}

export type WalletVerifyOk = { wallet: string }

export function verifySessionsListRequest(
  request: NextRequest,
  queryWallet: string | null,
): WalletVerifyOk | Response {
  const dev = getTrustedWalletDev(request)
  if (dev) {
    const w =
      request.headers.get('x-wallet-address')?.trim() || queryWallet?.trim()
    if (w) return { wallet: w }
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet =
    queryWallet?.trim() ||
    request.headers.get('x-wallet-address')?.trim() ||
    ''
  const msgB64 = request.headers.get('x-auth-message-b64')
  const sigB64 = request.headers.get('x-auth-signature')
  if (!wallet || !msgB64 || !sigB64) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const message = Buffer.from(msgB64, 'base64').toString('utf8')
  const parsed = parseSessionsListMessage(message)
  if (!parsed || parsed.wallet !== wallet) {
    return Response.json({ error: 'Invalid auth message' }, { status: 401 })
  }
  if (!isTimestampFresh(parsed.timestampMs)) {
    return Response.json({ error: 'Stale timestamp' }, { status: 401 })
  }
  if (!verifySignedMessage(wallet, message, sigB64)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 })
  }
  return { wallet }
}

export function verifyRoastsFeedRequest(
  request: NextRequest,
  queryWallet: string | null,
): WalletVerifyOk | Response {
  const wallet = queryWallet?.trim() ?? ''
  if (!wallet) return { wallet: '' }

  try {
    // eslint-disable-next-line no-new
    new PublicKey(wallet)
  } catch {
    return Response.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const dev = getTrustedWalletDev(request)
  if (dev && dev !== wallet) {
    return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
  }

  return { wallet }
}

export function verifyProfileUpsertRequest(
  request: NextRequest,
  body: { wallet: string; displayName: string; nonce: string; signature: string },
): WalletVerifyOk | Response {
  const dev = getTrustedWalletDev(request)
  if (dev) {
    if (dev !== body.wallet.trim()) {
      return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
    }
    return { wallet: body.wallet.trim() }
  }
  const message = buildProfileAuthMessage(
    body.wallet.trim(),
    body.displayName.trim(),
    body.nonce,
  )
  if (!verifySignedMessage(body.wallet.trim(), message, body.signature)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 })
  }
  return { wallet: body.wallet.trim() }
}

export function verifySessionSaveRequest(
  bodySha256Hex: string,
  walletFromBody: string,
  signatureBase64: string | undefined,
  timestampMs: number | undefined,
  request: NextRequest,
): WalletVerifyOk | Response {
  const devWallet = getTrustedWalletDev(request)
  if (devWallet) {
    if (devWallet !== walletFromBody.trim()) {
      return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
    }
    return { wallet: devWallet }
  }

  if (!signatureBase64 || timestampMs === undefined) {
    return Response.json({ error: 'Missing signature' }, { status: 401 })
  }
  const message = buildSessionSaveMessageResolved(
    walletFromBody.trim(),
    timestampMs,
    bodySha256Hex,
  )
  const parsed = parseSessionSaveMessage(message)
  if (!parsed || parsed.wallet !== walletFromBody.trim()) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!isTimestampFresh(parsed.timestampMs)) {
    return Response.json({ error: 'Stale timestamp' }, { status: 401 })
  }
  if (parsed.bodySha256Hex !== bodySha256Hex) {
    return Response.json({ error: 'Body hash mismatch' }, { status: 400 })
  }
  if (!verifySignedMessage(walletFromBody.trim(), message, signatureBase64)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 })
  }
  return { wallet: walletFromBody.trim() }
}

function buildSessionSaveMessageResolved(
  wallet: string,
  timestampMs: number,
  bodySha256Hex: string,
): string {
  return `rizzlr session:save\nwallet:${wallet}\ntimestamp:${timestampMs}\nbody:${bodySha256Hex}`
}

export function verifyRoastLikeRequest(
  _roastId: string,
  request: NextRequest,
  body: { wallet: string; signature?: string; timestamp?: number },
): WalletVerifyOk | Response {
  const wallet = body.wallet.trim()
  try {
    // eslint-disable-next-line no-new
    new PublicKey(wallet)
  } catch {
    return Response.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const devWallet = getTrustedWalletDev(request)
  if (devWallet && devWallet !== wallet) {
    return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
  }

  return { wallet }
}

export function verifyChallengeCreateRequest(
  request: NextRequest,
  body: {
    challengeId: string
    wallet: string
    timestamp: number
    signature?: string
    personaId: string
    sessionSeed: string
    timeLimitSeconds: number
    creatorScore: number
    wagerType: string
    wagerLamports: number
  },
): WalletVerifyOk | Response {
  const dev = getTrustedWalletDev(request)
  if (dev) {
    const h = request.headers.get('x-wallet-address')?.trim()
    if (h && h !== body.wallet.trim()) {
      return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
    }
    return { wallet: body.wallet.trim() }
  }
  const sig = body.signature?.trim()
  if (!sig) {
    return Response.json({ error: 'Missing signature' }, { status: 401 })
  }
  const wagerType = body.wagerType === 'sol_escrow' ? 'sol_escrow' : 'free'
  const msg = buildChallengeCreateMessage({
    challengeId: body.challengeId,
    wallet: body.wallet.trim(),
    personaId: body.personaId,
    sessionSeed: body.sessionSeed,
    timeLimitSeconds: body.timeLimitSeconds,
    creatorScore: body.creatorScore,
    wagerType,
    wagerLamports: Math.max(0, Math.floor(Number(body.wagerLamports))),
    timestampMs: body.timestamp,
  })
  const parsed = parseChallengeCreateMessage(msg)
  if (!parsed || parsed.wallet !== body.wallet.trim()) {
    return Response.json({ error: 'Invalid auth message' }, { status: 401 })
  }
  if (!isTimestampFresh(parsed.timestampMs)) {
    return Response.json({ error: 'Stale timestamp' }, { status: 401 })
  }
  if (!verifySignedMessage(body.wallet.trim(), msg, sig)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 })
  }
  return { wallet: body.wallet.trim() }
}

export function verifyChallengeSubmitRequest(
  challengeId: string,
  request: NextRequest,
  body: {
    wallet: string
    timestamp: number
    signature?: string
    challengerScore: number
  },
): WalletVerifyOk | Response {
  const dev = getTrustedWalletDev(request)
  if (dev) {
    const h = request.headers.get('x-wallet-address')?.trim()
    if (h && h !== body.wallet.trim()) {
      return Response.json({ error: 'Wallet mismatch' }, { status: 403 })
    }
    return { wallet: body.wallet.trim() }
  }
  const sig = body.signature?.trim()
  if (!sig || body.timestamp === undefined) {
    return Response.json({ error: 'Missing signature' }, { status: 401 })
  }
  const msg = buildChallengeSubmitMessage(
    challengeId,
    body.wallet.trim(),
    body.challengerScore,
    body.timestamp,
  )
  const parsed = parseChallengeSubmitMessage(msg)
  if (
    !parsed ||
    parsed.wallet !== body.wallet.trim() ||
    parsed.challengeId !== challengeId
  ) {
    return Response.json({ error: 'Invalid auth message' }, { status: 401 })
  }
  if (!isTimestampFresh(parsed.timestampMs)) {
    return Response.json({ error: 'Stale timestamp' }, { status: 401 })
  }
  if (!verifySignedMessage(body.wallet.trim(), msg, sig)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 })
  }
  return { wallet: body.wallet.trim() }
}
