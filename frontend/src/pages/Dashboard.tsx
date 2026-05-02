import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Dumbbell, Settings, ChevronRight, Zap, TrendingUp, ChevronDown, Footprints } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../stores/uiStore'
import { workoutsApi } from '../services/workouts'
import { nutritionApi } from '../services/nutrition'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MacroRing } from '../components/ui/MacroRing'
import type { Workout, DailySummary } from '../types'

const MUSCLE_COLORS: Record<string, string> = {
  CHEST: '#dc2626', BACK: '#1d4ed8', SHOULDERS: '#60a5fa',
  BICEPS: '#22c55e', TRICEPS: '#f97316', LEGS: '#eab308',
  GLUTES: '#ec4899', CORE: '#06b6d4', CARDIO: '#84cc16', FULL_BODY: '#8b5cf6',
}

interface TodayActivity {
  date: string
  steps: number
  calories_from_steps: number
  cardio_calories: number
  lifting_calories: number
  working_sets: number
  bmr: number | null
  total_burned: number
  calorie_target: number | null
}

export function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([])
  const [nutrition, setNutrition] = useState<DailySummary | null>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [activity, setActivity] = useState<TodayActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [recsExpanded, setRecsExpanded] = useState(false)
  const [stepsInput, setStepsInput] = useState('')
  const [savingSteps, setSavingSteps] = useState(false)
  const [showStepsInput, setShowStepsInput] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const fetchAll = async () => {
    const [w, n, recs, act] = await Promise.all([
      workoutsApi.today().catch(() => []),
      nutritionApi.getDay(today).catch(() => null),
      workoutsApi.recommendations().catch(() => []),
      api.get('/cardio/activity/today').then(r => r.data).catch(() => null),
    ])
    setTodayWorkouts(w)
    setNutrition(n)
    setRecommendations(recs.filter((r: any) => r.suggested_weight_kg !== null))
    setActivity(act)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [today])

  const logSteps = async () => {
    const steps = parseInt(stepsInput)
    if (!steps || steps < 0) return
    setSavingSteps(true)
    // Optimistic update — show immediately, no waiting
    setActivity(prev => prev ? { ...prev, steps } : prev)
    setShowStepsInput(false)
    setStepsInput('')
    try {
      await api.post('/cardio/activity', { date: today, steps })
      // Refresh with accurate server data in background
      api.get('/cardio/activity/today').then(r => setActivity(r.data)).catch(() => {})
    } catch {
      toast.error('Failed to save steps')
      fetchAll() // revert
    } finally {
      setSavingSteps(false)
    }
  }

  const totalSets = todayWorkouts.reduce((acc, w) => acc + (w.sets || []).filter(s => !s.is_warmup).length, 0)
  const musclesHit = [...new Set(todayWorkouts.flatMap(w => (w.sets || []).map(s => s.exercise?.muscle_group).filter(Boolean)))]

  // Net calories = burned - eaten
  const caloriesEaten = nutrition?.total_calories || 0
  const caloriesBurned = activity?.total_burned || 0
  const netCalories = caloriesBurned - caloriesEaten

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

  return (
    <div className="page px-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-14 pb-2">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-text-muted text-sm">
            {greeting}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-2xl font-bold text-text-primary">
            {user?.name || 'Athlete'} 👋
          </motion.h1>
        </div>
        <Link to="/settings">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border flex items-center justify-center"
          >
            <Settings className="w-5 h-5 text-text-muted" />
          </motion.div>
        </Link>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 mt-4">

        {/* Start Workout CTA */}
        <motion.div variants={item}>
          <motion.div
            onClick={() => navigate('/workout')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-blue-900 p-5 cursor-pointer"
          >
            <motion.div
              animate={{ x: [0, 10, 0], y: [0, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 right-0 w-32 h-32 bg-blue-500/15 rounded-full -translate-y-8 translate-x-8"
            />
            <motion.div
              animate={{ x: [0, -5, 0], y: [0, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-0 left-8 w-20 h-20 bg-primary-500/10 rounded-full translate-y-8"
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary-200" />
                <span className="text-primary-200 text-sm font-medium">Ready to train?</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Start Workout</h2>
              <p className="text-primary-200 text-sm mb-4">
                {totalSets > 0 ? `${totalSets} working sets logged today` : 'No workout logged today yet'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 border-white/20 text-white hover:bg-white/25"
                onClick={(e) => { e.stopPropagation(); navigate('/workout') }}
              >
                <Play className="w-3.5 h-3.5" />
                Begin Session
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* TDEE / Daily Energy Balance */}
        <motion.div variants={item}>
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-text-primary">Daily Energy</h3>
                <p className="text-xs text-text-disabled">BMR estimated · adjust targets in <Link to="/settings" className="text-primary-400">Settings</Link></p>
              </div>
              <button
                onClick={() => setShowStepsInput(s => !s)}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Footprints className="w-3.5 h-3.5" />
                {activity?.steps ? `${activity.steps.toLocaleString()} steps` : 'Log steps'}
              </button>
            </div>

            <AnimatePresence>
              {showStepsInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="flex gap-2 p-3 bg-bg-tertiary rounded-xl">
                    <Input
                      placeholder="Steps today"
                      type="number"
                      value={stepsInput}
                      onChange={e => setStepsInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && logSteps()}
                      className="flex-1"
                    />
                    <Button size="sm" loading={savingSteps} onClick={logSteps}>Save</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-lg" />)}
              </div>
            ) : activity ? (
              <>
                <div className="space-y-2">
                  {[
                    { label: 'BMR (base)', val: activity.bmr, icon: '🔥', color: 'text-accent-orange' },
                    { label: 'Steps', val: activity.calories_from_steps, icon: '👟', color: 'text-accent-blue' },
                    { label: 'Cardio', val: activity.cardio_calories, icon: '🚴', color: 'text-accent-green' },
                    { label: `Lifting (${activity.working_sets} sets)`, val: activity.lifting_calories, icon: '🏋️', color: 'text-primary-400' },
                  ].map(({ label, val, icon, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                        <span>{icon}</span>{label}
                      </span>
                      <span className={`text-xs font-semibold ${color}`}>
                        {val ? `${Math.round(val)} kcal` : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text-secondary">Total Burned</span>
                    <span className="text-sm font-bold text-text-primary">{Math.round(caloriesBurned)} kcal</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-secondary">Eaten</span>
                    <span className="text-sm font-bold text-text-primary">{Math.round(caloriesEaten)} kcal</span>
                  </div>

                  {/* Net calories bar */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-bg-tertiary">
                    <span className="text-xs text-text-muted">Net</span>
                    <span className={`text-sm font-bold ${netCalories >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {netCalories >= 0 ? '+' : ''}{Math.round(netCalories)} kcal
                    </span>
                    <span className="text-xs text-text-muted">
                      {netCalories >= 300 ? '📉 Deficit' : netCalories <= -300 ? '🔥 Surplus' : '⚖️ Maintenance'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-muted text-sm">Complete onboarding to see TDEE</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Today's nutrition */}
        <motion.div variants={item}>
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">Today's Nutrition</h3>
              <Link to="/nutrition" className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300 transition-colors">
                Log food <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="skeleton h-40 w-40 rounded-full" />
              </div>
            ) : (
              <div className="flex justify-center">
                <MacroRing
                  calories={nutrition?.total_calories || 0}
                  target={user?.calorie_target || 2000}
                  protein={nutrition?.total_protein_g || 0}
                  carbs={nutrition?.total_carbs_g || 0}
                  fat={nutrition?.total_fat_g || 0}
                  size={160}
                />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Muscle groups hit today */}
        {musclesHit.length > 0 && (
          <motion.div variants={item}>
            <Card padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary">Today's Muscles</h3>
                <Dumbbell className="w-4 h-4 text-text-muted" />
              </div>
              <div className="flex flex-wrap gap-2">
                {musclesHit.map((m, i) => (
                  <motion.span
                    key={m}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${MUSCLE_COLORS[m!]}20`, color: MUSCLE_COLORS[m!] }}
                  >
                    {m}
                  </motion.span>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Progressive overload recommendations */}
        {recommendations.length > 0 && (
          <motion.div variants={item}>
            <Card padding="none">
              <button
                onClick={() => setRecsExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-green/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-text-primary text-sm">Coach Tips</p>
                    <p className="text-xs text-text-muted">{recommendations.length} progressive overload suggestions</p>
                  </div>
                </div>
                <motion.div animate={{ rotate: recsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                </motion.div>
              </button>

              <AnimatePresence>
                {recsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                      {recommendations.slice(0, 5).map((rec: any, i: number) => (
                        <motion.div
                          key={rec.exercise_id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-xl"
                        >
                          <div className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary mb-0.5">{rec.exercise_name}</p>
                            <p className="text-xs text-text-muted leading-relaxed">{rec.recommendation}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* Quick links */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          {[
            { to: '/splits', icon: '📋', label: 'My Splits', desc: 'Manage programs' },
            { to: '/history', icon: '📅', label: 'History', desc: 'Past workouts' },
            { to: '/analytics', icon: '📊', label: 'Analytics', desc: 'Progress charts' },
            { to: '/settings', icon: '⚙️', label: 'Settings', desc: 'Profile & targets' },
          ].map(({ to, icon, label, desc }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Link to={to}>
                <Card hover padding="md" className="h-full">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="font-semibold text-text-primary text-sm">{label}</div>
                  <div className="text-text-muted text-xs">{desc}</div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </motion.div>
    </div>
  )
}
