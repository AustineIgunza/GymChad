import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Zap, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Types ───────────────────────────────────────────────────────────────────

interface PreWorkoutBrief {
  brief: string
  carbs_target: number
  protein_target: number
  timing: string
}

interface ReadinessScore {
  score: number
  label: string
  reason: string
}

interface PostWorkoutPush {
  push: string
  protein_priority: number
}

export interface NutritionIntelligenceProps {
  context: 'pre-workout' | 'post-workout' | 'daily'
  workoutId?: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readinessColor(score: number): { ring: string; bg: string; text: string } {
  if (score >= 70) return { ring: '#4ade80', bg: 'bg-green-900/20', text: 'text-green-400' }
  if (score >= 40) return { ring: '#facc15', bg: 'bg-yellow-900/20', text: 'text-yellow-400' }
  return { ring: '#f87171', bg: 'bg-red-900/20', text: 'text-red-400' }
}

// ── Expand/collapse animation ─────────────────────────────────────────────

const expandVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ── Pre-Workout Variant ───────────────────────────────────────────────────

function PreWorkoutCard({ data }: { data: PreWorkoutBrief }) {
  const [expanded, setExpanded] = useState(false)
  const { brief, carbs_target, protein_target, timing } = data

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/30 rounded-2xl p-4 transition-all hover:border-cyan-600/50"
      aria-expanded={expanded}
    >
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cyan-400 mb-0.5">Pre-Workout Fuel</p>
          <p className="text-sm text-text-primary font-medium leading-snug truncate">
            Eat {timing} · {carbs_target}g carbs · {protein_target}g protein
          </p>
        </div>
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="pre-expand"
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              {/* Macro targets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Timing', val: timing },
                  { label: 'Carbs', val: `${carbs_target}g` },
                  { label: 'Protein', val: `${protein_target}g` },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-bg-primary/40 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-bold text-text-primary">{val}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {/* Brief text */}
              <p className="text-xs text-text-muted leading-relaxed">{brief}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

// ── Post-Workout Variant ──────────────────────────────────────────────────

function PostWorkoutCard({ data }: { data: PostWorkoutPush }) {
  const [expanded, setExpanded] = useState(false)
  const { push, protein_priority } = data

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-700/30 rounded-2xl p-4 transition-all hover:border-green-600/50"
      aria-expanded={expanded}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-400 mb-0.5">Post-Workout Recovery</p>
          <p className="text-sm text-text-primary font-medium leading-snug truncate">
            Priority: {protein_priority}g protein ASAP
          </p>
        </div>
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="post-expand"
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <div className="bg-bg-primary/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{protein_priority}g</p>
                <p className="text-xs text-text-muted">Protein target</p>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{push}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

// ── Daily Variant ─────────────────────────────────────────────────────────

function DailyCard({ data }: { data: ReadinessScore }) {
  const [expanded, setExpanded] = useState(false)
  const { score, label, reason } = data
  const colors = readinessColor(score)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left bg-gradient-to-r from-purple-900/40 to-violet-900/40 border border-purple-700/30 rounded-2xl p-4 transition-all hover:border-purple-600/50"
      aria-expanded={expanded}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-purple-400 mb-0.5">Nutrition Readiness</p>
          <div className="flex items-center gap-2">
            {/* Score badge */}
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${colors.bg} ${colors.text}`}
            >
              {score}
            </span>
            <p className="text-sm text-text-primary font-medium leading-snug truncate">{label}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="daily-expand"
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              {/* Large score circle */}
              <div className="flex justify-center">
                <div
                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 ${colors.bg}`}
                  style={{ borderColor: colors.ring }}
                >
                  <span className="text-xl font-bold" style={{ color: colors.ring }}>{score}</span>
                  <span className="text-[10px] text-text-muted">/100</span>
                </div>
              </div>
              <p className="text-xs text-text-muted leading-relaxed text-center">{reason}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────

function IntelligenceSkeleton() {
  return <div className="skeleton h-16 rounded-2xl mb-4" />
}

// ── Main Component ────────────────────────────────────────────────────────

export function NutritionIntelligence({ context, workoutId }: NutritionIntelligenceProps) {

  const [loading, setLoading] = useState(true)
  const [preWorkout, setPreWorkout] = useState<PreWorkoutBrief | null>(null)
  const [postWorkout, setPostWorkout] = useState<PostWorkoutPush | null>(null)
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (context === 'pre-workout') {
        const res = await api.get('/nutrition/pre-workout-brief')
        setPreWorkout(res.data)
      } else if (context === 'post-workout') {
        if (!workoutId) { setLoading(false); return }
        const res = await api.get(`/nutrition/post-workout-push/${workoutId}`)
        setPostWorkout(res.data)
      } else {
        // daily
        const res = await api.get('/nutrition/readiness-score')
        setReadiness(res.data)
      }
    } catch {
      toast.error('Failed to load nutrition insights')
    } finally {
      setLoading(false)
    }
  }, [context, workoutId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <IntelligenceSkeleton />

  if (context === 'pre-workout' && preWorkout) {
    return <div className="mb-4"><PreWorkoutCard data={preWorkout} /></div>
  }

  if (context === 'post-workout' && postWorkout) {
    return <div className="mb-4"><PostWorkoutCard data={postWorkout} /></div>
  }

  if (context === 'daily' && readiness) {
    return <div className="mb-4"><DailyCard data={readiness} /></div>
  }

  // Nothing to show (API error already toasted, or missing workoutId)
  return null
}
