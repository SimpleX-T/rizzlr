/**
 * CDN + browser caching for safe GET JSON routes (Vercel honors s-maxage per URL).
 * Keep TTLs short so challenge/profile/roasts data stays fresh enough without hammering DB.
 */
export function shortPublicCacheHeaders(
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds = Math.min(120, maxAgeSeconds * 10),
): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
  }
}
