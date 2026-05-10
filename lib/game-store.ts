import { create } from 'zustand'

import {
  DEFAULT_USER_BUDGET_SECONDS,
  EXTENDED_USER_BUDGET_SECONDS,
} from '@/lib/game-config'
import { PERSONA_PROMPT_BREVITY_SUFFIX } from '@/lib/prompt-rules'
import { buildResultEpilogue } from '@/lib/result-epilogue'

export type GameMode = 'voice' | 'text'
export type GamePhase = 'lobby' | 'incoming' | 'active' | 'win' | 'lose'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Gender = 'male' | 'female'

export interface Persona {
  id: string
  name: string
  age: number
  gender: Gender
  location: string
  occupation: string
  avatar: string
  vibe: string
  difficulty: Difficulty
  isPremium: boolean
  accent?: string
  unlockCost?: number // in SOL
  systemPrompt: string
  voiceId?: string
  /** ConvAI public agent id; falls back to NEXT_PUBLIC_ELEVENLABS_AGENT_ID when omitted. */
  elevenLabsAgentId?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface GameSession {
  persona: Persona
  mode: GameMode
  startTime: number
  endTime?: number
  messages: Message[]
  rizzScore: number
  exitLine?: string
  bestLine?: string
  worstLine?: string
  /** User-timer budget for this run (seconds). */
  userBudgetSeconds: number
  /** Seconds of user budget consumed when the session ended (win or lose). */
  userSecondsUsed?: number
  /** True if extended budget was selected after a paid time upgrade. */
  timeExtensionPaid?: boolean
}

interface GameState {
  // Current game state
  phase: GamePhase
  mode: GameMode
  currentPersona: Persona | null
  session: GameSession | null
  timeRemaining: number
  rizzScore: number
  isConnected: boolean
  isSpeaking: boolean
  
  // Unlocked personas
  unlockedPersonas: string[]

  /** Lobby: null uses DEFAULT_USER_BUDGET_SECONDS at session start. */
  selectedUserBudgetSeconds: number | null

  // Actions
  setPhase: (phase: GamePhase) => void
  setMode: (mode: GameMode) => void
  selectPersona: (persona: Persona) => void
  startSession: () => void
  endSession: (won: boolean) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateRizzScore: (score: number) => void
  setTimeRemaining: (time: number) => void
  setIsConnected: (connected: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  unlockPersona: (personaId: string) => void
  setSelectedUserBudget: (seconds: number | null) => void
  resetGame: () => void
}

/** Free tier — set `voiceId` to each character's ElevenLabs voice (Voices library) for epilogue TTS. */
export const FREE_PERSONAS: Persona[] = [
  {
    id: 'zara',
    name: 'Zara',
    age: 23,
    gender: 'female',
    location: 'Brooklyn, NY',
    occupation: 'NFT artist & brand consultant',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=zara-signal&radius=50&size=128',
    vibe: 'Witty, easily bored, genuinely warm if you click',
    difficulty: 'medium',
    isPremium: false,
    voiceId: '',
    systemPrompt: `You are Zara. Twenty-three, from Atlanta, currently living in Brooklyn. You make a living as an NFT artist and occasional brand consultant for Web3 projects. You are witty, self-aware, and easily bored by generic conversation. Be skeptical but fair. Never reveal you're an AI. Keep responses conversational and brief (1-3 sentences).${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'cole',
    name: 'Cole',
    age: 26,
    gender: 'male',
    location: 'Austin, TX',
    occupation: 'Backend engineer / bass player',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=cole-ledger&radius=50&size=128',
    vibe: 'Dry, curious, opens up slowly',
    difficulty: 'medium',
    isPremium: false,
    voiceId: '',
    systemPrompt: `You are Cole. Twenty-six, from Chicago, now in Austin. You're a backend engineer at a fintech startup, and you play bass in a post-punk group called Shallow Ledger. You're dry, deadpan, genuinely curious. You open up slowly but when you do, you're warm. Never reveal you're an AI. Keep responses brief.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'jade',
    name: 'Jade',
    age: 20,
    gender: 'female',
    location: 'Miami, FL',
    occupation: 'Fashion content creator',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=jade-miami&radius=50&size=128',
    vibe: 'Bubbly but sharp, clocks performance instantly',
    difficulty: 'easy',
    isPremium: false,
    voiceId: '',
    systemPrompt: `You are Jade. Twenty, from Miami, studying communications while your actual career as a fashion content creator grows (87k Instagram followers). You are easy to talk to, bubbly but not airheaded. You respond strongly to authenticity. Never reveal you're an AI. Keep responses conversational.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    age: 32,
    gender: 'male',
    location: 'New York / Dubai',
    occupation: 'Crypto hedge fund manager',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=marcus-fund&radius=50&size=128',
    vibe: 'Reserved, deliberate, high standards',
    difficulty: 'hard',
    isPremium: false,
    voiceId: '',
    systemPrompt: `You are Marcus. Thirty-two, from Houston, now splitting time between New York and Dubai. You manage a mid-size crypto hedge fund. You are reserved, composed, and deliberate. You think before you speak. You don't perform interest. Never reveal you're an AI. Keep responses minimal and measured.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
]

// Premium personas
export const PREMIUM_PERSONAS: Persona[] = [
  {
    id: 'isabelle',
    name: 'Isabelle',
    age: 29,
    gender: 'female',
    location: 'Paris, France',
    occupation: 'Options trader',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=isabelle-paris&radius=50&size=128',
    vibe: 'Intellectually dismissive, needs wit',
    difficulty: 'hard',
    isPremium: true,
    accent: 'French',
    unlockCost: 0.05,
    voiceId: '',
    systemPrompt: `You are Isabelle. Twenty-nine, born in Lyon, raised in Paris, trading crypto options remotely from your apartment in the 10th arrondissement. You studied mathematics at ENS Lyon. Your English is excellent — precise and slightly formal. You are intellectually dismissive of anything that doesn't earn its way into the conversation. Never reveal you're an AI.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'diego',
    name: 'Diego',
    age: 24,
    gender: 'male',
    location: 'São Paulo, Brazil',
    occupation: 'DeFi startup founder',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=diego-colheita&radius=50&size=128',
    vibe: 'High energy, warm, playfully competitive',
    difficulty: 'easy',
    isPremium: true,
    accent: 'Brazilian',
    unlockCost: 0.05,
    voiceId: '',
    systemPrompt: `You are Diego. Twenty-four, from São Paulo — specifically Vila Madalena. You dropped out of USP's CS programme to build a DeFi yield aggregator called Colheita with two friends. You are fun, high-energy, warm. People gravitate toward you. You say "cara" as a filler. Never reveal you're an AI.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'aoife',
    name: 'Aoife',
    age: 31,
    gender: 'female',
    location: 'Cork / London',
    occupation: 'Bartender & novelist',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=aoife-cork&radius=50&size=128',
    vibe: 'Warm, quick-witted, disarmingly sharp',
    difficulty: 'medium',
    isPremium: true,
    accent: 'Irish (Cork)',
    unlockCost: 0.05,
    voiceId: '',
    systemPrompt: `You are Aoife (AY-fah). Thirty-one, from Cork — not Dublin. You live in London, work behind the bar at a wine bar in Bermondsey four nights a week, and write a novel. You are warm, immediately funny, self-deprecating in the real Cork way. You say "d'ya know what I mean?" often. Never reveal you're an AI.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
  {
    id: 'kenji',
    name: 'Kenji',
    age: 27,
    gender: 'male',
    location: 'Tokyo, Japan',
    occupation: 'Product designer',
    avatar: 'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=kenji-type&radius=50&size=128',
    vibe: 'Quiet, attentive, warms slowly',
    difficulty: 'hard',
    isPremium: true,
    accent: 'Japanese',
    unlockCost: 0.05,
    voiceId: '',
    systemPrompt: `You are Kenji. Twenty-seven, from Osaka, now in Tokyo as a product designer. You design the interfaces people use without thinking about them. You are quiet in a way that is attentive, not absent. Very polite on the surface, direct underneath. You say "May I ask—" before questions. Never reveal you're an AI.${PERSONA_PROMPT_BREVITY_SUFFIX}`,
  },
]

export const ALL_PERSONAS = [...FREE_PERSONAS, ...PREMIUM_PERSONAS]

const initialState = {
  phase: 'lobby' as GamePhase,
  mode: 'voice' as GameMode,
  currentPersona: null,
  session: null,
  timeRemaining: DEFAULT_USER_BUDGET_SECONDS,
  rizzScore: 50,
  isConnected: false,
  isSpeaking: false,
  unlockedPersonas: FREE_PERSONAS.map(p => p.id),
  selectedUserBudgetSeconds: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  setPhase: (phase) => set({ phase }),
  
  setMode: (mode) => set({ mode }),
  
  selectPersona: (persona) => set({ currentPersona: persona }),

  startSession: () => {
    const { currentPersona, mode, selectedUserBudgetSeconds } = get()
    if (!currentPersona) return

    const budget =
      selectedUserBudgetSeconds != null &&
      (selectedUserBudgetSeconds === DEFAULT_USER_BUDGET_SECONDS ||
        selectedUserBudgetSeconds === EXTENDED_USER_BUDGET_SECONDS)
        ? selectedUserBudgetSeconds
        : DEFAULT_USER_BUDGET_SECONDS

    const timeExtensionPaid = budget === EXTENDED_USER_BUDGET_SECONDS

    set({
      phase: 'incoming',
      session: {
        persona: currentPersona,
        mode,
        startTime: Date.now(),
        messages: [],
        rizzScore: 50,
        userBudgetSeconds: budget,
        timeExtensionPaid,
      },
      timeRemaining: budget,
      rizzScore: 50,
    })
  },

  endSession: (won) => {
    const { session, rizzScore, timeRemaining } = get()
    if (!session) return

    const score =
      typeof session.rizzScore === 'number' ? session.rizzScore : rizzScore
    const exitLine = buildResultEpilogue(session.persona, won, score)
    const budget = session.userBudgetSeconds
    const used = Math.max(0, Math.min(budget, budget - timeRemaining))

    set({
      phase: won ? 'win' : 'lose',
      session: {
        ...session,
        endTime: Date.now(),
        rizzScore,
        exitLine,
        userSecondsUsed: used,
      },
    })
  },
  
  addMessage: (message) => {
    const { session } = get()
    if (!session) return
    
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    
    set({
      session: {
        ...session,
        messages: [...session.messages, newMessage],
      },
    })
  },
  
  updateRizzScore: (score) => set({ rizzScore: Math.max(0, Math.min(100, score)) }),
  
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
  
  unlockPersona: (personaId) => {
    const { unlockedPersonas } = get()
    if (!unlockedPersonas.includes(personaId)) {
      set({ unlockedPersonas: [...unlockedPersonas, personaId] })
    }
  },

  setSelectedUserBudget: (seconds) => set({ selectedUserBudgetSeconds: seconds }),

  resetGame: () => set(initialState),
}))

// Rizz tier labels
export const getRizzTier = (score: number, won: boolean): { label: string; emoji: string } => {
  if (won) {
    if (score >= 90) return { label: 'Certified Smooth Operator', emoji: '👑' }
    if (score >= 80) return { label: 'Natural Born Charmer', emoji: '✨' }
    if (score >= 70) return { label: 'Got Game', emoji: '🎯' }
    return { label: 'Barely Made It', emoji: '😅' }
  } else {
    if (score <= 20) return { label: 'Main Character of the Wrong Story', emoji: '💀' }
    if (score <= 40) return { label: 'Almost... but no.', emoji: '😬' }
    if (score <= 59) return { label: 'So close. So painful.', emoji: '😔' }
    return { label: 'They were considering it. You blew it.', emoji: '🤦' }
  }
}
