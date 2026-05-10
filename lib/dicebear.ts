/**
 * Dicebear adventurer-neutral — same style as persona avatars in `lib/game-store.ts`.
 * User PFP uses `seed = wallet address` (stable across renames if you only use wallet).
 */
export function buildDicebearAvatarUrl(seed: string, size = 128): string {
  const params = new URLSearchParams({
    seed,
    radius: '50',
    size: String(size),
  })
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?${params.toString()}`
}

/** App favicon: deterministic branding (PNG for broad client support). */
export function buildDicebearFaviconUrl(): string {
  return buildDicebearBrandMarkPngUrl('rizzlr', 64)
}

/** PNG avatar for header brand mark (random seeds supported). */
export function buildDicebearBrandMarkPngUrl(seed: string, size = 40): string {
  const params = new URLSearchParams({
    seed,
    radius: '50',
    size: String(size),
  })
  return `https://api.dicebear.com/9.x/adventurer-neutral/png?${params.toString()}`
}
