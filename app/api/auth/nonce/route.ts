import { NextRequest, NextResponse } from 'next/server'

import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabase/admin'

const NONCE_TTL_MS = 10 * 60 * 1000

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  if (!wallet) {
    return NextResponse.json({ error: 'wallet query required' }, { status: 400 })
  }

  const nonce = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString()

  const supabase = getSupabaseAdmin()
  await supabase.from('auth_nonces').delete().lt('expires_at', new Date().toISOString())

  const { error } = await supabase.from('auth_nonces').insert({
    nonce,
    wallet_address: wallet,
    expires_at: expiresAt,
  })

  if (error) {
    console.error('[nonce]', error)
    return NextResponse.json({ error: 'Failed to issue nonce' }, { status: 500 })
  }

  return NextResponse.json({
    nonce,
    expiresAt,
  })
}
