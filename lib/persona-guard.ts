import { ALL_PERSONAS } from '@/lib/game-store'

export function isValidPersonaId(id: string): boolean {
  return ALL_PERSONAS.some((p) => p.id === id)
}
