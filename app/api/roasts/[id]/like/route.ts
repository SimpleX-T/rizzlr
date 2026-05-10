import { NextRequest, NextResponse } from 'next/server'

import { verifyRoastLikeRequest } from '@/lib/server-wallet-request'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const { id: roastId } = await ctx.params
  if (!roastId) {
    return NextResponse.json({ error: 'Missing roast id' }, { status: 400 })
  }

  let body: { wallet?: string; signature?: string; timestamp?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = body.wallet?.trim()
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const verified = verifyRoastLikeRequest(roastId, request, {
    wallet,
    signature: body.signature,
    timestamp: body.timestamp,
  })
  if (verified instanceof Response) return verified

  const supabase = getSupabaseAdmin()

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', verified.wallet)
    .maybeSingle()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Profile required' }, { status: 400 })
  }

  const { error } = await supabase.from('roast_likes').insert({
    user_id: user.id,
    roast_id: roastId,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    console.error('[roast like]', error)
    return NextResponse.json({ error: 'Like failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
