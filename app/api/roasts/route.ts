import { NextRequest, NextResponse } from 'next/server'

import { ALL_PERSONAS } from '@/lib/game-store'
import { verifyRoastsFeedRequest } from '@/lib/server-wallet-request'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured' },
      { status: 503 },
    )
  }

  const sort = request.nextUrl.searchParams.get('sort') ?? 'top'
  const walletParam = request.nextUrl.searchParams.get('wallet')

  const verified = verifyRoastsFeedRequest(request, walletParam)
  if (verified instanceof Response) return verified

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('roast_entries')
    .select('id, persona_id, exit_line, like_count, created_at, user_id')
    .limit(80)

  if (sort === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('like_count', { ascending: false }).order('created_at', {
      ascending: false,
    })
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[roasts GET]', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const list = rows ?? []
  const userIds = [
    ...new Set(
      list.map((r) => r.user_id).filter((id): id is string => Boolean(id)),
    ),
  ]

  let userMap = new Map<
    string,
    { display_name: string; avatar_url: string; wallet_address: string }
  >()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, wallet_address')
      .in('id', userIds)

    userMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        {
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          wallet_address: u.wallet_address,
        },
      ]),
    )
  }

  let likedIds = new Set<string>()
  if (verified.wallet) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', verified.wallet)
      .maybeSingle()

    if (user) {
      const ids = list.map((r) => r.id)
      if (ids.length > 0) {
        const { data: likes } = await supabase
          .from('roast_likes')
          .select('roast_id')
          .eq('user_id', user.id)
          .in('roast_id', ids)

        likedIds = new Set((likes ?? []).map((l) => l.roast_id))
      }
    }
  }

  const enriched = list.map((row) => {
    const personaMeta = ALL_PERSONAS.find((p) => p.id === row.persona_id)
    const u = row.user_id ? userMap.get(row.user_id) : undefined
    return {
      id: row.id,
      personaId: row.persona_id,
      personaName: personaMeta?.name ?? row.persona_id,
      personaAvatar: personaMeta?.avatar,
      exitLine: row.exit_line,
      likeCount: row.like_count,
      createdAt: row.created_at,
      liked: likedIds.has(row.id),
      playerDisplayName: u?.display_name ?? null,
      playerAvatarUrl: u?.avatar_url ?? null,
      playerWalletShort: u?.wallet_address
        ? `${u.wallet_address.slice(0, 4)}…${u.wallet_address.slice(-4)}`
        : null,
    }
  })

  return NextResponse.json({ roasts: enriched })
}
