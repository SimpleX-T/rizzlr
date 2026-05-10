import { NextResponse } from 'next/server'

import { buildDicebearFaviconUrl } from '@/lib/dicebear'

export function GET() {
  return NextResponse.redirect(buildDicebearFaviconUrl(), 302)
}
