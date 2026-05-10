'use client'

import Script from 'next/script'
import { createElement, useEffect, useState } from 'react'

/**
 * Official ElevenLabs embed widget (public agent, allowlisted domain).
 * @see https://elevenlabs.io/docs/eleven-agents/customization/widget
 */
export function ElevenLabsConvaiWidget() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  if (!agentId) {
    return null
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
      />
      {mounted
        ? createElement('elevenlabs-convai', {
            'agent-id': agentId,
            dismissible: 'true',
          })
        : null}
    </>
  )
}
