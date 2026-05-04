import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronDown, ChevronUp, Dumbbell, BarChart2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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

type ViewMode = 'days' | 'months' | 'years'

interface AggregateGroup {
  label: string
  count: number
  totalSets: number
  totalVolume: number
  muscles: string[]
}

function aggregateWorkouts(workouts: Workout[], mode: 'months' | 'years'): AggregateGroup[] {
  const groups: Record<string, { workouts: Workout[]; label: string }> = {}

  for (const w of workouts) {
    const d = new Date(w.date)
    const key = mode === 'months'
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : `${d.getFullYear()}`
    const label = mode === 'months'
      ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : `${d.getFullYear()}`

    if (!groups[key]) groups[key] = { workouts: [], label }
    groups[key].workouts.push(w)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, { label, workouts: ws }]) => {
      const allSets = ws.flatMap(w => w.sets || [])
      const workingSets = allSets.filter(s => !s.is_warmup)
      const totalVolume = workingSets.reduce((a, s) => a + s.reps * s.weight_kg, 0)
      const muscles = [...new Set(allSets.map(s => s.exercise?.muscle_group).filter(Boolean) as string[])]
      return { label, count: ws.length, totalSets: workingSets.length, totalVolume, muscles }
    })
}

export function HistoryPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('days')

  const { data: pageWorkouts = [], isLoading, isFetching } = useQuery({
    queryKey: ['workouts', page],
    queryFn: () => workoutsApi.list({ page, limit: 20 }),
    placeholderData: (prev) => prev,
  })

  // Accumulate pages for the days view (merge into allWorkouts, deduplicating by id)
  useEffect(() => {
    if (viewMode !== 'days') return
    const ids = new Set(allWorkouts.map(w => w.id))
    const newOnes = (pageWorkouts as Workout[]).filter(w => !ids.has(w.id))
    if (newOnes.length > 0) {
      setAllWorkouts(prev => [...prev, ...newOnes])
    }
  }, [pageWorkouts]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = (pageWorkouts as Workout[]).length === 20

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutsApi.delete(id),
    onSuccess: () => {
      toast.success('Workout deleted')
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      setAllWorkouts([])
      setPage(1)
    },
    onError: () => toast.error('Failed to delete'),
  })

  const switchView = async (mode: ViewMode) => {
    setViewMode(mode)
    if (mode !== 'days' && allWorkouts.length < 100) {
      // Fetch up to 1000 workouts for aggregate views
      const all: Workout[] = []
      for (let p = 1; p <= 10; p++) {
        const data = await workoutsApi.list({ page: p, limit: 100 })
        all.push(...data)
        if (data.length < 100) break
      }
      setAllWorkouts(all)
    }
  }

  const loadMore = () => {
    setPage(p => p + 1)
  }

  const displayWorkouts: Workout[] = viewMode === 'days'
    ? (allWorkouts.length > 0 ? allWorkouts : (pageWorkouts as Workout[]))
    : allWorkouts

  const grouped = displayWorkouts.reduce((acc, w) => {
    const date = new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(w)
    return acc
  }, {} as Record<string, Workout[]>)

  const monthGroups = viewMode === 'months' ? aggregateWorkouts(allWorkouts, 'months') : []
  const yearGroups = viewMode === 'years' ? aggregateWorkouts(allWorkouts, 'years') : []

  const isEmpty = displayWorkouts.length === 0

  return (
    <div className="page px-4">
      <PageHeader title="Workout History" subtitle="All past sessions" />

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-2xl mb-4">
        {(['days', 'months', 'years'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => switchView(mode)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              viewMode === mode ? 'bg-primary-700 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {isLoading && displayWorkouts.length === 0 ? (
        <SkeletonList count={4} />
      ) : isEmpty ? (
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

          {/* ── DAY VIEW ── */}
          {viewMode === 'days' && Object.entries(grouped).map(([date, dayWorkouts], groupIdx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <p className="text-sm font-semibold text-text-muted">{date}</p>
              </div>
              <div className="space-y-2">
                {dayWorkouts.map(w => {
                  const muscles = [...new Set((w.sets || []).map(s => s.exercise?.muscle_group).filter(Boolean))]
                  const workingSets = (w.sets || []).filter(s => !s.is_warmup)
                  const totalVolume = workingSets.reduce((a, s) => a + s.reps * s.weight_kg, 0)
                  const isExpanded = expandedId === w.id

                  return (
                    <Card key={w.id} padding="none">
                      <div className="flex items-center">
                        <button
                          className="flex-1 flex items-center justify-between p-4 text-left"
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
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />
                            : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />}
                        </button>
                        {/* Delete button */}
                        <button
                          className="p-4 text-text-muted hover:text-accent-red transition-colors flex-shrink-0"
                          onClick={() => setConfirmDeleteId(w.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Confirm delete dialog */}
                      {confirmDeleteId === w.id && (
                        <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3 bg-accent-red/5">
                          <p className="text-sm text-text-primary">Delete this workout?</p>
                          <div className="flex gap-2">
                            <button
                              className="text-xs text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg bg-bg-tertiary"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              className="text-xs text-white bg-accent-red px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                setConfirmDeleteId(null)
                                deleteMutation.mutate(w.id)
                              }}
                            >
                              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border px-4 pb-4"
                        >
                          {(() => {
                            const byExercise: Record<string, typeof w.sets> = {}
                            ;(w.sets || []).forEach(s => {
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

          {viewMode === 'days' && hasMore && (
            <button
              onClick={loadMore}
              disabled={isFetching}
              className="w-full py-3 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              {isFetching ? 'Loading...' : 'Load more'}
            </button>
          )}

          {/* ── MONTH VIEW ── */}
          {viewMode === 'months' && monthGroups.map((g, i) => (
            <motion.div key={g.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary-400" />
                    <p className="font-semibold text-text-primary">{g.label}</p>
                  </div>
                  <span className="text-xs text-text-muted">{g.count} {g.count === 1 ? 'workout' : 'workouts'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-text-primary">{g.totalSets}</p>
                    <p className="text-xs text-text-muted">Sets</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-text-primary">{g.totalVolume > 0 ? `${Math.round(g.totalVolume / 1000)}k` : '—'}</p>
                    <p className="text-xs text-text-muted">Vol (kg)</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-text-primary">{g.count}</p>
                    <p className="text-xs text-text-muted">Days</p>
                  </div>
                </div>
                {g.muscles.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {g.muscles.slice(0, 6).map(m => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${MUSCLE_COLORS[m]}18`, color: MUSCLE_COLORS[m] }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}

          {/* ── YEAR VIEW ── */}
          {viewMode === 'years' && yearGroups.map((g, i) => (
            <motion.div key={g.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary-400" />
                    <p className="text-xl font-bold text-text-primary">{g.label}</p>
                  </div>
                  <span className="text-xs text-text-muted">{g.count} {g.count === 1 ? 'workout' : 'workouts'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-text-primary">{g.totalSets}</p>
                    <p className="text-xs text-text-muted">Total Sets</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-text-primary">{g.totalVolume > 0 ? `${Math.round(g.totalVolume / 1000)}k` : '—'}</p>
                    <p className="text-xs text-text-muted">Vol (kg)</p>
                  </div>
                  <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-text-primary">{g.count}</p>
                    <p className="text-xs text-text-muted">Workouts</p>
                  </div>
                </div>
                {g.muscles.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {g.muscles.slice(0, 8).map(m => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${MUSCLE_COLORS[m]}18`, color: MUSCLE_COLORS[m] }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}

          {isFetching && displayWorkouts.length > 0 && viewMode === 'days' && (
            <div className="text-center py-4 text-text-muted text-sm">Loading...</div>
          )}
        </div>
      )}
    </div>
  )
}
