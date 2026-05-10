import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

import { FREE_PERSONAS } from '@/lib/game-store'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { unlockedPersonaIds: FREE_PERSONAS.map((p) => p.id) },
      { status: 200 },
    )
  }

  const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }
  try {
    // eslint-disable-next-line no-new
    new PublicKey(wallet)
  } catch {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('persona_unlocks')
    .select('persona_id')
    .eq('wallet_address', wallet)

  if (error) {
    console.error('[entitlements]', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  const premiumIds = (data ?? []).map((r) => r.persona_id as string)
  const merged = [
    ...new Set([...FREE_PERSONAS.map((p) => p.id), ...premiumIds]),
  ]
  return NextResponse.json({ unlockedPersonaIds: merged })
}
