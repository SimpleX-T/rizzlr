import { NextRequest, NextResponse } from 'next/server'

import { runDailyPotCloseForUtcDate } from '@/lib/daily-pot-close'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

function yesterdayUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Vercel / manual cron: Authorization Bearer CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')?.trim()
  const ok =
    process.env.NODE_ENV === 'development' ||
    (secret && auth === `Bearer ${secret}`)
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const potDate =
    request.nextUrl.searchParams.get('date')?.trim() ?? yesterdayUtc()
  try {
    const result = await runDailyPotCloseForUtcDate(getSupabaseAdmin(), potDate)
    return NextResponse.json({ potDate, ...result })
  } catch (e) {
    console.error('[cron daily-pot-close]', e)
    return NextResponse.json({ error: 'Close failed' }, { status: 500 })
  }
}
