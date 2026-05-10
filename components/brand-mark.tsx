'use client'

import { buildDicebearBrandMarkPngUrl } from '@/lib/dicebear'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

const SEEDS = [
  'rizzlr',
  'rizzlr-volt',
  'rizzlr-midnight',
  'rizzlr-signal',
  'rizzlr-pulse',
  'rizzlr-neon',
  'rizzlr-chrome',
  'rizzlr-ghost',
]

function pickRandomSeed(exclude: string): string {
  const pool = SEEDS.filter((s) => s !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] ?? SEEDS[0]!
}

export function BrandMark() {
  const [seed, setSeed] = useState('rizzlr')
  const seedRef = useRef(seed)
  seedRef.current = seed

  const advance = useCallback(() => {
    const next = pickRandomSeed(seedRef.current)
    const url = buildDicebearBrandMarkPngUrl(next, 40)
    const img = new Image()
    img.onload = () => setSeed(next)
    img.onerror = () => setSeed(next)
    img.src = url
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      advance()
    }, 4200 + Math.random() * 2200)
    return () => window.clearInterval(id)
  }, [advance])

  const src = buildDicebearBrandMarkPngUrl(seed, 40)

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
      <AnimatePresence mode="sync" initial={false}>
        <motion.img
          key={src}
          src={src}
          alt=""
          width={36}
          height={36}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
    </div>
  )
}
