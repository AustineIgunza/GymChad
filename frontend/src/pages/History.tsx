import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { workoutsApi } from '../services/workouts'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'
import type { Workout } from '../types'

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#dc2626', BACK: '#1d4ed8', SHOULDERS: '#60a5fa',
  BICEPS: '#22c55e', TRICEPS: '#f97316', LEGS: '#eab308',
  GLUTES: '#ec4899', CORE: '#06b6d4', CARDIO: '#84cc16', FULL_BODY: '#8b5cf6',
}

export function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = async (p: number, append = false) => {
    setLoading(true)
    try {
      const data = await workoutsApi.list({ page: p, limit: 20 })
      if (append) setWorkouts(w => [...w, ...data])
      else setWorkouts(data)
      setHasMore(data.length === 20)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPage(1) }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPage(next, true)
  }

  const grouped = workouts.reduce((acc, w) => {
    const date = new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(w)
    return acc
  }, {} as Record<string, Workout[]>)

  return (
    <div className="page px-4">
      <PageHeader title="Workout History" subtitle="All past sessions" />

      {loading && workouts.length === 0 ? (
        <SkeletonList count={4} />
      ) : workouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-6"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-4"
          >
            📅
          </motion.div>
          <p className="text-text-primary font-semibold mb-1">No workouts yet</p>
          <p className="text-text-muted text-sm">Log your first workout to see history here</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayWorkouts], groupIdx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.06 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <p className="text-sm font-semibold text-text-muted">{date}</p>
              </div>
              <div className="space-y-2">
                {dayWorkouts.map(w => {
                  const muscles = [...new Set(w.sets.map(s => s.exercise?.muscle_group).filter(Boolean))]
                  const workingSets = w.sets.filter(s => !s.is_warmup)
                  const totalVolume = workingSets.reduce((a, s) => a + s.reps * s.weight_kg, 0)
                  const isExpanded = expandedId === w.id

                  return (
                    <Card key={w.id} padding="none">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : w.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Dumbbell className="w-4 h-4 text-primary-400 flex-shrink-0" />
                            <p className="font-semibold text-text-primary">{w.label}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span>{workingSets.length} sets</span>
                            {totalVolume > 0 && <span>{Math.round(totalVolume).toLocaleString()}kg vol</span>}
                            {w.duration_min && <span>{w.duration_min}min</span>}
                          </div>
                          {muscles.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {muscles.slice(0, 4).map(m => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ background: `${MUSCLE_COLORS[m!]}18`, color: MUSCLE_COLORS[m!] }}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />}
                      </button>

                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border px-4 pb-4"
                        >
                          {/* Group by exercise */}
                          {(() => {
                            const byExercise: Record<string, typeof w.sets> = {}
                            w.sets.forEach(s => {
                              const name = s.exercise?.name || 'Unknown'
                              if (!byExercise[name]) byExercise[name] = []
                              byExercise[name].push(s)
                            })
                            return Object.entries(byExercise).map(([exName, sets]) => (
                              <div key={exName} className="mt-3">
                                <p className="text-xs font-semibold text-text-muted mb-1.5">{exName}</p>
                                <div className="space-y-1">
                                  {sets.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                      <span className="text-text-disabled w-6">{s.is_warmup ? 'W' : `${s.set_number}.`}</span>
                                      <span className="text-text-primary font-medium">{s.weight_kg}kg × {s.reps}</span>
                                      {s.rpe && <span className="text-text-muted text-xs">RPE {s.rpe}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          })()}
                          {w.notes && (
                            <p className="mt-3 text-xs text-text-muted italic border-t border-border pt-2">{w.notes}</p>
                          )}
                        </motion.div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-3 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
