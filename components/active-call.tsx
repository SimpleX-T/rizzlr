'use client'

import { ROUND_SECONDS } from '@/lib/game-config'
import { Message, useGameStore } from '@/lib/game-store'
import { getRizzConnectionLabel, RizzConnectionStatus } from '@/lib/elevenlabs-status'
import { cn } from '@/lib/utils'
import { Mic, MicOff, PhoneOff, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'


interface ActiveCallProps {
  onHangUp: () => void
  onTimeUp: () => void
  onSendMessage: (text: string) => void
  isAISpeaking: boolean
  messages: Message[]
  connectionStatus: RizzConnectionStatus
  isMuted: boolean
  setMuted: (muted: boolean) => void
  inputMode: 'voice' | 'text'
  onInputModeVoice: () => void
  onTextInputFocus: () => void
  agentLiveCaption: string
  /** Live assistant text not yet flushed to `messages` (shown in thread). */
  streamingAssistantText: string
  callDurationSeconds: number
}

export function ActiveCall({
  onHangUp,
  onTimeUp,
  onSendMessage,
  isAISpeaking,
  messages,
  connectionStatus,
  isMuted,
  setMuted,
  inputMode,
  onInputModeVoice,
  onTextInputFocus,
  agentLiveCaption,
  streamingAssistantText,
  callDurationSeconds,
}: ActiveCallProps) {
  const { currentPersona, timeRemaining, setTimeRemaining } = useGameStore()
  const [inputValue, setInputValue] = useState('')
  const onTimeUpRef = useRef(onTimeUp)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  onTimeUpRef.current = onTimeUp

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return
    const timer = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeRemaining, setTimeRemaining])

  // Fire onTimeUp when timer hits zero
  useEffect(() => {
    if (timeRemaining === 0) {
      onTimeUpRef.current()
    }
  }, [timeRemaining])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingAssistantText, agentLiveCaption])

  const handleSend = useCallback(() => {
    const message = inputValue.trim()
    if (!message) return
    onSendMessage(message)
    setInputValue('')
  }, [inputValue, onSendMessage])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  if (!currentPersona) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isLow = timeRemaining <= 20
  const progress = timeRemaining / ROUND_SECONDS
  const voiceLive = connectionStatus === 'connected'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className=" flex flex-col z-50 overflow-hidden h-screen w-screen"
    >

      {/* Top bar: persona + timer */}
      <div
        className="relative z-10 shrink-0 px-5 pt-10 pb-4"
        style={{
          borderBottom: '1px solid var(--border-soft)',
          background: 'color-mix(in oklch, var(--bg) 90%, transparent)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Persona identity */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full overflow-hidden shrink-0"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-strong)' }}
            >
              <img
                src={currentPersona.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p
                className="text-[9px] uppercase tracking-[0.2em] mb-1"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
              >
                on the line
              </p>
              <p
                className="text-lg"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '0.08em' }}
              >
                {currentPersona.name.toUpperCase()}
              </p>
              {currentPersona.accent && (
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                >
                  {currentPersona.accent}
                </p>
              )}
              <p
                className="text-[9px] uppercase tracking-[0.14em] mt-1"
                style={{
                  color: getConnectionColor(connectionStatus),
                  fontFamily: 'var(--font-body)',
                }}
              >
                {getRizzConnectionLabel(connectionStatus)}
              </p>
            </div>
          </div>

          {/* Countdown + call duration */}
          <div className="text-right">
            <p
              className={cn('text-4xl tabular-nums transition-colors duration-500')}
              style={{
                fontFamily: 'var(--font-display)',
                color: isLow ? 'var(--danger)' : 'var(--text)',
                letterSpacing: '0.04em',
              }}
            >
              {formatTime(timeRemaining)}
            </p>
            <p
              className="text-[9px] uppercase tracking-[0.18em] mt-0.5"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              remaining
            </p>
            {voiceLive && (
              <p
                className="text-[10px] tabular-nums mt-2"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
              >
                call {formatTime(callDurationSeconds)}
              </p>
            )}
          </div>
        </div>

        {messages.length === 0 && agentLiveCaption.trim() ? (
          <div
            className="max-w-xl mx-auto mt-3 px-1 py-2 rounded-lg text-sm leading-snug"
            style={{
              background: 'color-mix(in oklch, var(--surface-strong) 70%, transparent)',
              border: '1px solid var(--border-soft)',
              color: 'var(--muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span
              className="text-[9px] uppercase tracking-widest block mb-1"
              style={{ color: 'var(--faint)' }}
            >
              {currentPersona.name}
            </span>
            {agentLiveCaption}
          </div>
        ) : null}

        {/* Time progress bar */}
        <div
          className="max-w-xl mx-auto mt-4 h-1 overflow-hidden rounded-full"
          style={{ background: 'color-mix(in oklch, var(--border) 74%, transparent)' }}
        >
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            className="h-full"
            style={{ background: isLow ? 'var(--danger)' : 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 py-6">
        <div
          className={cn(
            'max-w-xl mx-auto min-h-full flex flex-col',
            messages.length === 0 && !streamingAssistantText.trim()
              ? 'justify-center'
              : 'justify-end'
          )}
        >
          {messages.length === 0 && !streamingAssistantText.trim() ? (
            <div className="text-center py-10">
              <div
                className="w-36 h-36 mx-auto mb-7 rounded-full overflow-hidden"
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 0 0 10px color-mix(in oklch, var(--surface) 55%, transparent)',
                }}
              >
                <img
                  src={currentPersona.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <p
                className="text-[10px] uppercase tracking-[0.24em] mb-3"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
              >
                connected
              </p>
              <h2
                className="text-4xl tracking-widest mb-4"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
              >
                {currentPersona.name.toUpperCase()}
              </h2>
              <p
                className="max-w-sm mx-auto text-sm leading-relaxed"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
              >
                Start the call with a line. The conversation will appear here.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>
          )}
          {streamingAssistantText.trim() ? (
            <div className="flex justify-start mb-3">
              <div
                className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background:
                    'color-mix(in oklch, var(--surface-strong) 82%, transparent)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-soft)',
                  borderBottomLeftRadius: 4,
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span
                  className="text-[9px] uppercase tracking-widest block mb-1"
                  style={{ color: 'var(--faint)' }}
                >
                  {currentPersona.name}
                </span>
                {streamingAssistantText}
              </div>
            </div>
          ) : null}
          {isAISpeaking && (
            <div className="flex justify-start mb-3 items-center gap-2">
              <div
                className="px-3.5 py-2 rounded-2xl text-xs flex items-center gap-2"
                style={{
                  background: 'color-mix(in oklch, var(--surface-strong) 78%, transparent)',
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--accent)' }}
                />
                {currentPersona.name} is speaking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom: mic toggle + text input + send + hang up */}
      <div
        className="relative z-10 shrink-0 px-5 pb-8 pt-4"
        style={{
          borderTop: '1px solid var(--border-soft)',
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {/* Mic mute toggle */}
          <button
            type="button"
            onClick={() => {
              if (inputMode === 'text') {
                onInputModeVoice()
              } else {
                setMuted(!isMuted)
              }
            }}
            disabled={!voiceLive}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 shrink-0 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{
              background: isMuted
                ? 'color-mix(in oklch, var(--danger) 18%, var(--surface-strong))'
                : 'color-mix(in oklch, var(--accent) 14%, var(--surface-strong))',
              border: isMuted
                ? '1px solid color-mix(in oklch, var(--danger) 40%, transparent)'
                : '1px solid color-mix(in oklch, var(--accent) 30%, var(--border))',
              boxShadow: !isMuted
                ? '0 0 0 0 color-mix(in oklch, var(--accent) 0%, transparent)'
                : 'none',
            }}
            aria-label={
              inputMode === 'text'
                ? 'Switch to voice'
                : isMuted
                  ? 'Unmute microphone'
                  : 'Mute microphone'
            }
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" style={{ color: 'var(--danger)' }} />
            ) : (
              <Mic className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onFocus={onTextInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Or type your line..."
            className="flex-1 h-[52px] min-h-[52px] px-4 text-base focus:outline-none"
            style={{
              background: 'color-mix(in oklch, var(--surface-strong) 82%, transparent)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-body)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 shrink-0"
            style={{
              background: 'var(--accent)',
              boxShadow: inputValue.trim()
                ? '0 10px 28px color-mix(in oklch, var(--accent) 28%, transparent)'
                : 'none',
            }}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </button>
          <button
            onClick={onHangUp}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 shrink-0"
            style={{
              background: 'var(--danger)',
              boxShadow: '0 10px 28px color-mix(in oklch, var(--danger) 26%, transparent)',
            }}
            aria-label="Hang up"
          >
            <PhoneOff className="w-5 h-5" style={{ color: 'var(--text)' }} />
          </button>
        </div>

        {/* Mic status label */}
        <div className="max-w-xl mx-auto mt-2.5 flex items-center gap-2">
          <span
            className="text-[9px] uppercase tracking-[0.18em]"
            style={{
              color: !voiceLive ? 'var(--faint)' : isMuted ? 'var(--danger)' : 'var(--faint)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {!voiceLive
              ? 'voice unavailable — text only'
              : inputMode === 'text'
                ? 'text mode — mic capture paused'
                : isMuted
                  ? 'voice mode — mic off'
                  : 'voice mode — mic on'}
          </span>
          {voiceLive && inputMode === 'voice' && !isMuted && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </div>
      </div>

    </motion.div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn('flex mb-3', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
        style={{
          background: isUser
            ? 'var(--accent)'
            : 'color-mix(in oklch, var(--surface-strong) 82%, transparent)',
          color: 'var(--text)',
          border: isUser ? '1px solid color-mix(in oklch, var(--accent) 70%, white)' : '1px solid var(--border-soft)',
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          fontFamily: 'var(--font-body)',
        }}
      >
        {message.content}
      </div>
    </motion.div>
  )
}

function getConnectionColor(status: RizzConnectionStatus): string {
  if (status === 'connected') return 'var(--chain)'
  if (status === 'connecting') return 'var(--accent)'
  if (status === 'missing-agent' || status === 'disconnected') return 'var(--muted)'
  return 'var(--danger)'
}
