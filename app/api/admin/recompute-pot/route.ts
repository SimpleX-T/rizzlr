import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { runDailyPotCloseForUtcDate } from '@/lib/daily-pot-close'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  const jar = await cookies()
  if (!secret || !verifyAdminSession(secret, jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }
  let body: { potDate?: string }
  try {
    body = (await request.json()) as { potDate?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const potDate = body.potDate?.trim()
  if (!potDate || !/^\d{4}-\d{2}-\d{2}$/.test(potDate)) {
    return NextResponse.json({ error: 'potDate required' }, { status: 400 })
  }
  try {
    const result = await runDailyPotCloseForUtcDate(getSupabaseAdmin(), potDate)
    return NextResponse.json({ potDate, ...result })
  } catch (e) {
    console.error('[admin recompute]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
