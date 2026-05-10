import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { ADMIN_COOKIE, signAdminSession } from '@/lib/admin-session'

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!secret || !password) {
    return NextResponse.json(
      { error: 'Admin not configured (ADMIN_PASSWORD + ADMIN_SESSION_SECRET)' },
      { status: 503 },
    )
  }

  let body: { password?: string }
  try {
    body = (await request.json()) as { password?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.password !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = signAdminSession(secret)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 3600,
  })
  return res
}
