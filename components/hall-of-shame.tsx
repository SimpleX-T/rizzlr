'use client'

import type { RoastFeedItem } from '@/lib/rizz-api'
import { fetchRoastsFeed, likeRoast } from '@/lib/rizz-api'
import { cn } from '@/lib/utils'
import { Skull, ThumbsUp, Clock, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

interface HallOfShameProps {
  onClose?: () => void
  wallet?: string | null
}

export function HallOfShame({
  onClose,
  wallet,
}: HallOfShameProps) {
  const [roasts, setRoasts] = useState<RoastFeedItem[]>([])
  const [sortBy, setSortBy] = useState<'top' | 'recent'>('top')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchRoastsFeed({
        sort: sortBy,
        wallet: wallet ?? undefined,
      })
      setRoasts(data)
    } finally {
      setLoading(false)
    }
  }, [sortBy, wallet])

  useEffect(() => {
    void load()
  }, [load])

  const handleUpvote = async (row: RoastFeedItem) => {
    if (!wallet || row.liked) return
    const prev = roasts
    setRoasts((r) =>
      r.map((x) =>
        x.id === row.id
          ? { ...x, liked: true, likeCount: x.likeCount + 1 }
          : x,
      ),
    )
    const ok = await likeRoast({
      roastId: row.id,
      wallet,
    })
    if (!ok) setRoasts(prev)
  }

  const formatTimeAgo = (iso: string) => {
    const t = new Date(iso).getTime()
    const minutes = Math.floor((Date.now() - t) / 1000 / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const shellStyle: CSSProperties = {
    background: [
      `radial-gradient(ellipse 90% 55% at 100% -15%, color-mix(in oklch, var(--danger) 30%, transparent), transparent 52%)`,
      `radial-gradient(ellipse 70% 45% at 0% 105%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 50%)`,
      `linear-gradient(180deg, color-mix(in oklch, var(--surface) 40%, var(--bg)) 0%, var(--bg) 38%)`,
    ].join(', '),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] overflow-hidden flex flex-col"
      style={shellStyle}
    >
      <div
        className="flex-shrink-0 px-4 pt-7 pb-5 border-b"
        style={{
          borderColor: "color-mix(in oklch, var(--danger) 35%, var(--border))",
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--danger) 12%, transparent) 0%, transparent 65%)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="shrink-0 w-11 h-11 flex items-center justify-center"
              >
                <Skull className="w-5 h-5" style={{ color: "var(--danger)" }} />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-xl tracking-wide"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text)",
                  }}
                >
                  HALL OF SHAME
                </h2>
                <p
                  className="text-xs"
                  style={{
                    color: "var(--muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  The most brutal exits
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
                style={{
                  background:
                    "color-mix(in oklch, var(--surface-strong) 90%, transparent)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--muted)",
                }}
                aria-label="Close Hall of Shame"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSortBy("top")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklch,var(--surface-strong)_50%,transparent)]",
              )}
              style={{
                fontFamily: "var(--font-body)",
                ...(sortBy === "top"
                  ? {
                      background:
                        "color-mix(in oklch, var(--danger) 35%, var(--surface-strong))",
                      color: "var(--text)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--muted)",
                    }),
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Top
            </button>
            <button
              type="button"
              onClick={() => setSortBy("recent")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklch,var(--surface-strong)_50%,transparent)]",
              )}
              style={{
                fontFamily: "var(--font-body)",
                ...(sortBy === "recent"
                  ? {
                      background:
                        "color-mix(in oklch, var(--danger) 35%, var(--surface-strong))",
                      color: "var(--text)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--muted)",
                    }),
              }}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {loading && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        )}
        {!loading && roasts.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No roasts yet — lose spectacularly and your exit line might show up
            here.
          </p>
        )}
        {roasts.map((roast, index) => (
          <motion.div
            key={roast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border p-4"
            style={{
              borderColor:
                "color-mix(in oklch, var(--danger) 28%, var(--border-soft))",
              background:
                "linear-gradient(145deg, color-mix(in oklch, var(--surface-strong) 92%, transparent), color-mix(in oklch, var(--danger) 6%, transparent))",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div
                    className="rounded-full p-[2px]"
                    style={{
                      background:
                        "linear-gradient(145deg, var(--danger), color-mix(in oklch, var(--accent) 60%, var(--danger)))",
                    }}
                  >
                    <img
                      src={roast.personaAvatar ?? ""}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-[var(--surface)]"
                      style={{ border: "2px solid var(--bg)" }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--text)",
                      }}
                    >
                      {roast.personaName}
                    </span>
                    <span
                      className="text-[10px] uppercase tabular-nums"
                      style={{
                        color: "var(--faint)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {formatTimeAgo(roast.createdAt)}
                    </span>
                  </div>
                  <p
                    className="italic text-sm leading-relaxed"
                    style={{
                      color: "var(--text)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    &quot;{roast.exitLine}&quot;
                  </p>
                  {(roast.playerDisplayName || roast.playerWalletShort) && (
                    <div className="flex items-center gap-2 mt-3">
                      {roast.playerAvatarUrl && (
                        <img
                          src={roast.playerAvatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                          style={{ border: "1px solid var(--border-soft)" }}
                        />
                      )}
                      <span
                        className="text-[10px] uppercase tracking-wider truncate"
                        style={{
                          color: "var(--faint)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {roast.playerDisplayName ?? roast.playerWalletShort}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={!wallet || roast.liked}
                onClick={() => void handleUpvote(roast)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-40"
                style={{
                  background: roast.liked
                    ? "color-mix(in oklch, var(--danger) 22%, transparent)"
                    : "color-mix(in oklch, var(--surface-strong) 85%, transparent)",
                  border: `1px solid ${roast.liked ? "color-mix(in oklch, var(--danger) 45%, transparent)" : "var(--border-soft)"}`,
                }}
              >
                <ThumbsUp
                  className="w-4 h-4"
                  style={{
                    color: roast.liked ? "var(--danger)" : "var(--muted)",
                  }}
                />
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text)",
                  }}
                >
                  {roast.likeCount}
                </span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
