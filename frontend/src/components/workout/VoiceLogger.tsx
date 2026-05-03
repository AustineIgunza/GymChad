import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Check, X, RotateCcw, Loader2 } from 'lucide-react'
import { useVoiceLogger } from '../../hooks/useVoiceLogger'
import { useToast } from '../../stores/uiStore'
import { Button } from '../ui/Button'
import api from '../../services/api'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ParsedSet {
  exercise_name: string
  weight_kg: number
  reps: number
  rpe?: number | null
  set_type?: string
  confidence: number
  needs_clarification: boolean
  clarification_prompt?: string | null
}

interface ParseResponse {
  exercise_name: string
  weight_kg: number
  reps: number
  rpe?: number | null
  set_type?: string
  confidence: number
  needs_clarification: boolean
  clarification_prompt?: string | null
}

export interface VoiceLoggerProps {
  onSetParsed: (set: ParsedSet) => void
  context?: {
    exercise_name?: string
    last_weight?: number
    last_reps?: number
  }
}

// ── State machine ──────────────────────────────────────────────────────────────
type Phase = 'idle' | 'listening' | 'processing' | 'confirmation'

// ── Component ──────────────────────────────────────────────────────────────────
export function VoiceLogger({ onSetParsed, context }: VoiceLoggerProps) {
  const toast = useToast()
  const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceLogger()

  const [phase, setPhase] = useState<Phase>('idle')
  const [parsedSet, setParsedSet] = useState<ParsedSet | null>(null)
  const [clarificationText, setClarificationText] = useState('')
  const finalTranscriptRef = useRef('')

  // When speech recognition finishes (isListening drops to false while we're in listening phase)
  useEffect(() => {
    if (phase === 'listening' && !isListening && finalTranscriptRef.current) {
      parseTranscript(finalTranscriptRef.current)
    }
  }, [isListening, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track the latest transcript
  useEffect(() => {
    if (transcript) {
      finalTranscriptRef.current = transcript
    }
  }, [transcript])

  const parseTranscript = async (text: string) => {
    if (!text.trim()) {
      setPhase('idle')
      return
    }
    setPhase('processing')
    try {
      const { data } = await api.post<ParseResponse>('/voice/parse-set', {
        transcript: text,
        context,
      })
      setParsedSet(data)
      setClarificationText('')
      setPhase('confirmation')
    } catch {
      toast.error('Could not parse your set. Please try again.')
      setPhase('idle')
    }
  }

  const handleMicPress = () => {
    if (phase !== 'idle') return
    finalTranscriptRef.current = ''
    startListening()
    setPhase('listening')
  }

  const handleStopListening = () => {
    stopListening()
    // The useEffect above will fire once isListening becomes false
  }

  const handleLogSet = () => {
    if (!parsedSet) return
    onSetParsed(parsedSet)
    setPhase('idle')
    setParsedSet(null)
  }

  const handleTryAgain = () => {
    setParsedSet(null)
    setPhase('idle')
  }

  const handleClarificationSubmit = async () => {
    if (!clarificationText.trim()) return
    await parseTranscript(clarificationText)
  }

  // Not supported fallback
  if (!isSupported) {
    return (
      <div className="fixed bottom-8 right-6 z-50 bg-bg-card border border-border rounded-2xl px-4 py-3 shadow-lg max-w-xs text-center">
        <MicOff className="w-5 h-5 text-text-muted mx-auto mb-1" />
        <p className="text-xs text-text-muted">Voice logging not supported in this browser</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Mic Button ── */}
      <AnimatePresence>
        {(phase === 'idle' || phase === 'listening') && (
          <motion.button
            key="mic-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={
              phase === 'listening'
                ? { scale: [1, 1.15, 1], backgroundColor: ['#ef4444', '#ef4444'] }
                : { scale: 1, opacity: 1 }
            }
            exit={{ scale: 0.8, opacity: 0 }}
            transition={
              phase === 'listening'
                ? { scale: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.2 } }
                : { duration: 0.2 }
            }
            onClick={phase === 'idle' ? handleMicPress : handleStopListening}
            className={[
              'fixed bottom-8 right-6 z-50',
              'w-16 h-16 rounded-full shadow-lg',
              'flex items-center justify-center',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              phase === 'listening'
                ? 'bg-red-500 focus:ring-red-500'
                : 'bg-primary-700 hover:bg-primary-600 focus:ring-primary-700',
            ].join(' ')}
            aria-label={phase === 'listening' ? 'Stop listening' : 'Start voice logging'}
          >
            {phase === 'listening' ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Listening label + interim transcript card ── */}
      <AnimatePresence>
        {phase === 'listening' && (
          <motion.div
            key="listening-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-6 z-50 bg-bg-card border border-border rounded-2xl px-4 py-3 shadow-lg max-w-xs w-64"
          >
            <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
              Listening...
            </p>
            {transcript ? (
              <p className="text-sm text-text-primary leading-snug">{transcript}</p>
            ) : (
              <p className="text-sm text-text-muted italic">Say your set aloud…</p>
            )}
            <p className="text-xs text-text-muted mt-2">Tap mic to stop</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Processing indicator ── */}
      <AnimatePresence>
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 right-6 z-50 bg-bg-card border border-border rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            <span className="text-sm text-text-primary font-medium">Parsing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation card (slide up from bottom) ── */}
      <AnimatePresence>
        {phase === 'confirmation' && parsedSet && (
          <motion.div
            key="confirmation"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 md:max-w-sm md:right-6 md:left-auto md:bottom-6 md:rounded-2xl md:border"
          >
            {/* Handle bar for mobile */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 md:hidden" />

            {parsedSet.needs_clarification ? (
              /* ── Clarification mode ── */
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-primary">Needs clarification</p>
                <p className="text-sm text-text-muted">
                  {parsedSet.clarification_prompt ?? 'Could you clarify your set?'}
                </p>
                <input
                  type="text"
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClarificationSubmit()}
                  placeholder="e.g. 80 kg bench press, 8 reps"
                  className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-700/50"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleClarificationSubmit} className="flex-1">
                    <Check className="w-4 h-4" /> Submit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleTryAgain}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Normal confirmation ── */
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-text-muted uppercase tracking-wider">Log this set?</p>
                  {parsedSet.confidence < 0.7 && (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                      Low confidence
                    </span>
                  )}
                </div>

                <div className="bg-bg-secondary rounded-xl px-4 py-3 space-y-1">
                  <p className="text-base font-bold text-text-primary">{parsedSet.exercise_name}</p>
                  <p className="text-sm text-text-muted">
                    {parsedSet.weight_kg} kg × {parsedSet.reps} reps
                    {parsedSet.rpe != null ? ` · RPE ${parsedSet.rpe}` : ''}
                    {parsedSet.set_type && parsedSet.set_type !== 'normal' ? ` · ${parsedSet.set_type}` : ''}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="md" onClick={handleLogSet} className="flex-1">
                    <Check className="w-4 h-4" /> Log Set
                  </Button>
                  <Button variant="ghost" size="md" onClick={handleTryAgain}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
