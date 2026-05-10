import { NextRequest, NextResponse } from 'next/server'

import { buildDicebearAvatarUrl } from '@/lib/dicebear'
import {
  getTrustedWalletDev,
  verifyProfileUpsertRequest,
} from '@/lib/server-wallet-request'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

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

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('wallet_address, display_name, avatar_url, created_at')
    .eq('wallet_address', wallet)
    .maybeSingle()

  if (error) {
    console.error('[profile GET]', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(null, { status: 404 })
  }

  return NextResponse.json({
    wallet: data.wallet_address,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  let body: {
    wallet?: string
    displayName?: string
    nonce?: string
    signature?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = body.wallet?.trim()
  const displayName = body.displayName?.trim()
  const nonce = body.nonce?.trim()
  const signature = body.signature?.trim() ?? ''

  if (!wallet || !displayName || !nonce) {
    return NextResponse.json({ error: 'wallet, displayName, nonce required' }, { status: 400 })
  }
  if (displayName.length < 2 || displayName.length > 32) {
    return NextResponse.json({ error: 'displayName length 2–32' }, { status: 400 })
  }

  const verified = verifyProfileUpsertRequest(request, {
    wallet,
    displayName,
    nonce,
    signature,
  })
  if (verified instanceof Response) return verified

  const supabase = getSupabaseAdmin()

  if (!getTrustedWalletDev(request)) {
    const { data: nonceRow, error: nonceErr } = await supabase
      .from('auth_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .eq('wallet_address', wallet)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (nonceErr || !nonceRow) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 })
    }

    await supabase.from('auth_nonces').delete().eq('nonce', nonce)
  }

  const avatarUrl = buildDicebearAvatarUrl(wallet)

  const { data: upserted, error } = await supabase
    .from('users')
    .upsert(
      {
        wallet_address: wallet,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: 'wallet_address' },
    )
    .select('wallet_address, display_name, avatar_url')
    .single()

  if (error) {
    console.error('[profile POST]', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  return NextResponse.json({
    wallet: upserted.wallet_address,
    displayName: upserted.display_name,
    avatarUrl: upserted.avatar_url,
  })
}
