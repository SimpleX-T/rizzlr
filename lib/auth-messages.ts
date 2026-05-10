export const AUTH_MAX_SKEW_MS = 5 * 60 * 1000

export function buildProfileAuthMessage(
  wallet: string,
  displayName: string,
  nonce: string,
): string {
  return `rizzlr profile:upsert\nwallet:${wallet}\ndisplayName:${displayName}\nnonce:${nonce}`
}

export function buildSessionsListMessage(wallet: string, timestampMs: number): string {
  return `rizzlr sessions:list\nwallet:${wallet}\ntimestamp:${timestampMs}`
}

export function parseSessionsListMessage(message: string): {
  wallet: string
  timestampMs: number
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr sessions:list') return null
  let wallet = ''
  let ts = NaN
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx)
    const val = line.slice(idx + 1)
    if (key === 'wallet') wallet = val
    if (key === 'timestamp') ts = Number(val)
  }
  if (!wallet || !Number.isFinite(ts)) return null
  return { wallet, timestampMs: ts }
}

export function buildRoastsFeedMessage(wallet: string, timestampMs: number): string {
  return `rizzlr roasts:feed\nwallet:${wallet}\ntimestamp:${timestampMs}`
}

export function parseRoastsFeedMessage(message: string): {
  wallet: string
  timestampMs: number
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr roasts:feed') return null
  let wallet = ''
  let ts = NaN
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx)
    const val = line.slice(idx + 1)
    if (key === 'wallet') wallet = val
    if (key === 'timestamp') ts = Number(val)
  }
  if (!wallet || !Number.isFinite(ts)) return null
  return { wallet, timestampMs: ts }
}

export function buildRoastLikeMessage(roastId: string, wallet: string, timestampMs: number): string {
  return `rizzlr roast:like\nroastId:${roastId}\nwallet:${wallet}\ntimestamp:${timestampMs}`
}

export function parseRoastLikeMessage(message: string): {
  roastId: string
  wallet: string
  timestampMs: number
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr roast:like') return null
  let roastId = ''
  let wallet = ''
  let ts = NaN
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx)
    const val = line.slice(idx + 1)
    if (key === 'roastId') roastId = val
    if (key === 'wallet') wallet = val
    if (key === 'timestamp') ts = Number(val)
  }
  if (!roastId || !wallet || !Number.isFinite(ts)) return null
  return { roastId, wallet, timestampMs: ts }
}

export function buildSessionSaveMessage(
  wallet: string,
  timestampMs: number,
  bodySha256Hex: string,
): string {
  return `rizzlr session:save\nwallet:${wallet}\ntimestamp:${timestampMs}\nbody:${bodySha256Hex}`
}

export function parseSessionSaveMessage(message: string): {
  wallet: string
  timestampMs: number
  bodySha256Hex: string
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr session:save') return null
  let wallet = ''
  let ts = NaN
  let body = ''
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx)
    const val = line.slice(idx + 1)
    if (key === 'wallet') wallet = val
    if (key === 'timestamp') ts = Number(val)
    if (key === 'body') body = val
  }
  if (!wallet || !Number.isFinite(ts) || !body) return null
  return { wallet, timestampMs: ts, bodySha256Hex: body }
}

export function isTimestampFresh(ts: number, now = Date.now()): boolean {
  return Math.abs(now - ts) <= AUTH_MAX_SKEW_MS
}

export function buildChallengeCreateMessage(fields: {
  challengeId: string
  wallet: string
  personaId: string
  sessionSeed: string
  timeLimitSeconds: number
  creatorScore: number
  wagerType: 'free' | 'sol_escrow'
  wagerLamports: number
  timestampMs: number
}): string {
  return [
    'rizzlr challenge:create',
    `challengeId:${fields.challengeId}`,
    `wallet:${fields.wallet}`,
    `personaId:${fields.personaId}`,
    `sessionSeed:${fields.sessionSeed}`,
    `timeLimitSeconds:${fields.timeLimitSeconds}`,
    `creatorScore:${fields.creatorScore}`,
    `wagerType:${fields.wagerType}`,
    `wagerLamports:${fields.wagerLamports}`,
    `timestamp:${fields.timestampMs}`,
  ].join('\n')
}

export function parseChallengeCreateMessage(message: string): {
  challengeId: string
  wallet: string
  personaId: string
  sessionSeed: string
  timeLimitSeconds: number
  creatorScore: number
  wagerType: 'free' | 'sol_escrow'
  wagerLamports: number
  timestampMs: number
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr challenge:create') return null
  const map: Record<string, string> = {}
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    map[line.slice(0, idx)] = line.slice(idx + 1)
  }
  const wagerType = map.wagerType === 'sol_escrow' ? 'sol_escrow' : 'free'
  const wl = Number(map.wagerLamports)
  const ts = Number(map.timestamp)
  const tls = Number(map.timeLimitSeconds)
  const cs = Number(map.creatorScore)
  if (
    !map.challengeId ||
    !map.wallet ||
    !map.personaId ||
    !map.sessionSeed ||
    !Number.isFinite(tls) ||
    !Number.isFinite(cs) ||
    !Number.isFinite(ts) ||
    !Number.isFinite(wl)
  ) {
    return null
  }
  return {
    challengeId: map.challengeId,
    wallet: map.wallet,
    personaId: map.personaId,
    sessionSeed: map.sessionSeed,
    timeLimitSeconds: tls,
    creatorScore: cs,
    wagerType,
    wagerLamports: Math.max(0, Math.floor(wl)),
    timestampMs: ts,
  }
}

export function buildChallengeSubmitMessage(
  challengeId: string,
  wallet: string,
  challengerScore: number,
  timestampMs: number,
): string {
  return [
    'rizzlr challenge:submit',
    `challengeId:${challengeId}`,
    `wallet:${wallet}`,
    `challengerScore:${challengerScore}`,
    `timestamp:${timestampMs}`,
  ].join('\n')
}

export function parseChallengeSubmitMessage(message: string): {
  challengeId: string
  wallet: string
  challengerScore: number
  timestampMs: number
} | null {
  const lines = message.split('\n')
  if (lines[0] !== 'rizzlr challenge:submit') return null
  const map: Record<string, string> = {}
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    map[line.slice(0, idx)] = line.slice(idx + 1)
  }
  const cs = Number(map.challengerScore)
  const ts = Number(map.timestamp)
  if (
    !map.challengeId ||
    !map.wallet ||
    !Number.isFinite(cs) ||
    !Number.isFinite(ts)
  ) {
    return null
  }
  return {
    challengeId: map.challengeId,
    wallet: map.wallet,
    challengerScore: cs,
    timestampMs: ts,
  }
}
