import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, X, Check, ChevronDown, ChevronUp, Search, Timer, Dumbbell, Bike, Trash2 } from 'lucide-react'
import { workoutsApi } from '../services/workouts'
import { exercisesApi } from '../services/exercises'
import { useToast } from '../stores/uiStore'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import type { Exercise, Workout, CardioSession, CardioType } from '../types'

interface LiveSet {
  id?: string
  exercise_id: string
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number
  rpe?: number
  is_warmup: boolean
  saved: boolean
}

interface ExerciseBlock {
  exercise: Exercise
  sets: LiveSet[]
  expanded: boolean
  prevBest?: { weight_kg: number; reps: number } | null
}

const CARDIO_TYPES: { value: CardioType; label: string; icon: string }[] = [
  { value: 'recumbent_bike', label: 'Recumbent Bike', icon: '🚲' },
  { value: 'upright_bike', label: 'Upright Bike', icon: '🚴' },
  { value: 'spinning', label: 'Spinning', icon: '⚡' },
  { value: 'treadmill', label: 'Treadmill', icon: '🏃' },
  { value: 'elliptical', label: 'Elliptical', icon: '🔄' },
  { value: 'rowing', label: 'Rowing Machine', icon: '🚣' },
  { value: 'stairmaster', label: 'Stairmaster', icon: '🪜' },
  { value: 'walking', label: 'Walking', icon: '🚶' },
  { value: 'hiking', label: 'Hiking', icon: '⛰️' },
  { value: 'jump_rope', label: 'Jump Rope', icon: '🪢' },
  { value: 'battle_ropes', label: 'Battle Ropes', icon: '💪' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'hiit', label: 'HIIT', icon: '🔥' },
  { value: 'other', label: 'Other', icon: '🏃' },
]

// Which cardio types use level
const USE_LEVEL: CardioType[] = ['recumbent_bike', 'upright_bike', 'spinning', 'elliptical', 'rowing', 'stairmaster']
// Which use speed + incline
const USE_SPEED: CardioType[] = ['treadmill', 'walking']
// Which use RPM
const USE_RPM: CardioType[] = ['recumbent_bike', 'upright_bike', 'spinning']

interface CardioForm {
  cardio_type: CardioType
  duration_min: string
  level: string
  rpm: string
  speed_kmh: string
  incline_pct: string
  notes: string
}

const defaultCardioForm: CardioForm = {
  cardio_type: 'recumbent_bike',
  duration_min: '30',
  level: '',
  rpm: '',
  speed_kmh: '',
  incline_pct: '',
  notes: '',
}

export function WorkoutPage() {
  const [tab, setTab] = useState<'lift' | 'cardio'>('lift')
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [pickModal, setPickModal] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // Cardio state
  const [cardioForm, setCardioForm] = useState<CardioForm>(defaultCardioForm)
  const [savingCardio, setSavingCardio] = useState(false)
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([])
  const [cardioLoading, setCardioLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Timer
  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => {
    exercisesApi.list().then(setExercises).catch(() => {})
  }, [])

  const fetchCardioSessions = useCallback(async () => {
    setCardioLoading(true)
    try {
      const r = await api.get('/cardio', { params: { days: 1 } })
      setCardioSessions(r.data)
    } catch {
      // ignore
    } finally {
      setCardioLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'cardio') fetchCardioSessions()
  }, [tab, fetchCardioSessions])

  const setCardio = (field: keyof CardioForm, value: string) =>
    setCardioForm(f => ({ ...f, [field]: value }))

  const logCardio = async () => {
    const duration = parseFloat(cardioForm.duration_min)
    if (!duration || duration <= 0) {
      toast.error('Please enter a valid duration')
      return
    }
    setSavingCardio(true)
    try {
      const payload: any = {
        date: today,
        cardio_type: cardioForm.cardio_type,
        duration_min: duration,
      }
      if (cardioForm.level) payload.level = parseInt(cardioForm.level)
      if (cardioForm.rpm) payload.rpm = parseFloat(cardioForm.rpm)
      if (cardioForm.speed_kmh) payload.speed_kmh = parseFloat(cardioForm.speed_kmh)
      if (cardioForm.incline_pct) payload.incline_pct = parseFloat(cardioForm.incline_pct)
      if (cardioForm.notes) payload.notes = cardioForm.notes

      await api.post('/cardio', payload)
      setCardioForm(defaultCardioForm)
      await fetchCardioSessions()
      toast.success('Cardio logged!')
    } catch {
      toast.error('Failed to log cardio')
    } finally {
      setSavingCardio(false)
    }
  }

  const deleteCardio = async (id: string) => {
    try {
      await api.delete(`/cardio/${id}`)
      setCardioSessions(s => s.filter(c => c.id !== id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const startWorkout = async () => {
    setLoading(true)
    try {
      const w = await workoutsApi.create({ label: `Workout — ${new Date().toLocaleDateString()}` })
      setWorkout(w)
      setTimerRunning(true)
      toast.success('Workout started!')
    } catch {
      toast.error('Failed to start workout')
    } finally {
      setLoading(false)
    }
  }

  const addExercise = (ex: Exercise) => {
    setBlocks(b => [...b, {
      exercise: ex,
      expanded: true,
      sets: [{ exercise_id: ex.id, exercise_name: ex.name, set_number: 1, reps: 8, weight_kg: 0, is_warmup: false, saved: false }],
      prevBest: null,
    }])
    setPickModal(false)
    workoutsApi.exerciseHistory(ex.id, 1).then(hist => {
      if (hist[0]?.sets?.length) {
        const best = hist[0].sets.reduce((a: any, b: any) => b.weight_kg > a.weight_kg ? b : a, hist[0].sets[0])
        setBlocks(blocks => blocks.map(bl => bl.exercise.id === ex.id ? { ...bl, prevBest: best } : bl))
      }
    }).catch(() => {})
  }

  const updateSet = (blockIdx: number, setIdx: number, field: keyof LiveSet, value: any) => {
    setBlocks(b => {
      const next = [...b]
      next[blockIdx] = { ...next[blockIdx], sets: [...next[blockIdx].sets] }
      next[blockIdx].sets[setIdx] = { ...next[blockIdx].sets[setIdx], [field]: value, saved: false }
      return next
    })
  }

  const addSet = (blockIdx: number) => {
    setBlocks(b => {
      const next = [...b]
      const block = next[blockIdx]
      const last = block.sets[block.sets.length - 1]
      next[blockIdx] = {
        ...block,
        sets: [...block.sets, {
          exercise_id: block.exercise.id,
          exercise_name: block.exercise.name,
          set_number: block.sets.length + 1,
          reps: last?.reps || 8,
          weight_kg: last?.weight_kg || 0,
          is_warmup: false,
          saved: false,
        }],
      }
      return next
    })
  }

  const removeSet = (blockIdx: number, setIdx: number) => {
    setBlocks(b => {
      const next = [...b]
      const sets = next[blockIdx].sets.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, set_number: i + 1 }))
      if (sets.length === 0) return next.filter((_, i) => i !== blockIdx)
      next[blockIdx] = { ...next[blockIdx], sets }
      return next
    })
  }

  const saveSet = async (blockIdx: number, setIdx: number) => {
    if (!workout) return
    const s = blocks[blockIdx].sets[setIdx]
    try {
      const saved = await workoutsApi.addSet(workout.id, {
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight_kg: s.weight_kg,
        is_warmup: s.is_warmup,
      })
      setBlocks(b => {
        const next = [...b]
        next[blockIdx].sets[setIdx] = { ...s, id: saved.id, saved: true }
        return next
      })
    } catch {
      toast.error('Failed to save set')
    }
  }

  const finishWorkout = async () => {
    if (!workout) return
    setTimerRunning(false)
    await workoutsApi.update(workout.id, { duration_min: Math.floor(timer / 60) })
    toast.success(`Workout finished! ${formatTime(timer)} ⚡`)
    setWorkout(null)
    setBlocks([])
    setTimer(0)
  }

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )
  const grouped = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = []
    acc[ex.muscle_group].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  const currentType = cardioForm.cardio_type
  const showLevel = USE_LEVEL.includes(currentType)
  const showSpeed = USE_SPEED.includes(currentType)
  const showRpm = USE_RPM.includes(currentType)

  const cardioLabel = CARDIO_TYPES.find(c => c.value === cardioForm.cardio_type)

  return (
    <div className="page px-4">
      <PageHeader title="Workout" subtitle="Log your training session" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4">
        {[
          { id: 'lift', icon: <Dumbbell className="w-4 h-4" />, label: 'Lift' },
          { id: 'cardio', icon: <Bike className="w-4 h-4" />, label: 'Cardio' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.id
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── LIFT TAB ── */}
      <AnimatePresence mode="wait">
        {tab === 'lift' && (
          <motion.div key="lift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!workout ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 gap-6">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-24 h-24 rounded-3xl bg-primary-700/20 flex items-center justify-center">
                    <Dumbbell className="w-12 h-12 text-primary-400" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">Ready to train?</h2>
                  <p className="text-text-muted text-sm">Start a new workout session and log your sets in real-time.</p>
                </div>
                <Button size="lg" loading={loading} onClick={startWorkout} className="w-full max-w-xs">
                  <Plus className="w-5 h-5" />
                  Start Workout
                </Button>
              </div>
            ) : (
              <>
                {/* Header with timer */}
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">{workout.label}</h2>
                    <p className="text-text-muted text-xs">{blocks.reduce((a, b) => a + b.sets.filter(s => s.saved).length, 0)} sets logged</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setTimerRunning(r => !r)}
                      animate={timerRunning ? {
                        boxShadow: ['0 0 0px rgba(220,38,38,0)', '0 0 12px rgba(220,38,38,0.4)', '0 0 0px rgba(220,38,38,0)'],
                      } : { boxShadow: '0 0 0px rgba(220,38,38,0)' }}
                      transition={{ duration: 1.5, repeat: timerRunning ? Infinity : 0 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-tertiary border border-border text-sm font-mono"
                    >
                      <motion.div
                        animate={timerRunning ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 1, repeat: timerRunning ? Infinity : 0 }}
                      >
                        <Timer className={`w-3.5 h-3.5 ${timerRunning ? 'text-primary-400' : 'text-text-muted'}`} />
                      </motion.div>
                      <span className={timerRunning ? 'text-text-primary' : 'text-text-muted'}>{formatTime(timer)}</span>
                    </motion.button>
                    <Button variant="danger" size="sm" onClick={finishWorkout}>Done</Button>
                  </div>
                </div>

                {/* Exercise blocks */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {blocks.map((block, blockIdx) => (
                      <motion.div
                        key={block.exercise.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card padding="none">
                          <button
                            onClick={() => setBlocks(b => b.map((bl, i) => i === blockIdx ? { ...bl, expanded: !bl.expanded } : bl))}
                            className="w-full flex items-center justify-between p-4"
                          >
                            <div className="text-left">
                              <div className="font-semibold text-text-primary">{block.exercise.name}</div>
                              {block.prevBest && (
                                <div className="text-xs text-text-muted mt-0.5">
                                  Prev best: {block.prevBest.weight_kg}kg × {block.prevBest.reps}
                                </div>
                              )}
                            </div>
                            {block.expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                          </button>

                          {block.expanded && (
                            <div className="px-4 pb-4 space-y-2">
                              <div className="grid grid-cols-[1fr_2fr_2fr_auto_auto] gap-2 text-xs text-text-muted px-1 mb-1">
                                <span>Set</span><span>Weight kg</span><span>Reps</span><span></span><span></span>
                              </div>

                              {block.sets.map((set, setIdx) => (
                                <motion.div
                                  key={setIdx}
                                  layout
                                  animate={set.saved ? { backgroundColor: 'rgba(34,197,94,0.04)' } : { backgroundColor: 'rgba(20,20,40,1)' }}
                                  className={`grid grid-cols-[1fr_2fr_2fr_auto_auto] gap-2 items-center p-2 rounded-xl border transition-colors ${set.saved ? 'border-accent-green/15' : 'border-transparent bg-bg-tertiary'}`}>
                                  <button
                                    onClick={() => updateSet(blockIdx, setIdx, 'is_warmup', !set.is_warmup)}
                                    className={`text-xs font-bold text-center w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-colors ${set.is_warmup ? 'bg-accent-yellow/15 text-accent-yellow' : 'text-text-secondary hover:bg-bg-hover'}`}
                                  >
                                    {set.is_warmup ? 'W' : set.set_number}
                                  </button>

                                  <div className="flex items-center gap-1">
                                    <button className="stepper-btn w-8 h-8 text-xs" onClick={() => updateSet(blockIdx, setIdx, 'weight_kg', Math.max(0, set.weight_kg - 2.5))}>
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      value={set.weight_kg}
                                      onChange={e => updateSet(blockIdx, setIdx, 'weight_kg', parseFloat(e.target.value) || 0)}
                                      className="w-14 bg-bg-secondary border border-border rounded-lg text-center text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-700/50 py-1"
                                    />
                                    <button className="stepper-btn w-8 h-8 text-xs" onClick={() => updateSet(blockIdx, setIdx, 'weight_kg', set.weight_kg + 2.5)}>
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button className="stepper-btn w-8 h-8 text-xs" onClick={() => updateSet(blockIdx, setIdx, 'reps', Math.max(1, set.reps - 1))}>
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      value={set.reps}
                                      onChange={e => updateSet(blockIdx, setIdx, 'reps', parseInt(e.target.value) || 1)}
                                      className="w-12 bg-bg-secondary border border-border rounded-lg text-center text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-700/50 py-1"
                                    />
                                    <button className="stepper-btn w-8 h-8 text-xs" onClick={() => updateSet(blockIdx, setIdx, 'reps', set.reps + 1)}>
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => saveSet(blockIdx, setIdx)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${set.saved ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-hover text-text-muted hover:text-text-primary'}`}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => removeSet(blockIdx, setIdx)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </motion.div>
                              ))}

                              <Button variant="ghost" size="sm" onClick={() => addSet(blockIdx)} className="w-full mt-1 border border-dashed border-border">
                                <Plus className="w-3.5 h-3.5" /> Add Set
                              </Button>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <Button variant="secondary" fullWidth onClick={() => setPickModal(true)} className="border-dashed border-border">
                    <Plus className="w-4 h-4" /> Add Exercise
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── CARDIO TAB ── */}
        {tab === 'cardio' && (
          <motion.div key="cardio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Log Cardio Form */}
            <Card padding="md">
              <h3 className="font-semibold text-text-primary mb-4">Log Cardio Session</h3>

              {/* Cardio type picker */}
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Type</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {CARDIO_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => setCardio('cardio_type', ct.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-colors border ${
                        cardioForm.cardio_type === ct.value
                          ? 'bg-primary-700/20 border-primary-700/50 text-primary-300'
                          : 'bg-bg-tertiary border-transparent text-text-muted hover:bg-bg-hover'
                      }`}
                    >
                      <span className="text-lg">{ct.icon}</span>
                      <span className="text-[9px] leading-tight font-medium">{ct.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-3">
                <Input
                  label="Duration (minutes)"
                  type="number"
                  placeholder="30"
                  value={cardioForm.duration_min}
                  onChange={e => setCardio('duration_min', e.target.value)}
                />
              </div>

              {/* Type-specific fields */}
              <div className="space-y-3 mb-4">
                {showLevel && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1.5">Resistance Level</p>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => setCardio('level', cardioForm.level === String(lvl) ? '' : String(lvl))}
                          className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                            cardioForm.level === String(lvl)
                              ? 'bg-primary-700 text-white'
                              : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showRpm && (
                  <Input
                    label="RPM (optional)"
                    type="number"
                    placeholder="80"
                    value={cardioForm.rpm}
                    onChange={e => setCardio('rpm', e.target.value)}
                  />
                )}

                {showSpeed && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Speed (km/h)"
                      type="number"
                      placeholder="6.5"
                      value={cardioForm.speed_kmh}
                      onChange={e => setCardio('speed_kmh', e.target.value)}
                    />
                    <Input
                      label="Incline (%)"
                      type="number"
                      placeholder="0"
                      value={cardioForm.incline_pct}
                      onChange={e => setCardio('incline_pct', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button fullWidth loading={savingCardio} onClick={logCardio}>
                Log {cardioLabel?.icon} {cardioLabel?.label}
              </Button>
            </Card>

            {/* Today's sessions */}
            <div>
              <h3 className="font-semibold text-text-primary mb-3">Today's Cardio</h3>
              {cardioLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
                </div>
              ) : cardioSessions.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  <span className="text-3xl block mb-2">🚴</span>
                  No cardio logged today
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {cardioSessions.map(session => {
                      const ct = CARDIO_TYPES.find(c => c.value === session.cardio_type)
                      return (
                        <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Card padding="md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{ct?.icon || '🏃'}</span>
                                <div>
                                  <p className="font-semibold text-text-primary text-sm">{ct?.label}</p>
                                  <p className="text-xs text-text-muted">
                                    {session.duration_min} min
                                    {session.level ? ` · Level ${session.level}` : ''}
                                    {session.rpm ? ` · ${session.rpm} RPM` : ''}
                                    {session.speed_kmh ? ` · ${session.speed_kmh} km/h` : ''}
                                    {session.incline_pct ? ` · ${session.incline_pct}% incline` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {session.calories_burned && (
                                  <span className="text-sm font-bold text-accent-orange">
                                    ~{Math.round(session.calories_burned)} kcal
                                  </span>
                                )}
                                <button
                                  onClick={() => deleteCardio(session.id)}
                                  className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-accent-red transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise picker modal */}
      <Modal open={pickModal} onClose={() => setPickModal(false)} title="Add Exercise">
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="mb-4"
        />
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{group}</h4>
              <div className="space-y-1">
                {exs.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-bg-hover transition-colors text-text-primary text-sm flex items-center justify-between"
                  >
                    <span>{ex.name}</span>
                    {ex.equipment && <span className="text-xs text-text-muted">{ex.equipment}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
