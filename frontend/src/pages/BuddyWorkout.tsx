import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Users, Wifi, WifiOff, Loader2, X } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useBuddySession, type PartnerSet } from '../hooks/useBuddySession'
import api from '../services/api'

// ── Types ──────────────────────────────────────────────────────────────────────
interface SessionInfo {
  session_id: string
  code: string
  host_user_id: string
  partner_user_id: string | null
}

interface FloatingReaction {
  id: string
  emoji: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function relativeTime(tsMs: number): string {
  const diff = Math.floor((Date.now() - tsMs) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const REACTION_EMOJIS = ['💪', '🔥', '👏', '😅']

// ── Sub-components ─────────────────────────────────────────────────────────────
function PartnerSetCard({ set }: { set: PartnerSet }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg-secondary border border-border"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{set.exercise_name}</p>
        <p className="text-xs text-text-muted">
          {set.weight_kg} kg × {set.reps} reps{set.rpe != null ? ` · RPE ${set.rpe}` : ''}
        </p>
      </div>
      <span className="text-xs text-text-muted ml-2 shrink-0">{relativeTime(set.timestamp)}</span>
    </motion.div>
  )
}

function FloatingEmoji({ reaction }: { reaction: FloatingReaction }) {
  return (
    <motion.div
      key={reaction.id}
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -120, scale: 1.4 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
      className="fixed bottom-32 right-8 text-5xl pointer-events-none select-none z-50"
      style={{ zIndex: 9999 }}
    >
      {reaction.emoji}
    </motion.div>
  )
}

// ── Landing Mode ───────────────────────────────────────────────────────────────
interface LandingProps {
  onSessionReady: (info: SessionInfo) => void
}

function LandingView({ onSessionReady }: LandingProps) {
  const [hosting, setHosting] = useState(false)
  const [hostedCode, setHostedCode] = useState<string | null>(null)
  const [hostedSessionId, setHostedSessionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  // Poll for partner joining when hosting
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hostedSessionId) return
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<SessionInfo>(`/buddy/session/${hostedSessionId}`)
        if (data.partner_user_id) {
          clearInterval(pollRef.current!)
          onSessionReady(data)
        }
      } catch {
        // ignore poll errors
      }
    }, 2500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hostedSessionId, onSessionReady])

  const handleHost = async () => {
    setHosting(true)
    try {
      const { data } = await api.post<SessionInfo>('/buddy/create')
      setHostedCode(data.code)
      setHostedSessionId(data.session_id)
    } catch {
      toast.error('Failed to create session. Please try again.')
    } finally {
      setHosting(false)
    }
  }

  const handleCopy = () => {
    if (!hostedCode) return
    navigator.clipboard.writeText(hostedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      toast.error('Please enter a 6-character code.')
      return
    }
    setJoining(true)
    try {
      const { data } = await api.post<SessionInfo>(`/buddy/join/${code}`)
      onSessionReady(data)
    } catch {
      toast.error('Could not join session. Check the code and try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="px-4 md:px-8 pb-8 space-y-6">
      {/* Explainer */}
      <p className="text-text-muted text-sm text-center">
        Work out together in real-time. Your sets appear on your partner's screen instantly.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Host Card */}
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-700/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="font-semibold text-text-primary">Host a Session</h2>
          </div>

          {!hostedCode ? (
            <Button onClick={handleHost} loading={hosting} fullWidth size="lg">
              Create Session
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Big code display */}
              <div className="text-center">
                <p className="text-xs text-text-muted mb-1 uppercase tracking-widest">Your Code</p>
                <p className="font-mono text-4xl font-bold text-primary-400 tracking-widest">
                  {hostedCode}
                </p>
              </div>
              <Button onClick={handleCopy} variant="secondary" fullWidth size="sm">
                {copied ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Code</>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for partner...</span>
              </div>
            </div>
          )}
        </Card>

        {/* Join Card */}
        <Card padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-700/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="font-semibold text-text-primary">Join a Session</h2>
          </div>

          <Input
            label="Partner's Code"
            placeholder="ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            className="font-mono uppercase tracking-widest text-center text-lg"
            maxLength={6}
          />
          <Button
            onClick={handleJoin}
            loading={joining}
            disabled={joinCode.trim().length !== 6}
            fullWidth
            size="lg"
          >
            Join Session
          </Button>
        </Card>
      </div>
    </div>
  )
}

// ── Active Session Mode ────────────────────────────────────────────────────────
interface ActiveSessionProps {
  sessionInfo: SessionInfo
  userId: string
  onEnd: () => void
}

function ActiveSessionView({ sessionInfo, userId, onEnd }: ActiveSessionProps) {
  const [ending, setEnding] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  // myExercise / myLastSet would be driven by the parent workout in a full integration
  const [myExercise] = useState('—')
  const [myLastSet] = useState<{ weight_kg: number; reps: number } | null>(null)
  const partnerInitial = 'P' // placeholder — no partner name from API response

  const handleReactionReceived = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2)
    setFloatingReactions((prev) => [...prev, { id, emoji }])
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id))
    }, 2000)
  }, [])

  const { partnerSets, partnerExercise, isConnected, sendReaction, sendWorkoutEnded, disconnect } =
    useBuddySession({
      sessionId: sessionInfo.session_id,
      userId,
      onReaction: handleReactionReceived,
    })

  const handleSendReaction = (emoji: string) => {
    sendReaction(emoji)
  }

  const handleEndSession = async () => {
    setEnding(true)
    try {
      sendWorkoutEnded()
      await api.post(`/buddy/session/${sessionInfo.session_id}/end`)
    } catch {
      toast.error('Could not end session cleanly.')
    } finally {
      disconnect()
      onEnd()
    }
  }

  return (
    <div className="px-4 md:px-8 pb-8 flex flex-col gap-0 min-h-[calc(100vh-200px)]">
      {/* ── YOUR side ── */}
      <Card padding="lg" className="rounded-b-none border-b-0 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary-400" />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">You</span>
        </div>
        <p className="text-lg font-bold text-text-primary">{myExercise}</p>
        {myLastSet ? (
          <p className="text-text-muted text-sm mt-1">
            Last: {myLastSet.weight_kg} kg × {myLastSet.reps} reps
          </p>
        ) : (
          <p className="text-text-muted text-sm mt-1">No sets logged yet this session</p>
        )}
      </Card>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-bg-tertiary border-x border-border">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-primary-700/30 flex items-center justify-center text-xs font-bold text-primary-400">
            {partnerInitial}
          </div>
          <span className="text-sm text-text-muted">Partner</span>
          {partnerExercise && (
            <span className="text-xs text-text-muted">· {partnerExercise}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <WifiOff className="w-3.5 h-3.5 text-text-muted" />
            </>
          )}
        </div>
      </div>

      {/* ── PARTNER side ── */}
      <Card padding="lg" className="rounded-t-none border-t-0 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Partner's Feed</span>
        </div>

        {partnerSets.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            {isConnected ? 'Waiting for partner to log a set...' : 'Connecting...'}
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {partnerSets.map((set, i) => (
                <PartnerSetCard key={`${set.timestamp}-${i}`} set={set} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* ── Reaction Bar ── */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {REACTION_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.85 }}
            onClick={() => handleSendReaction(emoji)}
            className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl bg-bg-card border border-border hover:border-primary-700/40 transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      {/* ── End Session ── */}
      <div className="mt-4">
        <Button
          variant="danger"
          fullWidth
          onClick={handleEndSession}
          loading={ending}
        >
          <X className="w-4 h-4" />
          End Session
        </Button>
      </div>

      {/* ── Floating Emoji Overlay ── */}
      <AnimatePresence>
        {floatingReactions.map((r) => (
          <FloatingEmoji key={r.id} reaction={r} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function BuddyWorkoutPage() {
  const { user } = useAuthStore()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)

  const handleSessionReady = useCallback((info: SessionInfo) => {
    setSessionInfo(info)
  }, [])

  const handleEnd = useCallback(() => {
    setSessionInfo(null)
  }, [])

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Gym Buddy"
        subtitle={sessionInfo ? 'Live session active' : 'Train together in real-time'}
        back={!!sessionInfo}
      />

      <AnimatePresence mode="wait">
        {!sessionInfo ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <LandingView onSessionReady={handleSessionReady} />
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveSessionView
              sessionInfo={sessionInfo}
              userId={user?.id ?? ''}
              onEnd={handleEnd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BuddyWorkoutPage
