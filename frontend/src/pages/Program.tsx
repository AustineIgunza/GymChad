import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Target,
  Flame,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  Dumbbell,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useToast } from '../stores/uiStore'
import {
  programApi,
  type ActiveProgram,
  type TodayWorkout,
  type ProgramGoal,
  type ExperienceLevel,
  type EquipmentOption,
  type ProgressionInfo,
} from '../services/program'

// ── Constants ──────────────────────────────────────────────────────────────────

const GOALS: { id: ProgramGoal; emoji: string; label: string; subtitle: string }[] = [
  { id: 'build_muscle',    emoji: '💪', label: 'Build Muscle',     subtitle: 'Hypertrophy-focused training' },
  { id: 'get_stronger',   emoji: '🏋️', label: 'Get Stronger',     subtitle: 'Powerlifting-style strength' },
  { id: 'lose_weight',    emoji: '🔥', label: 'Lose Weight',       subtitle: 'High volume fat loss' },
  { id: 'general_fitness',emoji: '⭐', label: 'General Fitness',   subtitle: 'Balanced all-rounder' },
]

const LEVELS: { id: ExperienceLevel; label: string; sub: string }[] = [
  { id: 'beginner',     label: 'Beginner',     sub: '0–1 years' },
  { id: 'intermediate', label: 'Intermediate', sub: '1–3 years' },
  { id: 'advanced',     label: 'Advanced',     sub: '3+ years' },
]

const DAYS_OPTIONS = [3, 4, 5, 6, 7]

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  'Barbell',
  'Dumbbells',
  'Cable Machine',
  'Smith Machine',
  'Resistance Bands',
  'Bodyweight Only',
]

const DURATION_OPTIONS = [8, 12, 16] as const

const LOADING_MESSAGES = [
  'Analyzing your goals...',
  'Calculating progressive overload...',
  'Generating week-by-week plan...',
  'Optimizing exercise selection...',
  'Finalizing your program...',
]

// ── Wizard state types ─────────────────────────────────────────────────────────

interface WizardState {
  goal: ProgramGoal
  level: ExperienceLevel
  daysPerWeek: number
  equipment: EquipmentOption[]
  durationWeeks: 8 | 12 | 16
}

// ── Slide animation variants ───────────────────────────────────────────────────

const makeSlideVariants = (direction: 1 | -1) => ({
  initial: { x: direction * 60, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit:    { x: direction * -60, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
})

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.35 }}
          transition={{ duration: 0.25 }}
          className={`h-2 rounded-full ${i <= current ? 'bg-primary-600' : 'bg-border'}`}
        />
      ))}
    </div>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

// ── Step 1: Goal ───────────────────────────────────────────────────────────────

function GoalStep({ value, onChange }: { value: ProgramGoal; onChange: (v: ProgramGoal) => void }) {
  return (
    <>
      <StepHeading title="What's your main goal?" subtitle="This shapes every aspect of your program." />
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map(g => {
          const selected = value === g.id
          return (
            <motion.button
              key={g.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(g.id)}
              className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 ${
                selected
                  ? 'bg-primary-700/10 border-primary-600'
                  : 'bg-bg-card border-border hover:border-primary-700/40 hover:bg-bg-hover'
              }`}
            >
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
              <span className="text-2xl mb-2">{g.emoji}</span>
              <span className="font-semibold text-text-primary text-sm leading-tight">{g.label}</span>
              <span className="text-xs text-text-muted mt-0.5 leading-tight">{g.subtitle}</span>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

// ── Step 2: Level ──────────────────────────────────────────────────────────────

function LevelStep({ value, onChange }: { value: ExperienceLevel; onChange: (v: ExperienceLevel) => void }) {
  return (
    <>
      <StepHeading title="Your experience level" subtitle="Honest assessment = better results." />
      <div className="flex flex-col gap-3">
        {LEVELS.map(l => {
          const selected = value === l.id
          return (
            <motion.button
              key={l.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(l.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                selected
                  ? 'bg-primary-700/10 border-primary-600'
                  : 'bg-bg-card border-border hover:border-primary-700/40 hover:bg-bg-hover'
              }`}
            >
              <div className="text-left">
                <p className="font-semibold text-text-primary">{l.label}</p>
                <p className="text-xs text-text-muted">{l.sub}</p>
              </div>
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

// ── Step 3: Days per week ──────────────────────────────────────────────────────

function DaysStep({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <>
      <StepHeading title="Days per week" subtitle="How many days can you commit to training?" />
      <div className="flex gap-3 justify-center">
        {DAYS_OPTIONS.map(d => {
          const selected = value === d
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.92 }}
              onClick={() => onChange(d)}
              className={`w-12 h-12 rounded-2xl font-bold text-base border transition-all duration-200 ${
                selected
                  ? 'bg-primary-700 border-primary-600 text-white shadow-glow-sm'
                  : 'bg-bg-card border-border text-text-primary hover:border-primary-700/40 hover:bg-bg-hover'
              }`}
            >
              {d}
            </motion.button>
          )
        })}
      </div>
      <p className="text-center text-sm text-text-muted mt-4">
        {value} day{value !== 1 ? 's' : ''} / week selected
      </p>
    </>
  )
}

// ── Step 4: Equipment ──────────────────────────────────────────────────────────

function EquipmentStep({
  value,
  onChange,
}: {
  value: EquipmentOption[]
  onChange: (v: EquipmentOption[]) => void
}) {
  const toggle = (eq: EquipmentOption) => {
    if (value.includes(eq)) {
      onChange(value.filter(e => e !== eq))
    } else {
      onChange([...value, eq])
    }
  }

  return (
    <>
      <StepHeading title="Available equipment" subtitle="Select everything you have access to." />
      <div className="flex flex-wrap gap-2.5">
        {EQUIPMENT_OPTIONS.map(eq => {
          const selected = value.includes(eq)
          return (
            <motion.button
              key={eq}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggle(eq)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                selected
                  ? 'bg-primary-700 border-primary-600 text-white'
                  : 'bg-bg-card border-border text-text-primary hover:border-primary-700/40 hover:bg-bg-hover'
              }`}
            >
              {selected && <Check className="w-3 h-3" />}
              {eq}
            </motion.button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-accent-orange mt-3">Select at least one option.</p>
      )}
    </>
  )
}

// ── Step 5: Duration ───────────────────────────────────────────────────────────

function DurationStep({
  value,
  onChange,
}: {
  value: 8 | 12 | 16
  onChange: (v: 8 | 12 | 16) => void
}) {
  return (
    <>
      <StepHeading title="Program duration" subtitle="Longer programs allow for more progressive overload." />
      <div className="flex flex-col gap-3">
        {DURATION_OPTIONS.map(w => {
          const selected = value === w
          const isDefault = w === 12
          return (
            <motion.button
              key={w}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(w)}
              className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                selected
                  ? 'bg-primary-700/10 border-primary-600'
                  : 'bg-bg-card border-border hover:border-primary-700/40 hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl text-text-primary">{w}</span>
                <div className="text-left">
                  <p className="font-semibold text-text-primary text-sm">weeks</p>
                  <p className="text-xs text-text-muted">
                    {w === 8 ? 'Quick transformation' : w === 12 ? 'Optimal balance' : 'Maximum gains'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isDefault && (
                  <span className="text-xs font-semibold text-primary-400 bg-primary-700/15 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

// ── Step 6: Loading ────────────────────────────────────────────────────────────

function LoadingStep({ durationWeeks }: { durationWeeks: number }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 500)

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 90))
    }, 100)

    return () => {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-primary-700/20 border border-primary-700/40 flex items-center justify-center mb-6"
      >
        <Brain className="w-8 h-8 text-primary-400" />
      </motion.div>

      <h2 className="text-lg font-bold text-text-primary mb-2">
        Building your {durationWeeks}-week program with AI...
      </h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-text-muted mb-8 text-center"
        >
          {LOADING_MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>

      <div className="w-full max-w-xs">
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-700 to-primary-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-text-disabled text-center mt-2">{progress}%</p>
      </div>
    </div>
  )
}

// ── Mode B: Active Program View ────────────────────────────────────────────────

function ActiveProgramView({
  program,
  today,
  onSkip,
  onRefresh,
}: {
  program: ActiveProgram
  today: TodayWorkout | null
  onSkip: () => void
  onRefresh: () => void
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [skipping, setSkipping] = useState(false)
  const [progressions, setProgressions] = useState<ProgressionInfo[]>([])

  // Day progress within current week
  const totalDays = program.duration_weeks * program.days_per_week
  const completedDays = (program.current_week - 1) * program.days_per_week +
    (program.week_days?.filter(d => d.completed).length ?? 0)
  const dayProgress = Math.round((completedDays / totalDays) * 100)

  // Fetch progressions for exercises that got bumped up
  useEffect(() => {
    if (!today?.exercises?.length) return
    Promise.allSettled(
      today.exercises.map(ex => programApi.progression(ex.exercise_id))
    ).then(results => {
      const bumped = results
        .filter((r): r is PromiseFulfilledResult<ProgressionInfo> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(p => p.bumped_up)
      setProgressions(bumped)
    })
  }, [today])

  const handleSkip = async () => {
    setSkipping(true)
    try {
      await programApi.advance()
      toast.success('Day skipped! Moving to next session.')
      onSkip()
    } catch {
      toast.error('Failed to skip today. Please try again.')
    } finally {
      setSkipping(false)
    }
  }

  // 7-day week pills
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card padding="md">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-semibold text-primary-400 uppercase tracking-wide">Active Program</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary">{program.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary">
              Week {program.current_week}
              <span className="text-text-muted font-normal"> / {program.duration_weeks}</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Overall progress</span>
            <span>{dayProgress}%</span>
          </div>
          <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dayProgress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-700 to-primary-500 rounded-full"
            />
          </div>
        </div>
      </Card>

      {/* Today's workout card */}
      {today ? (
        <Card padding="md" className="border-primary-700/30">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-primary-400 uppercase tracking-wide">Today's Workout</span>
          </div>
          <h3 className="text-base font-bold text-text-primary mb-0.5">
            Day {today.day_number} — {today.label}
          </h3>
          {today.focus && (
            <p className="text-sm text-text-muted mb-4">{today.focus}</p>
          )}

          {/* Exercise list */}
          <div className="space-y-2 mb-5">
            {today.exercises.map((ex, i) => (
              <motion.div
                key={ex.exercise_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 bg-bg-tertiary rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{ex.exercise_name}</p>
                  <p className="text-xs text-text-muted">
                    {ex.sets} × {ex.reps_min}–{ex.reps_max} reps
                    {ex.target_rpe != null && ` · RPE ${ex.target_rpe}`}
                  </p>
                </div>
                {ex.recommended_weight_kg != null && (
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <span className="text-sm font-bold text-primary-400">
                      {ex.recommended_weight_kg}kg
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/workout')}
              className="sm:flex-1"
            >
              <Target className="w-4 h-4" />
              Start Today's Workout
            </Button>
            <Button
              variant="ghost"
              size="lg"
              loading={skipping}
              onClick={handleSkip}
              className="sm:flex-1 border border-border"
            >
              Skip Today
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="md">
          <div className="flex flex-col items-center py-4 text-center">
            <Star className="w-8 h-8 text-text-muted mb-2" />
            <p className="font-semibold text-text-primary">No workout today</p>
            <p className="text-sm text-text-muted">This is a rest day — recovery is part of the program.</p>
          </div>
        </Card>
      )}

      {/* Weekly overview */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-text-primary text-sm">This Week</h3>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(program.week_days ?? []).map((day, i) => {
            const isToday = today ? day.day_number === today.day_number : false
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                <span className="text-xs text-text-disabled">{dayLabels[i] ?? `D${i + 1}`}</span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold transition-colors ${
                    isToday
                      ? 'bg-primary-700 text-white ring-2 ring-primary-500/50'
                      : day.completed
                      ? 'bg-bg-hover text-primary-400 border border-primary-700/30'
                      : day.is_rest
                      ? 'bg-bg-tertiary text-text-disabled border border-border'
                      : 'bg-bg-card text-text-muted border border-border'
                  }`}
                >
                  {day.is_rest ? '—' : day.label?.slice(0, 3) ?? `D${day.day_number}`}
                </div>
                {day.completed && (
                  <Check className="w-3 h-3 text-primary-400" />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Progression section */}
      {progressions.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            <h3 className="font-semibold text-text-primary text-sm">Weight Bumps This Week</h3>
          </div>
          <div className="space-y-2">
            {progressions.map(p => (
              <div key={p.exercise_id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{p.exercise_name}</p>
                  <p className="text-xs text-text-muted">{p.recommendation}</p>
                </div>
                {p.increment_kg != null && (
                  <div className="flex items-center gap-1 ml-3">
                    <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
                    <span className="text-sm font-bold text-accent-green">+{p.increment_kg}kg</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Danger zone: delete program */}
      <div className="flex justify-center pb-4">
        <button
          onClick={async () => {
            if (!confirm('Are you sure you want to delete this program? This cannot be undone.')) return
            try {
              await programApi.delete(program.id)
              toast.success('Program deleted.')
              onRefresh()
            } catch {
              toast.error('Failed to delete program.')
            }
          }}
          className="text-xs text-text-disabled hover:text-accent-red transition-colors"
        >
          Delete program
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TOTAL_WIZARD_STEPS = 6

export function ProgramPage() {
  const toast = useToast()

  // Mode: null = loading, 'onboarding' = wizard, 'active' = program view
  const [mode, setMode] = useState<null | 'onboarding' | 'active'>(null)
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null)

  // Wizard state
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [generating, setGenerating] = useState(false)

  const [wizard, setWizard] = useState<WizardState>({
    goal: 'build_muscle',
    level: 'beginner',
    daysPerWeek: 4,
    equipment: ['Barbell', 'Dumbbells', 'Cable Machine'],
    durationWeeks: 12,
  })

  // Fetch active program on mount
  const fetchProgram = async () => {
    try {
      const [prog, today] = await Promise.all([
        programApi.current(),
        programApi.today().catch(() => null),
      ])
      setActiveProgram(prog)
      setTodayWorkout(today)
      setMode('active')
    } catch {
      // 404 = no active program → show wizard
      setMode('onboarding')
    }
  }

  useEffect(() => { fetchProgram() }, [])

  // Navigate wizard steps
  const goNext = () => {
    setDirection(1)
    setStep(s => s + 1)
  }
  const goBack = () => {
    setDirection(-1)
    setStep(s => s - 1)
  }

  // Validate current step before allowing "Next"
  const canProceed = (): boolean => {
    if (step === 3) return wizard.equipment.length > 0
    return true
  }

  // Final step: generate
  const handleGenerate = async () => {
    setGenerating(true)
    setDirection(1)
    setStep(5) // loading step

    try {
      const program = await programApi.generate({
        goal: wizard.goal,
        level: wizard.level,
        days_per_week: wizard.daysPerWeek,
        available_equipment: wizard.equipment,
        duration_weeks: wizard.durationWeeks,
      })
      // Small pause so users see the loading animation complete
      await new Promise(r => setTimeout(r, 800))
      const today = await programApi.today().catch(() => null)
      setActiveProgram(program)
      setTodayWorkout(today)
      setMode('active')
    } catch {
      toast.error('Failed to generate program. Please try again.')
      setGenerating(false)
      setStep(4)
    }
  }

  const slideVariants = makeSlideVariants(direction)

  // ── Loading state ──────────────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="page px-4 flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-12 h-12 rounded-2xl bg-primary-700/30 flex items-center justify-center"
        >
          <Dumbbell className="w-6 h-6 text-primary-400" />
        </motion.div>
      </div>
    )
  }

  // ── Active program view ────────────────────────────────────────────────────
  if (mode === 'active' && activeProgram) {
    return (
      <div className="page px-4">
        <div className="pt-14 pb-2 md:pt-8 md:px-4">
          <h1 className="text-2xl font-bold text-text-primary">My Program</h1>
          <p className="text-sm text-text-muted mt-0.5">AI-generated training plan</p>
        </div>
        <div className="mt-2 max-w-2xl mx-auto">
          <ActiveProgramView
            program={activeProgram}
            today={todayWorkout}
            onSkip={fetchProgram}
            onRefresh={() => {
              setActiveProgram(null)
              setMode('onboarding')
              setStep(0)
            }}
          />
        </div>
      </div>
    )
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  const isLastConfigStep = step === 4
  const isLoadingStep = step === 5

  return (
    <div className="page px-4">
      <div className="pt-14 pb-2 md:pt-8 md:px-4">
        <h1 className="text-2xl font-bold text-text-primary">Build My Program</h1>
        <p className="text-sm text-text-muted mt-0.5">Answer a few questions to get a personalized plan.</p>
      </div>

      <div className="mt-4 max-w-2xl mx-auto">
        {!isLoadingStep && <StepDots total={TOTAL_WIZARD_STEPS} current={step} />}

        {/* Step content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {step === 0 && (
              <GoalStep value={wizard.goal} onChange={v => setWizard(w => ({ ...w, goal: v }))} />
            )}
            {step === 1 && (
              <LevelStep value={wizard.level} onChange={v => setWizard(w => ({ ...w, level: v }))} />
            )}
            {step === 2 && (
              <DaysStep value={wizard.daysPerWeek} onChange={v => setWizard(w => ({ ...w, daysPerWeek: v }))} />
            )}
            {step === 3 && (
              <EquipmentStep value={wizard.equipment} onChange={v => setWizard(w => ({ ...w, equipment: v }))} />
            )}
            {step === 4 && (
              <DurationStep
                value={wizard.durationWeeks}
                onChange={v => setWizard(w => ({ ...w, durationWeeks: v }))}
              />
            )}
            {step === 5 && (
              <LoadingStep durationWeeks={wizard.durationWeeks} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!isLoadingStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 mt-8"
          >
            {step > 0 && (
              <Button variant="secondary" size="lg" onClick={goBack} className="flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}

            {isLastConfigStep ? (
              <Button
                fullWidth
                size="lg"
                disabled={!canProceed() || generating}
                loading={generating}
                onClick={handleGenerate}
              >
                <Flame className="w-4 h-4" />
                Generate My Program
              </Button>
            ) : (
              <Button
                fullWidth
                size="lg"
                disabled={!canProceed()}
                onClick={goNext}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ProgramPage
