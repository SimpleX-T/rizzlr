import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'rizzlr_admin'

export function signAdminSession(secret: string): string {
  const exp = Date.now() + 8 * 3600 * 1000
  const body = String(exp)
  const sig = createHmac('sha256', secret).update(body).digest('hex')
  return `${body}.${sig}`
}

export function verifyAdminSession(
  secret: string,
  token: string | undefined,
): boolean {
  if (!secret || !token) return false
  const i = token.indexOf('.')
  if (i <= 0 || i === token.length - 1) return false
  const body = token.slice(0, i)
  const sig = token.slice(i + 1)
  const exp = Number(body)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  if (expected.length !== sig.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}
