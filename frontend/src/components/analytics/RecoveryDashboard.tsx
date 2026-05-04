import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, X } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ── Types ───────────────────────────────────────────────────────────────────

interface RecoveryScore {
  score: number
  label: string
  rest_days: number
  volume_spike: number
  nutrition_quality: number
  rpe_trend: number
  components: Record<string, number>
}

interface MuscleFatigueGroup {
  name: string
  fatigue_level: number
  last_trained: string | null
}

interface MuscleFatigue {
  muscle_groups: MuscleFatigueGroup[]
}

interface DeloadRecommendation {
  should_deload: boolean
  reason: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ringColor(score: number): string {
  if (score >= 70) return '#4ade80'   // green-400
  if (score >= 40) return '#facc15'   // yellow-400
  return '#f87171'                    // red-400
}

function fatigueColor(level: number): string {
  if (level < 40) return '#4ade80'
  if (level <= 70) return '#facc15'
  return '#f87171'
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const CIRCUMFERENCE = 2 * Math.PI * 54 // r=54 → ~339.3

// ── Sub-components ───────────────────────────────────────────────────────────

function RecoveryRing({ recovery }: { recovery: RecoveryScore }) {
  const { score, label, rest_days, volume_spike, nutrition_quality, rpe_trend } = recovery
  const stroke = ringColor(score)
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  const pills = [
    { label: 'Rest', value: `${rest_days}d` },
    { label: 'Volume', value: `${Math.round(volume_spike * 100)}%` },
    { label: 'Nutrition', value: `${Math.round(nutrition_quality * 100)}%` },
    { label: 'RPE', value: `${Math.round(rpe_trend * 10) / 10}` },
  ]

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary-400" />
        <h3 className="font-semibold text-text-primary text-sm">Recovery Score</h3>
      </div>

      {/* Ring */}
      <div className="flex justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            {/* Track */}
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-bg-tertiary"
            />
            {/* Progress */}
            <motion.circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text-primary leading-none">{score}</span>
            <span className="text-xs text-text-muted leading-none">/100</span>
            <span className="text-[10px] text-text-muted mt-1 text-center leading-tight px-2">{label}</span>
          </div>
        </div>
      </div>

      {/* Component pills */}
      <div className="grid grid-cols-4 gap-2">
        {pills.map(({ label: pillLabel, value }) => (
          <div key={pillLabel} className="flex flex-col items-center gap-1 bg-bg-tertiary rounded-xl px-2 py-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: stroke }}
            />
            <span className="text-xs font-semibold text-text-primary">{value}</span>
            <span className="text-[10px] text-text-muted">{pillLabel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MuscleFatigueGrid({ groups }: { groups: MuscleFatigueGroup[] }) {
  const displayNames: Record<string, string> = {
    chest: 'Chest', back: 'Back', shoulders: 'Shoulders', legs: 'Legs',
    arms: 'Arms', core: 'Core', glutes: 'Glutes', calves: 'Calves',
  }

  // Ensure we display all expected muscle groups, even if API returns fewer
  const expectedGroups = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves']
  const groupMap = new Map(groups.map(g => [g.name.toLowerCase(), g]))

  const displayGroups = expectedGroups.map(key => {
    const found = groupMap.get(key)
    return found ?? { name: key, fatigue_level: 0, last_trained: null }
  })

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <h3 className="font-semibold text-text-primary text-sm mb-3">Muscle Fatigue</h3>
      <div className="grid grid-cols-2 gap-2">
        {displayGroups.map(group => {
          const days = daysSince(group.last_trained)
          const color = fatigueColor(group.fatigue_level)
          const name = displayNames[group.name.toLowerCase()] ?? group.name

          return (
            <div
              key={group.name}
              className="bg-bg-tertiary rounded-xl px-3 py-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">{name}</span>
                <span className="text-xs font-semibold" style={{ color }}>{group.fatigue_level}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${group.fatigue_level}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
              {days !== null ? (
                <p className="text-[10px] text-text-muted">Last trained {days === 0 ? 'today' : `${days}d ago`}</p>
              ) : (
                <p className="text-[10px] text-text-disabled">Not recently trained</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DeloadBanner({ reason, onDismiss }: { reason: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-yellow-900/40 border border-yellow-400/30 rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-400 mb-1">
            ⚠️ Deload Week Recommended
          </p>
          <p className="text-xs text-text-muted leading-relaxed">{reason}</p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss deload banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function RecoverySkeleton() {
  return (
    <div className="space-y-4 mb-4">
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="flex justify-center">
          <div className="skeleton w-32 h-32 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      </div>
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RecoveryDashboard() {

  const [recovery, setRecovery] = useState<RecoveryScore | null>(null)
  const [fatigue, setFatigue] = useState<MuscleFatigue | null>(null)
  const [deload, setDeload] = useState<DeloadRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [deloadDismissed, setDeloadDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [recoveryRes, fatigueRes, deloadRes] = await Promise.allSettled([
          api.get('/progress/recovery-score'),
          api.get('/progress/muscle-fatigue'),
          api.get('/progress/should-deload'),
        ])

        if (cancelled) return

        if (recoveryRes.status === 'fulfilled') setRecovery(recoveryRes.value.data)
        if (fatigueRes.status === 'fulfilled') setFatigue(fatigueRes.value.data)
        if (deloadRes.status === 'fulfilled') setDeload(deloadRes.value.data)

        if (recoveryRes.status === 'rejected' && fatigueRes.status === 'rejected') {
          toast.error('Failed to load recovery data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <RecoverySkeleton />

  if (!recovery && !fatigue) return null

  return (
    <div className="space-y-4 mb-4">
      {/* Deload banner */}
      <AnimatePresence>
        {deload?.should_deload && !deloadDismissed && (
          <DeloadBanner
            reason={deload.reason}
            onDismiss={() => setDeloadDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* Recovery ring */}
      {recovery && <RecoveryRing recovery={recovery} />}

      {/* Muscle fatigue grid */}
      {fatigue && <MuscleFatigueGrid groups={fatigue.muscle_groups} />}
    </div>
  )
}
