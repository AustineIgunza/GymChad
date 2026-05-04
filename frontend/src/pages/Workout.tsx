import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, ChevronDown, Search, Dumbbell, Bike, Trash2, Check, Loader2,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { workoutsApi } from '../services/workouts'
import { exercisesApi } from '../services/exercises'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RestTimer } from '../components/workout/RestTimer'
import { PrCelebration } from '../components/workout/PrCelebration'
import { PostWorkoutModal } from '../components/workout/PostWorkoutModal'
import { VoiceLogger } from '../components/workout/VoiceLogger'
import type { Exercise, Workout, CardioSession, CardioType, ParsedSet, TodayPlan } from '../types'
import { formatWeight } from '../utils/units'
import { useUIStore } from '../stores/uiStore'
import { useWorkoutStore } from '../stores/workoutStore'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'active' | 'finishing'

interface LiveSet {
  id?: string
  weight: string
  reps: string
  saved: boolean
  is_warmup: boolean
  saving: boolean
  set_number: number
}

interface ExerciseBlock {
  exercise_id: string
  exercise_name: string
  muscle_group: string
  sets: LiveSet[]
  prevBest: string
  recentHistory: any[]
  collapsed: boolean
}

interface PR { exerciseName: string; weight_kg: number; reps: number }

// ── Cardio constants ───────────────────────────────────────────────────────────

const CARDIO_TYPES: { value: CardioType; label: string; icon: string }[] = [
  { value: 'recumbent_bike', label: 'Recumbent Bike', icon: '🚲' },
  { value: 'upright_bike',   label: 'Upright Bike',   icon: '🚴' },
  { value: 'spinning',       label: 'Spinning',        icon: '⚡' },
  { value: 'treadmill',      label: 'Treadmill',       icon: '🏃' },
  { value: 'elliptical',     label: 'Elliptical',      icon: '🔄' },
  { value: 'rowing',         label: 'Rowing Machine',  icon: '🚣' },
  { value: 'stairmaster',    label: 'Stairmaster',     icon: '🪜' },
  { value: 'walking',        label: 'Walking',         icon: '🚶' },
  { value: 'hiking',         label: 'Hiking',          icon: '⛰️' },
  { value: 'jump_rope',      label: 'Jump Rope',       icon: '🪢' },
  { value: 'battle_ropes',   label: 'Battle Ropes',    icon: '💪' },
  { value: 'swimming',       label: 'Swimming',        icon: '🏊' },
  { value: 'hiit',           label: 'HIIT',            icon: '🔥' },
  { value: 'other',          label: 'Other',           icon: '🏃' },
]

const USE_LEVEL: CardioType[] = ['recumbent_bike', 'upright_bike', 'spinning', 'elliptical', 'rowing', 'stairmaster']
const USE_SPEED: CardioType[] = ['treadmill', 'walking']
const USE_RPM:   CardioType[] = ['recumbent_bike', 'upright_bike', 'spinning']

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatElapsed(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── WorkoutStartModal ──────────────────────────────────────────────────────────

function WorkoutStartModal({ open, todayPlan, onStartFromSplit, onStartBlank, onClose }: {
  open: boolean
  todayPlan: TodayPlan | null | undefined
  onStartFromSplit: () => void
  onStartBlank: () => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card rounded-t-3xl p-6"
          >
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold text-text-primary mb-4">Start Workout</h2>

            {todayPlan && (
              <button onClick={onStartFromSplit}
                className="w-full bg-primary-700 text-white rounded-2xl p-4 text-left mb-3 hover:bg-primary-600 transition-colors">
                <p className="font-bold text-base">{todayPlan.split_day_label}</p>
                <p className="text-sm text-white/70 mt-0.5">
                  {todayPlan.exercises.slice(0, 3).map(e => e.exercise_name).join(' · ')}
                  {todayPlan.exercises.length > 3 ? ` +${todayPlan.exercises.length - 3} more` : ''}
                </p>
              </button>
            )}

            <button onClick={onStartBlank}
              className="w-full bg-bg-tertiary border border-border text-text-primary rounded-2xl p-4 text-left hover:bg-bg-secondary transition-colors">
              <p className="font-bold">Empty Workout</p>
              <p className="text-sm text-text-muted mt-0.5">Add exercises manually</p>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── SetRow ─────────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: LiveSet
  setIdx: number
  blockIdx: number
  onWeightChange: (val: string) => void
  onRepsChange: (val: string) => void
  onTick: () => void
  onRemove: () => void
  onToggleWarmup: () => void
  useKg: boolean
}

function SetRow({ set, onWeightChange, onRepsChange, onTick, onRemove, onToggleWarmup }: SetRowProps) {
  return (
    <div className={`grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center mb-2 px-1 py-1 rounded-xl transition-colors ${set.saved ? 'bg-green-500/8' : ''}`}>
      {/* Set number / warmup toggle */}
      <button
        onClick={onToggleWarmup}
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${set.is_warmup ? 'bg-yellow-500/20 text-yellow-400' : 'bg-bg-tertiary text-text-muted'}`}
      >
        {set.is_warmup ? 'W' : set.set_number}
      </button>

      {/* Weight input */}
      <input
        type="number"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onWeightChange(e.target.value)}
        onFocus={e => e.target.select()}
        className="w-full text-center bg-bg-tertiary rounded-xl py-2.5 text-sm font-semibold text-text-primary border border-transparent focus:border-primary-700 outline-none"
        placeholder="0"
      />

      {/* Reps input */}
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onRepsChange(e.target.value)}
        onFocus={e => e.target.select()}
        className="w-full text-center bg-bg-tertiary rounded-xl py-2.5 text-sm font-semibold text-text-primary border border-transparent focus:border-primary-700 outline-none"
        placeholder="0"
      />

      {/* Tick / spinner */}
      <div className="flex items-center gap-1">
        <button
          onClick={onTick}
          disabled={set.saving}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            set.saving
              ? 'border-2 border-border opacity-50'
              : set.saved
                ? 'bg-primary-700'
                : 'border-2 border-border hover:border-primary-700'
          }`}
        >
          {set.saving
            ? <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            : <Check className={`w-4 h-4 ${set.saved ? 'text-white' : 'text-text-muted/40'}`} />
          }
        </button>
        {!set.saved && (
          <button
            onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center text-text-muted/30 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function WorkoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { useKg } = useUIStore()
  const { activeWorkout: storedWorkout, setActiveWorkout: storeSetWorkout, clearActive, startTime: storedStartTime } = useWorkoutStore()

  // Phase state
  const [phase, setPhase] = useState<Phase>('idle')
  const [tab, setTab] = useState<'lift' | 'cardio'>('lift')

  // Workout state
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([])
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [workoutLabel, setWorkoutLabel] = useState('')

  // UI state
  const [showStartModal, setShowStartModal] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [pickModal, setPickModal] = useState(false)
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('All')
  const [exercises, setExercises] = useState<Exercise[]>([])

  // Post-workout state
  const [durationOnFinish, setDurationOnFinish] = useState(0)
  const [prs, setPrs] = useState<PR[]>([])
  const [tomorrowPlan, setTomorrowPlan] = useState<TodayPlan | null>(null)
  const [tomorrowLoading, setTomorrowLoading] = useState(false)

  // PR celebration
  const [prShow, setPrShow] = useState(false)
  const [prData, setPrData] = useState({ weight: 0, reps: 0, exerciseName: '' })

  // Cardio
  const [cardioForm, setCardioForm] = useState<CardioForm>(defaultCardioForm)
  const [savingCardio, setSavingCardio] = useState(false)
  const [cardioSessions, setCardioSessions] = useState<CardioSession[]>([])
  const [cardioLoading, setCardioLoading] = useState(false)

  const creatingRef = useRef(false)
  const finishingRef = useRef(false)
  const today = new Date().toISOString().split('T')[0]

  // ── Today's plan query ──
  const { data: todayPlan } = useQuery({
    queryKey: ['today-plan'],
    queryFn: workoutsApi.todayPlan,
    staleTime: 1000 * 60 * 10,
  })

  // ── Elapsed timer ──
  useEffect(() => {
    if (phase !== 'active' || !startTime) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase, startTime])

  // ── Load exercises + restore active session ──
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    exercisesApi.list(signal).catch(() => []).then(exs => {
      if (signal.aborted) return
      setExercises(exs)

      // Restore active workout from store
      if (storedWorkout && phase === 'idle') {
        setWorkout(storedWorkout)
        setWorkoutLabel(storedWorkout.label || 'Workout')
        const st = storedStartTime ?? Date.now()
        setStartTime(st)
        setPhase('active')

        workoutsApi.get(storedWorkout.id).then(w => {
          if (signal.aborted || !w.sets?.length) return
          const byExercise: Record<string, LiveSet[]> = {}
          const exMap: Record<string, { name: string; muscle: string }> = {}
          for (const s of w.sets) {
            if (!s.exercise_id) continue
            if (!byExercise[s.exercise_id]) {
              byExercise[s.exercise_id] = []
              exMap[s.exercise_id] = {
                name: s.exercise?.name || '',
                muscle: s.exercise?.muscle_group || '',
              }
            }
            byExercise[s.exercise_id].push({
              id: String(s.id),
              weight: String(s.weight_kg),
              reps: String(s.reps),
              saved: true,
              is_warmup: s.is_warmup,
              saving: false,
              set_number: s.set_number,
            })
          }
          const restored: ExerciseBlock[] = Object.entries(byExercise).map(([exId, sets]) => ({
            exercise_id: exId,
            exercise_name: exMap[exId]?.name || '',
            muscle_group: exMap[exId]?.muscle || '',
            sets,
            prevBest: '',
            recentHistory: [],
            collapsed: false,
          }))
          setBlocks(restored)
        }).catch(() => {})
      }
    })

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cardio loader ──
  const fetchCardioSessions = useCallback(async () => {
    setCardioLoading(true)
    try {
      const r = await api.get('/cardio', { params: { days: 1 } })
      setCardioSessions(r.data)
    } catch { /* ignore */ } finally {
      setCardioLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'cardio') fetchCardioSessions()
  }, [tab, fetchCardioSessions])

  // ── Computed ──
  const totalVolume = blocks
    .flatMap(b => b.sets)
    .filter(s => s.saved && !s.is_warmup)
    .reduce((sum, s) => sum + parseFloat(s.weight || '0') * parseInt(s.reps || '0'), 0)

  const totalSets = blocks.flatMap(b => b.sets).filter(s => s.saved).length

  // ── Set mutation helpers ──
  const updateSet = (blockIdx: number, setIdx: number, patch: Partial<LiveSet>) => {
    setBlocks(prev => {
      const next = [...prev]
      next[blockIdx] = {
        ...next[blockIdx],
        sets: next[blockIdx].sets.map((s, i) => i === setIdx ? { ...s, ...patch } : s),
      }
      return next
    })
  }

  const addSet = (blockIdx: number) => {
    setBlocks(prev => {
      const next = [...prev]
      const block = next[blockIdx]
      const last = block.sets[block.sets.length - 1]
      next[blockIdx] = {
        ...block,
        sets: [...block.sets, {
          weight: last?.weight ?? '0',
          reps: last?.reps ?? '8',
          saved: false,
          is_warmup: false,
          saving: false,
          set_number: block.sets.length + 1,
        }],
      }
      return next
    })
  }

  const removeSet = async (blockIdx: number, setIdx: number) => {
    const set = blocks[blockIdx].sets[setIdx]
    if (set.id && workout) {
      try {
        await workoutsApi.deleteSet(workout.id, set.id)
      } catch {
        toast.error('Failed to remove set')
        return
      }
    }
    setBlocks(prev => {
      const next = [...prev]
      const filtered = next[blockIdx].sets.filter((_, i) => i !== setIdx)
      if (filtered.length === 0) {
        return next.filter((_, i) => i !== blockIdx)
      }
      next[blockIdx] = {
        ...next[blockIdx],
        sets: filtered.map((s, i) => ({ ...s, set_number: i + 1 })),
      }
      return next
    })
  }

  const toggleCollapse = (idx: number) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, collapsed: !b.collapsed } : b))
  }

  // ── Core tick (save) logic ──
  const handleTick = async (blockIdx: number, setIdx: number) => {
    const block = blocks[blockIdx]
    const set = block.sets[setIdx]
    if (set.saving || !workout) return

    const w = parseFloat(set.weight)
    const r = parseInt(set.reps)
    if (isNaN(w) || isNaN(r) || r < 1) {
      toast.error('Enter weight and reps first')
      return
    }

    updateSet(blockIdx, setIdx, { saving: true })

    try {
      const payload = {
        exercise_id: block.exercise_id,
        set_number: set.set_number,
        weight_kg: w,
        reps: r,
        is_warmup: set.is_warmup,
      }

      let savedSet: any
      if (set.id) {
        savedSet = await workoutsApi.updateSet(workout.id, set.id, payload)
      } else {
        savedSet = await workoutsApi.addSet(workout.id, payload)
      }

      // Check for PR
      if (savedSet.is_pr) {
        setPrs(prev => [...prev, { exerciseName: block.exercise_name, weight_kg: w, reps: r }])
        setPrData({ weight: w, reps: r, exerciseName: block.exercise_name })
        setPrShow(true)
      }

      updateSet(blockIdx, setIdx, { saved: true, saving: false, id: savedSet.id })

      if (!set.is_warmup) {
        setShowRestTimer(true)
      }
    } catch {
      updateSet(blockIdx, setIdx, { saving: false })
      toast.error('Failed to save set — check connection')
    }
  }

  // ── Add exercise from picker ──
  const addExercise = async (ex: Exercise) => {
    setPickModal(false)
    const history = await workoutsApi.exerciseHistory(ex.id, 3).catch(() => [])
    const lastSession = history[0]
    const prevWeight = lastSession?.sets?.find((s: any) => !s.is_warmup)?.weight_kg?.toString() ?? '0'
    const prevReps = lastSession?.sets?.find((s: any) => !s.is_warmup)?.reps?.toString() ?? '8'
    const prevBestStr = lastSession ? `${prevWeight}kg × ${prevReps}` : ''

    const newBlock: ExerciseBlock = {
      exercise_id: ex.id,
      exercise_name: ex.name,
      muscle_group: ex.muscle_group,
      sets: [{ weight: prevWeight, reps: prevReps, saved: false, is_warmup: false, saving: false, set_number: 1 }],
      prevBest: prevBestStr,
      recentHistory: history,
      collapsed: false,
    }
    setBlocks(prev => [...prev, newBlock])
  }

  // ── Populate from today's plan ──
  const populateFromPlan = async (plan: TodayPlan) => {
    const newBlocks: ExerciseBlock[] = await Promise.all(
      plan.exercises.map(async (ex) => {
        const history = await workoutsApi.exerciseHistory(ex.exercise_id, 3).catch(() => [])
        const prevWeight = ex.previous_best?.weight_kg?.toString() ?? '0'
        const prevReps = ex.previous_best
          ? Math.round((ex.target_reps_min + ex.target_reps_max) / 2).toString()
          : ex.target_reps_min.toString()
        const prevBestStr = ex.previous_best
          ? `${ex.previous_best.weight_kg}kg × ${ex.previous_best.reps}`
          : ''

        const sets: LiveSet[] = Array.from({ length: ex.target_sets }, (_, i) => ({
          weight: prevWeight,
          reps: prevReps,
          saved: false,
          is_warmup: false,
          saving: false,
          set_number: i + 1,
        }))

        return {
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          sets,
          prevBest: prevBestStr,
          recentHistory: history,
          collapsed: false,
        }
      })
    )
    setBlocks(newBlocks)
  }

  // ── Begin workout ──
  const beginWorkout = async (fromPlan: TodayPlan | null, blank: boolean) => {
    if (creatingRef.current) return
    creatingRef.current = true
    setShowStartModal(false)
    try {
      const label = fromPlan ? fromPlan.split_day_label : 'Workout'
      const w = await workoutsApi.create({
        label,
        date: new Date().toISOString().slice(0, 10),
        split_day_id: fromPlan ? fromPlan.split_day_id : undefined,
      })
      setWorkout(w)
      setWorkoutLabel(label)
      storeSetWorkout(w)
      const now = Date.now()
      setStartTime(now)
      setPhase('active')

      if (fromPlan && !blank) {
        await populateFromPlan(fromPlan)
      }
      toast.success(fromPlan ? `Starting ${fromPlan.split_day_label}` : 'Workout started!')
    } catch {
      toast.error('Could not start workout')
    } finally {
      creatingRef.current = false
    }
  }

  // ── Finish workout ──
  const finishWorkout = async () => {
    if (!workout || finishingRef.current) return
    finishingRef.current = true
    const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
    try {
      await workoutsApi.update(workout.id, {
        duration_min: Math.round(durationSeconds / 60),
      })
    } catch {
      toast.error('Could not save workout summary')
    }
    setDurationOnFinish(durationSeconds)
    setPhase('finishing')
    finishingRef.current = false

    setTomorrowLoading(true)
    workoutsApi.todayPlan().then(plan => {
      setTomorrowPlan(plan)
      setTomorrowLoading(false)
    }).catch(() => setTomorrowLoading(false))
  }

  // ── Done (close post-workout modal) ──
  const handleDone = () => {
    clearActive()
    setWorkout(null)
    setBlocks([])
    setPhase('idle')
    setTomorrowPlan(null)
    setPrs([])
    setElapsed(0)
    setStartTime(null)
    queryClient.invalidateQueries({ queryKey: ['workouts'] })
    queryClient.invalidateQueries({ queryKey: ['today-plan'] })
    navigate('/')
  }

  // ── Voice logger helpers ──
  const handleVoiceParsed = (parsed: ParsedSet) => {
    if (!workout) return
    setBlocks(prev => {
      const next = [...prev]
      let targetIdx = next.length - 1
      if (parsed.exercise_name) {
        const nameMatch = parsed.exercise_name.toLowerCase()
        const found = next.findIndex(bl => bl.exercise_name.toLowerCase().includes(nameMatch))
        if (found !== -1) targetIdx = found
      }
      if (targetIdx < 0 || !next[targetIdx]) return prev
      const block = { ...next[targetIdx] }
      const sets = [...block.sets]
      const setIdx = sets.findIndex(s => !s.saved)
      const idx = setIdx !== -1 ? setIdx : sets.length - 1
      if (idx < 0) return prev
      sets[idx] = {
        ...sets[idx],
        ...(parsed.weight_kg !== undefined ? { weight: String(parsed.weight_kg) } : {}),
        ...(parsed.reps !== undefined ? { reps: String(parsed.reps) } : {}),
        saved: false,
      }
      block.sets = sets
      block.collapsed = false
      next[targetIdx] = block
      return next
    })
  }

  // ── Cardio helpers ──
  const setCardio = (field: keyof CardioForm, value: string) =>
    setCardioForm(f => ({ ...f, [field]: value }))

  const logCardio = async () => {
    const duration = parseFloat(cardioForm.duration_min)
    if (!duration || duration <= 0) { toast.error('Please enter a valid duration'); return }
    setSavingCardio(true)
    try {
      const payload: any = { date: today, cardio_type: cardioForm.cardio_type, duration_min: duration }
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
    } catch { toast.error('Failed to remove') }
  }

  // ── Exercise picker ──
  const muscleGroups = ['All', ...Array.from(new Set(exercises.map(e => e.muscle_group))).sort()]
  const filteredExercises = exercises
    .filter(e => muscleFilter === 'All' || e.muscle_group === muscleFilter)
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  const grouped = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = []
    acc[ex.muscle_group].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  // Current block for voice context
  const currentBlockIdx = blocks.findIndex(b => b.sets.some(s => !s.saved))
  const currentBlock = currentBlockIdx !== -1 ? blocks[currentBlockIdx] : blocks[blocks.length - 1] ?? null
  const currentUnsavedSet = currentBlock?.sets.find(s => !s.saved) ?? null
  const lastWeight = parseFloat(currentUnsavedSet?.weight ?? currentBlock?.prevBest?.split('kg')[0] ?? '0') || 0
  const lastReps = parseInt(currentUnsavedSet?.reps ?? '0') || 0

  const cardioLabel = CARDIO_TYPES.find(c => c.value === cardioForm.cardio_type)
  const currentType = cardioForm.cardio_type
  const showLevel = USE_LEVEL.includes(currentType)
  const showSpeed = USE_SPEED.includes(currentType)
  const showRpm   = USE_RPM.includes(currentType)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page px-4">
      {/* PR Celebration */}
      <PrCelebration
        show={prShow}
        weight={prData.weight}
        reps={prData.reps}
        exerciseName={prData.exerciseName}
        onClose={() => setPrShow(false)}
      />

      {/* Post-workout modal */}
      <PostWorkoutModal
        open={phase === 'finishing'}
        durationSeconds={durationOnFinish}
        totalSets={totalSets}
        totalVolume={totalVolume}
        prs={prs}
        tomorrowPlan={tomorrowPlan}
        tomorrowLoading={tomorrowLoading}
        onDone={handleDone}
      />

      {/* Start modal */}
      <WorkoutStartModal
        open={showStartModal}
        todayPlan={todayPlan}
        onStartFromSplit={() => beginWorkout(todayPlan ?? null, false)}
        onStartBlank={() => beginWorkout(null, true)}
        onClose={() => setShowStartModal(false)}
      />

      {/* Rest timer */}
      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
            onClose={() => setShowRestTimer(false)}
            onComplete={() => setShowRestTimer(false)}
          />
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4">
        {[
          { id: 'lift',   icon: <Dumbbell className="w-4 h-4" />, label: 'Lift'   },
          { id: 'cardio', icon: <Bike className="w-4 h-4" />,     label: 'Cardio' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── LIFT TAB ── */}
        {tab === 'lift' && (
          <motion.div key="lift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {phase === 'idle' && (
              <>
                <PageHeader
                  title="Workout"
                  subtitle={todayPlan ? todayPlan.split_day_label : 'Track your training'}
                />

                {/* Today's plan preview */}
                {todayPlan && (
                  <div className="bg-bg-card border border-border rounded-2xl p-4 mb-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
                      Today's Plan — {todayPlan.split_name}
                    </p>
                    <p className="font-bold text-text-primary mb-1">{todayPlan.split_day_label}</p>
                    <div className="space-y-1">
                      {todayPlan.exercises.slice(0, 5).map(ex => (
                        <div key={ex.exercise_id} className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary">{ex.exercise_name}</span>
                          <span className="text-xs text-text-muted">{ex.target_sets}×{ex.target_reps_min}–{ex.target_reps_max}</span>
                        </div>
                      ))}
                      {todayPlan.exercises.length > 5 && (
                        <p className="text-xs text-text-muted">+{todayPlan.exercises.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowStartModal(true)}
                  className="w-full py-4 bg-primary-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                >
                  <Dumbbell className="w-6 h-6" />
                  Start Workout
                </button>
              </>
            )}

            {phase === 'active' && (
              <>
                {/* Sticky header */}
                <div className="sticky top-0 z-20 bg-bg-primary/95 backdrop-blur-sm -mx-4 px-4 pt-safe pb-3 border-b border-border mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-700 animate-pulse" />
                      <span className="text-lg font-mono font-bold text-text-primary">{formatElapsed(elapsed)}</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary truncate max-w-[120px]">{workoutLabel}</span>
                    <span className="text-sm text-text-muted">{formatWeight(totalVolume, useKg)}</span>
                  </div>
                </div>

                {/* Exercise blocks */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {blocks.map((block, blockIdx) => (
                      <motion.div
                        key={block.exercise_id + blockIdx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <div className="bg-bg-card border border-border rounded-2xl mb-3 overflow-hidden">
                          {/* Exercise header */}
                          <button
                            onClick={() => toggleCollapse(blockIdx)}
                            className="w-full flex items-center justify-between p-4"
                          >
                            <div className="flex-1 text-left">
                              <p className="font-bold text-text-primary">{block.exercise_name}</p>
                              {block.prevBest && (
                                <p className="text-xs text-text-muted mt-0.5">Previous: {block.prevBest}</p>
                              )}
                            </div>
                            <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${block.collapsed ? '' : 'rotate-180'}`} />
                          </button>

                          {!block.collapsed && (
                            <div className="px-4 pb-4">
                              {/* Column headers */}
                              <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 mb-2 text-[11px] text-text-muted uppercase tracking-wide px-1">
                                <span>Set</span>
                                <span className="text-center">kg</span>
                                <span className="text-center">Reps</span>
                                <span />
                              </div>

                              {block.sets.map((set, setIdx) => (
                                <SetRow
                                  key={setIdx}
                                  set={set}
                                  setIdx={setIdx}
                                  blockIdx={blockIdx}
                                  onWeightChange={val => updateSet(blockIdx, setIdx, { weight: val, saved: false })}
                                  onRepsChange={val => updateSet(blockIdx, setIdx, { reps: val, saved: false })}
                                  onTick={() => handleTick(blockIdx, setIdx)}
                                  onRemove={() => removeSet(blockIdx, setIdx)}
                                  onToggleWarmup={() => updateSet(blockIdx, setIdx, { is_warmup: !set.is_warmup, saved: false })}
                                  useKg={useKg}
                                />
                              ))}

                              {/* Recent history */}
                              {block.recentHistory.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border">
                                  <p className="text-xs text-text-muted mb-1.5">Recent sessions</p>
                                  <div className="space-y-1">
                                    {block.recentHistory.slice(0, 3).map((session: any, i: number) => {
                                      const workingSets = (session.sets || []).filter((s: any) => !s.is_warmup)
                                      const best = workingSets.reduce((a: any, b: any) => b.weight_kg > a.weight_kg ? b : a, workingSets[0])
                                      return (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                          <span className="text-text-muted">{new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                          <span className="text-text-secondary">{workingSets.length} sets · Best: {formatWeight(best?.weight_kg ?? 0, useKg)} × {best?.reps}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Add Set */}
                              <button
                                onClick={() => addSet(blockIdx)}
                                className="w-full py-2 mt-2 border border-dashed border-border rounded-xl text-sm text-text-muted flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-4 h-4" /> Add Set
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add Exercise */}
                  <Button variant="secondary" fullWidth onClick={() => setPickModal(true)} className="border-dashed border-border">
                    <Plus className="w-4 h-4" /> Add Exercise
                  </Button>
                </div>

                {/* Floating Finish button */}
                <div className="sticky bottom-24 z-20 mt-6">
                  <button
                    onClick={finishWorkout}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-base shadow-lg"
                  >
                    Finish Workout
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── CARDIO TAB ── */}
        {tab === 'cardio' && (
          <motion.div key="cardio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card padding="md">
              <h3 className="font-semibold text-text-primary mb-4">Log Cardio Session</h3>

              {/* Cardio type picker */}
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Type</p>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5">
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

              <div className="mb-3">
                <Input label="Duration (minutes)" type="number" placeholder="30"
                  value={cardioForm.duration_min} onChange={e => setCardio('duration_min', e.target.value)} />
              </div>

              <div className="space-y-3 mb-4">
                {showLevel && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1.5">Resistance Level</p>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => setCardio('level', cardioForm.level === String(lvl) ? '' : String(lvl))}
                          className={`h-8 rounded-lg text-xs font-semibold transition-colors ${cardioForm.level === String(lvl) ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showRpm && (
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">RPM (optional)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder='80  or  "60-80"'
                      value={cardioForm.rpm}
                      onChange={e => setCardio('rpm', e.target.value)}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                    />
                  </div>
                )}

                {showSpeed && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Speed (km/h)" type="number" placeholder="6.5"
                      value={cardioForm.speed_kmh} onChange={e => setCardio('speed_kmh', e.target.value)} />
                    <Input label="Incline (%)" type="number" placeholder="0"
                      value={cardioForm.incline_pct} onChange={e => setCardio('incline_pct', e.target.value)} />
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
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
              ) : cardioSessions.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  <span className="text-3xl block mb-2">🚴</span>No cardio logged today
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
                                  <span className="text-sm font-bold text-accent-orange">~{Math.round(session.calories_burned)} kcal</span>
                                )}
                                <button onClick={() => deleteCardio(session.id)} className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-accent-red transition-colors">
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

      {/* Voice logger */}
      {workout && tab === 'lift' && phase === 'active' && (
        <VoiceLogger
          onSetParsed={handleVoiceParsed}
          context={{
            exercise_name: currentBlock?.exercise_name,
            last_weight: lastWeight,
            last_reps: lastReps,
          }}
        />
      )}

      {/* Exercise picker modal */}
      <Modal open={pickModal} onClose={() => setPickModal(false)} title="Add Exercise" size="lg">
        <div className="space-y-3">
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {muscleGroups.map(mg => (
              <button
                key={mg}
                onClick={() => setMuscleFilter(mg)}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${muscleFilter === mg ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4 mt-4">
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
