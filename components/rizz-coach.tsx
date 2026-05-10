'use client'

import { useGameStore, Message } from '@/lib/game-store'
import { cn } from '@/lib/utils'
import { Sparkles, CheckCircle, XCircle, Lightbulb, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'

interface RizzCoachProps {
  onClose: () => void
}

interface CoachFeedback {
  didRight: string[]
  wentWrong: string[]
  betterLine: string
}

// Analyze conversation and generate coaching feedback
function analyzeConversation(messages: Message[], rizzScore: number): CoachFeedback {
  const userMessages = messages.filter(m => m.role === 'user')
  const aiMessages = messages.filter(m => m.role === 'assistant')
  
  const didRight: string[] = []
  const wentWrong: string[] = []
  
  // Analyze patterns in user messages
  const hasQuestions = userMessages.some(m => m.content.includes('?'))
  const hasHumor = userMessages.some(m => 
    m.content.toLowerCase().includes('haha') || 
    m.content.toLowerCase().includes('lol') ||
    m.content.includes('😂')
  )
  const hasCompliments = userMessages.some(m => 
    m.content.toLowerCase().includes('beautiful') ||
    m.content.toLowerCase().includes('pretty') ||
    m.content.toLowerCase().includes('cute') ||
    m.content.toLowerCase().includes('amazing')
  )
  const tooShort = userMessages.filter(m => m.content.length < 10).length > userMessages.length / 2
  const tooGeneric = userMessages.some(m => 
    m.content.toLowerCase().includes('hey') && m.content.length < 15
  )

  // Build feedback
  if (hasQuestions) {
    didRight.push('You asked questions - shows genuine interest')
  }
  if (hasHumor) {
    didRight.push('You brought humor into the conversation')
  }
  if (!tooShort && userMessages.length > 0) {
    didRight.push('Your responses had substance')
  }
  if (rizzScore >= 50) {
    didRight.push('You maintained a decent vibe overall')
  }

  if (tooShort) {
    wentWrong.push('Too many short responses - elaborate more')
  }
  if (tooGeneric) {
    wentWrong.push('Opening was too generic - be more creative')
  }
  if (hasCompliments && rizzScore < 50) {
    wentWrong.push('Compliments felt forced - build rapport first')
  }
  if (!hasQuestions) {
    wentWrong.push('You didn\'t ask enough questions')
  }
  if (userMessages.length < 3) {
    wentWrong.push('Conversation was too short to build connection')
  }

  // Default feedback if lists are empty
  if (didRight.length === 0) {
    didRight.push('You took the call - that takes courage!')
  }
  if (wentWrong.length === 0 && rizzScore < 70) {
    wentWrong.push('Try to be more engaging and specific')
  }

  // Generate a better line suggestion
  const betterLines = [
    "Instead of generic openers, try: 'I noticed you like [hobby] - what got you into that?'",
    "When things get awkward, pivot with: 'Okay real talk - worst date story, go.'",
    "To show genuine interest: 'That's actually interesting - what made you think of it that way?'",
    "To recover from a cold response: 'Alright fair, I walked into that one. Let me try again...'",
    "To build rapport: 'I have a theory about you... want to hear it?'",
  ]
  
  const betterLine = betterLines[Math.floor(Math.random() * betterLines.length)]

  return { didRight, wentWrong, betterLine }
}

export function RizzCoach({ onClose }: RizzCoachProps) {
  const { session, rizzScore } = useGameStore()
  
  const feedback = useMemo(() => {
    if (!session) return null
    return analyzeConversation(session.messages, rizzScore)
  }, [session, rizzScore])

  if (!session || !feedback) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'color-mix(in oklch, var(--bg) 96%, black)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Rizz Coach</h3>
              <p className="text-xs text-muted-foreground">Post-game analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* What you did right */}
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-success mb-3">
            <CheckCircle className="w-4 h-4" />
            What You Did Right
          </h4>
          <ul className="space-y-2">
            {feedback.didRight.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span className="text-success mt-1">+</span>
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* What went wrong */}
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive mb-3">
            <XCircle className="w-4 h-4" />
            Where It Went Wrong
          </h4>
          <ul className="space-y-2">
            {feedback.wentWrong.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span className="text-destructive mt-1">-</span>
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Better line suggestion */}
        <div className="bg-accent/10 rounded-xl p-4 mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-accent mb-2">
            <Lightbulb className="w-4 h-4" />
            Try This Next Time
          </h4>
          <p className="text-sm text-foreground italic">{feedback.betterLine}</p>
        </div>

        {/* Close button */}
        <Button onClick={onClose} className="w-full" variant="outline">
          Got It
        </Button>
      </motion.div>
    </motion.div>
  )
}
