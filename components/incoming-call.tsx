'use client'

import { Persona } from '@/lib/game-store'
import type { ConversationStatus } from '@elevenlabs/react'
import { PhoneOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect } from 'react'

interface IncomingCallProps {
  persona: Persona
  voiceStatus: ConversationStatus
  onDecline: () => void | Promise<void>
}

export function IncomingCall({ persona, voiceStatus, onDecline }: IncomingCallProps) {
  useRingtone()

  const statusLine =
    voiceStatus === 'connecting'
      ? 'connecting…'
      : voiceStatus === 'connected'
        ? 'connected'
        : 'calling…'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center px-8 z-50"
      style={{ background: 'var(--bg)' }}
    >
      <div className="relative mb-8">
        <div className="absolute inset-0 -m-6">
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'color-mix(in oklch, var(--accent) 22%, transparent)',
            }}
          />
        </div>

        <div
          className="relative w-24 h-24 rounded-full overflow-hidden"
          style={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
            boxShadow:
              '0 0 0 8px color-mix(in oklch, var(--surface) 52%, transparent)',
          }}
        >
          <img
            src={persona.avatar}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="text-center mb-2">
        <h2
          className="text-3xl tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          {persona.name.toUpperCase()}
        </h2>
        {persona.accent && (
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
          >
            {persona.accent}
          </p>
        )}
      </div>

      <p
        className="text-xs uppercase tracking-[0.22em] mb-2"
        style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
      >
        outgoing call
      </p>
      <p
        className="text-[10px] uppercase tracking-widest mb-12"
        style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
      >
        {statusLine}
      </p>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => void onDecline()}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{
            background: 'var(--danger)',
            boxShadow:
              '0 12px 32px color-mix(in oklch, var(--danger) 28%, transparent)',
          }}
          aria-label="Cancel call"
        >
          <PhoneOff className="w-7 h-7" style={{ color: 'var(--text)' }} />
        </button>
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
        >
          cancel
        </span>
      </div>
    </motion.div>
  )
}

function useRingtone() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextCtor) return

    const audioContext = new AudioContextCtor()
    const gain = audioContext.createGain()
    gain.gain.value = 0
    gain.connect(audioContext.destination)

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const ring = () => {
      if (stopped) return

      const oscA = audioContext.createOscillator()
      const oscB = audioContext.createOscillator()
      oscA.frequency.value = 440
      oscB.frequency.value = 480
      oscA.type = 'sine'
      oscB.type = 'sine'
      oscA.connect(gain)
      oscB.connect(gain)

      const now = audioContext.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.04)
      gain.gain.setValueAtTime(0.035, now + 1.8)
      gain.gain.linearRampToValueAtTime(0, now + 2)

      oscA.start(now)
      oscB.start(now)
      oscA.stop(now + 2)
      oscB.stop(now + 2)

      timeoutId = setTimeout(ring, 3000)
    }

    void audioContext.resume().then(ring).catch(() => undefined)

    return () => {
      stopped = true
      if (timeoutId) clearTimeout(timeoutId)
      gain.disconnect()
      void audioContext.close().catch(() => undefined)
    }
  }, [])
}
