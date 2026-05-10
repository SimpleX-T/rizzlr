import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  computeTopWinnersForUtcDay,
  sumTreasuryPotLamports,
} from '@/lib/daily-pot-close'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { potLamports: 0, entries: [] },
      { status: 200 },
    )
  }

  const potDate =
    request.nextUrl.searchParams.get('date')?.trim() ?? utcToday()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(potDate)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const potLamports = await sumTreasuryPotLamports(supabase, potDate)
  const winners = await computeTopWinnersForUtcDay(supabase, potDate, 10)

  const { data: users } =
    winners.length === 0
      ? { data: [] as { wallet_address: string; display_name: string; avatar_url: string }[] }
      : await supabase
          .from('users')
          .select('wallet_address, display_name, avatar_url')
          .in(
            'wallet_address',
            winners.map((w) => w.wallet),
          )

  const meta = new Map(
    (users ?? []).map((u) => [
      u.wallet_address as string,
      {
        displayName: u.display_name as string,
        avatarUrl: u.avatar_url as string,
      },
    ]),
  )

  return NextResponse.json({
    potDate,
    potLamports: potLamports.toString(),
    entries: winners.map((w, i) => ({
      rank: i + 1,
      wallet: w.wallet,
      composite: w.composite,
      score: w.bestScore,
      displayName: meta.get(w.wallet)?.displayName ?? null,
      avatarUrl: meta.get(w.wallet)?.avatarUrl ?? null,
    })),
  })
}

function utcToday(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
