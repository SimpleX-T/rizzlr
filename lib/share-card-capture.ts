'use client'

/** Export a DOM subtree as PNG for social sharing (X / save file). */
export async function captureElementAsPng(el: HTMLElement): Promise<Blob | null> {
  try {
    const { toPng } = await import('html-to-image')
    const bg =
      getComputedStyle(document.documentElement).backgroundColor || '#09090b'
    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: bg.includes('oklch') ? '#09090b' : bg,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } catch {
    return null
  }
}

export function shareBlobFilename(kind: 'win' | 'loss' | 'replay'): string {
  const base = 'rizzlr-share'
  if (kind === 'replay') return `${base}-replay.png`
  return kind === 'win' ? `${base}-w.png` : `${base}-l.png`
}
