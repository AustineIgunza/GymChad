import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Clock, Dumbbell, Flame, ChevronRight } from 'lucide-react'
import type { TodayPlan } from '../../types'

interface PR { exerciseName: string; weight_kg: number; reps: number }

interface PostWorkoutModalProps {
  open: boolean
  durationSeconds: number
  totalSets: number
  totalVolume: number       // kg
  prs: PR[]
  tomorrowPlan: TodayPlan | null
  tomorrowLoading: boolean
  onDone: () => void
}

export function PostWorkoutModal({ open, durationSeconds, totalSets, totalVolume, prs, tomorrowPlan, tomorrowLoading, onDone }: PostWorkoutModalProps) {
  const mins = Math.floor(durationSeconds / 60)
  const secs = durationSeconds % 60
  const duration = mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${mins}m ${secs}s`

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
          />
          {/* Sheet slides up from bottom */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Workout Complete!</h2>
                <p className="text-sm text-text-muted">Great work 💪</p>
              </div>
              <button onClick={onDone} className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-bg-tertiary rounded-2xl p-3 text-center">
                <Clock className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text-primary">{duration}</p>
                <p className="text-xs text-text-muted">Duration</p>
              </div>
              <div className="bg-bg-tertiary rounded-2xl p-3 text-center">
                <Dumbbell className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text-primary">{totalSets}</p>
                <p className="text-xs text-text-muted">Sets</p>
              </div>
              <div className="bg-bg-tertiary rounded-2xl p-3 text-center">
                <Flame className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-text-primary">{totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`}</p>
                <p className="text-xs text-text-muted">Volume</p>
              </div>
            </div>

            {/* PRs */}
            {prs.length > 0 && (
              <div className="bg-primary-700/10 border border-primary-700/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary-400" />
                  <p className="font-semibold text-primary-400 text-sm">Personal Records 🎉</p>
                </div>
                {prs.map((pr, i) => (
                  <p key={i} className="text-sm text-text-primary">{pr.exerciseName}: {pr.weight_kg}kg × {pr.reps}</p>
                ))}
              </div>
            )}

            {/* Tomorrow's workout */}
            <div className="bg-bg-tertiary rounded-2xl p-4 mb-6">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Up Next</p>
              {tomorrowLoading ? (
                <div className="h-12 bg-bg-primary rounded-xl animate-pulse" />
              ) : tomorrowPlan ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{tomorrowPlan.split_day_label}</p>
                    <p className="text-sm text-text-muted">
                      {tomorrowPlan.exercises.slice(0, 3).map(e => e.exercise_name).join(' · ')}
                      {tomorrowPlan.exercises.length > 3 ? ` +${tomorrowPlan.exercises.length - 3}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </div>
              ) : (
                <p className="text-sm text-text-muted">Rest day — no split configured</p>
              )}
            </div>

            <button
              onClick={onDone}
              className="w-full py-4 bg-primary-700 text-white rounded-2xl font-bold text-base"
            >
              Done
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
