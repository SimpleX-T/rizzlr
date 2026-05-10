import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key?.trim()) {
    return NextResponse.json({ error: 'TTS unavailable' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rec = body as { text?: unknown; voiceId?: unknown }
  const text = typeof rec.text === 'string' ? rec.text.trim() : ''
  const voiceId = typeof rec.voiceId === 'string' ? rec.voiceId.trim() : ''

  if (!text || !voiceId) {
    return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 })
  }
  if (text.length > 2500) {
    return NextResponse.json({ error: 'Text too long' }, { status: 400 })
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
      }),
    }
  )

  if (!upstream.ok) {
    const errSlice = await upstream.text().catch(() => '')
    console.warn('[tts]', upstream.status, errSlice.slice(0, 200))
    return NextResponse.json({ error: 'Upstream TTS failed' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
