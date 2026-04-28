import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import api from '../services/api'
import { exercisesApi } from '../services/exercises'
import { useAuthStore } from '../stores/authStore'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../stores/uiStore'
import type { Exercise, BodyMeasurement } from '../types'
import { Plus, TrendingDown, TrendingUp, Target, Minus } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs shadow-card">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

type AnalyticsTab = 'strength' | 'body' | 'nutrition'

const defaultMeasurement = {
  date: new Date().toISOString().split('T')[0],
  weight_kg: '',
  body_fat_pct: '',
  waist_cm: '',
  chest_cm: '',
  left_arm_cm: '',
  right_arm_cm: '',
  left_thigh_cm: '',
  right_thigh_cm: '',
  notes: '',
}

export function AnalyticsPage() {
  const { user } = useAuthStore()
  const toast = useToast()
  const [tab, setTab] = useState<AnalyticsTab>('strength')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedEx, setSelectedEx] = useState('')
  const [strengthData, setStrengthData] = useState<any[]>([])
  const [volumeData, setVolumeData] = useState<any[]>([])
  const [calorieData, setCalorieData] = useState<any[]>([])
  const [macroData, setMacroData] = useState<any>(null)
  const [bodyData, setBodyData] = useState<BodyMeasurement[]>([])
  const [fatLossData, setFatLossData] = useState<any>(null)
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [logModal, setLogModal] = useState(false)
  const [measureForm, setMeasureForm] = useState(defaultMeasurement)
  const [savingMeasure, setSavingMeasure] = useState(false)
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    exercisesApi.list().then(exs => {
      const filtered = exs.filter(e => e.muscle_group !== 'CARDIO')
      setExercises(filtered)
      if (filtered.length) setSelectedEx(filtered[0].id)
    })
    api.get('/progress/calories', { params: { days: 30 } }).then(r => setCalorieData(r.data)).catch(() => {})
    api.get('/progress/macros', { params: { days: 7 } }).then(r => setMacroData(r.data)).catch(() => {})
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'body') {
      // Use measurements endpoint for full data including id (needed for delete)
      api.get('/measurements', { params: { days: 90 } }).then(r => {
        setBodyData(r.data)
        setMeasurements(r.data)
      }).catch(() => {})
      api.get('/progress/fat-loss-projection').then(r => setFatLossData(r.data)).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    if (!selectedEx) return
    Promise.all([
      api.get('/progress/strength', { params: { exercise_id: selectedEx, weeks: 12 } }).then(r => r.data).catch(() => []),
      api.get('/progress/volume', { params: { exercise_id: selectedEx, weeks: 8 } }).then(r => r.data).catch(() => []),
    ]).then(([s, v]) => {
      setStrengthData(s)
      setVolumeData(v)
    })
  }, [selectedEx])

  const logMeasurement = async () => {
    setSavingMeasure(true)
    try {
      const payload: any = { date: measureForm.date }
      if (measureForm.weight_kg) payload.weight_kg = parseFloat(measureForm.weight_kg)
      if (measureForm.body_fat_pct) payload.body_fat_pct = parseFloat(measureForm.body_fat_pct)
      if (measureForm.waist_cm) payload.waist_cm = parseFloat(measureForm.waist_cm)
      if (measureForm.chest_cm) payload.chest_cm = parseFloat(measureForm.chest_cm)
      if (measureForm.left_arm_cm) payload.left_arm_cm = parseFloat(measureForm.left_arm_cm)
      if (measureForm.right_arm_cm) payload.right_arm_cm = parseFloat(measureForm.right_arm_cm)
      if (measureForm.left_thigh_cm) payload.left_thigh_cm = parseFloat(measureForm.left_thigh_cm)
      if (measureForm.right_thigh_cm) payload.right_thigh_cm = parseFloat(measureForm.right_thigh_cm)
      if (measureForm.notes) payload.notes = measureForm.notes

      await api.post('/measurements', payload)
      const r = await api.get('/measurements', { params: { days: 90 } })
      setBodyData(r.data)
      setMeasurements(r.data)
      setLogModal(false)
      setMeasureForm(defaultMeasurement)
      toast.success('Measurements logged!')
    } catch {
      toast.error('Failed to log measurements')
    } finally {
      setSavingMeasure(false)
    }
  }

  const deleteMeasurement = async (id: string) => {
    try {
      await api.delete(`/measurements/${id}`)
      setBodyData(d => d.filter((m: any) => m.id !== id))
      setMeasurements(d => d.filter((m: any) => m.id !== id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

  const exerciseOptions = exercises.map(e => ({ value: e.id, label: e.name }))

  // Weight trend data for chart
  const weightChartData = bodyData
    .filter((m: any) => m.weight_kg)
    .map((m: any) => ({ date: m.date?.slice(5), weight: m.weight_kg }))

  // Compute goal weight ETA
  let goalWeightEta: string | null = null
  let weeksToGoal: number | null = null
  if (fatLossData && user?.goal_weight_kg && user?.weight_kg) {
    const weeklyChange = fatLossData.projected_weekly_kg // positive = loss, negative = gain
    const diff = user.weight_kg - user.goal_weight_kg
    if (weeklyChange !== 0 && Math.sign(diff) === Math.sign(weeklyChange)) {
      weeksToGoal = Math.abs(diff / weeklyChange)
      const eta = new Date()
      eta.setDate(eta.getDate() + weeksToGoal * 7)
      goalWeightEta = eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }

  return (
    <div className="page px-4">
      <PageHeader title="Analytics" subtitle="Track your progress over time" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4">
        {[
          { id: 'strength', label: '💪 Lifting' },
          { id: 'body', label: '⚖️ Body' },
          { id: 'nutrition', label: '🥗 Nutrition' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as AnalyticsTab)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              tab === t.id
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STRENGTH TAB ── */}
        {tab === 'strength' && (
          <motion.div key="strength" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

              <motion.div variants={item}>
                <Card padding="md">
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <h3 className="font-semibold text-text-primary">Estimated 1RM</h3>
                    <div className="w-40">
                      <Select
                        value={selectedEx}
                        onChange={e => setSelectedEx(e.target.value)}
                        options={exerciseOptions}
                      />
                    </div>
                  </div>
                  {strengthData.length ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={strengthData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#7c3aed', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line type="monotone" dataKey="e1rm" stroke="#7c3aed" strokeWidth={2.5}
                          dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                          name="e1RM (kg)" isAnimationActive={true} animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-text-muted text-sm gap-2">
                      <span className="text-3xl">💪</span>
                      <span>Log workouts to track strength</span>
                    </div>
                  )}
                </Card>
              </motion.div>

              {volumeData.length > 0 && (
                <motion.div variants={item}>
                  <Card padding="md">
                    <h3 className="font-semibold text-text-primary mb-4">Training Volume</h3>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={volumeData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Volume (kg)" isAnimationActive={true} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </motion.div>
              )}

            </motion.div>
          </motion.div>
        )}

        {/* ── BODY TAB ── */}
        {tab === 'body' && (
          <motion.div key="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">

              {/* Log measurement button */}
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setLogModal(true)}>
                  <Plus className="w-4 h-4" /> Log Measurements
                </Button>
              </div>

              {/* Weight trend chart */}
              <Card padding="md">
                <h3 className="font-semibold text-text-primary mb-4">Body Weight Trend</h3>
                {weightChartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={weightChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      {user?.goal_weight_kg && (
                        <ReferenceLine y={user.goal_weight_kg} stroke="#22c55e" strokeDasharray="4 4"
                          label={{ value: 'Goal', fill: '#22c55e', fontSize: 10, position: 'right' }} />
                      )}
                      <Line type="monotone" dataKey="weight" stroke="#a78bfa" strokeWidth={2.5}
                        dot={{ fill: '#a78bfa', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }}
                        name="Weight (kg)" isAnimationActive={true} animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-text-muted text-sm gap-2">
                    <span className="text-3xl">⚖️</span>
                    <span>Log body weight to see trend</span>
                    <Button size="sm" variant="outline" onClick={() => setLogModal(true)}>
                      <Plus className="w-3.5 h-3.5" /> First entry
                    </Button>
                  </div>
                )}
              </Card>

              {/* Fat loss projection + goal ETA */}
              {fatLossData && !fatLossData.error && (
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      fatLossData.direction === 'loss' ? 'bg-accent-green/10' :
                      fatLossData.direction === 'gain' ? 'bg-accent-orange/10' : 'bg-bg-tertiary'
                    }`}>
                      {fatLossData.direction === 'loss' ? <TrendingDown className="w-4 h-4 text-accent-green" /> :
                       fatLossData.direction === 'gain' ? <TrendingUp className="w-4 h-4 text-accent-orange" /> :
                       <Target className="w-4 h-4 text-text-muted" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">Projection</h3>
                      <p className="text-xs text-text-muted capitalize">{fatLossData.direction === 'loss' ? 'Fat loss' : fatLossData.direction === 'gain' ? 'Muscle gain phase' : 'Maintenance'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Avg Daily Intake', val: `${Math.round(fatLossData.avg_daily_intake_kcal)} kcal` },
                      { label: 'Calorie Target', val: `${fatLossData.calorie_target} kcal` },
                      { label: 'Weekly Cardio', val: `${Math.round(fatLossData.weekly_cardio_kcal)} kcal` },
                      {
                        label: 'Weekly Change',
                        val: `${fatLossData.projected_weekly_kg > 0 ? '-' : '+'}${Math.abs(fatLossData.projected_weekly_kg * 1000).toFixed(0)}g`,
                        highlight: true,
                      },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} className="bg-bg-tertiary rounded-xl p-3">
                        <p className="text-xs text-text-muted mb-1">{label}</p>
                        <p className={`font-bold text-sm ${highlight ? (fatLossData.direction === 'loss' ? 'text-accent-green' : fatLossData.direction === 'gain' ? 'text-accent-orange' : 'text-text-primary') : 'text-text-primary'}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Goal weight ETA */}
                  {goalWeightEta && weeksToGoal && (
                    <div className="p-3 rounded-xl bg-accent-green/5 border border-accent-green/15">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-accent-green" />
                        <p className="text-xs font-semibold text-accent-green">Goal Weight ETA</p>
                      </div>
                      <p className="text-sm font-bold text-text-primary">{goalWeightEta}</p>
                      <p className="text-xs text-text-muted">~{Math.round(weeksToGoal)} weeks · {user?.goal_weight_kg}kg target</p>
                    </div>
                  )}

                  {!user?.goal_weight_kg && (
                    <p className="text-xs text-text-muted text-center">Set a goal weight in Settings to see your ETA</p>
                  )}
                </Card>
              )}

              {/* Recent measurements */}
              {measurements.length > 0 && (
                <Card padding="none">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-text-primary text-sm">Measurement History</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {measurements.slice(0, 10).map((m: any) => (
                      <div key={m.id} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-text-secondary mb-1">{m.date}</p>
                            <div className="flex flex-wrap gap-2">
                              {m.weight_kg && <span className="text-xs text-text-muted">⚖️ {m.weight_kg}kg</span>}
                              {m.body_fat_pct && <span className="text-xs text-text-muted">🔬 {m.body_fat_pct}% BF</span>}
                              {m.waist_cm && <span className="text-xs text-text-muted">📏 {m.waist_cm}cm waist</span>}
                              {m.left_arm_cm && <span className="text-xs text-text-muted">💪 {m.left_arm_cm}cm arm</span>}
                              {m.left_thigh_cm && <span className="text-xs text-text-muted">🦵 {m.left_thigh_cm}cm thigh</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMeasurement(m.id)}
                            className="text-text-muted hover:text-accent-red transition-colors ml-2 flex-shrink-0"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* ── NUTRITION TAB ── */}
        {tab === 'nutrition' && (
          <motion.div key="nutrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

              <motion.div variants={item}>
                <Card padding="md">
                  <h3 className="font-semibold text-text-primary mb-4">Calorie Adherence (30 days)</h3>
                  {calorieData.length ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={calorieData.slice(-14)} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        {user?.calorie_target && (
                          <ReferenceLine y={user.calorie_target} stroke="#7c3aed" strokeDasharray="4 4"
                            label={{ value: 'Target', fill: '#a78bfa', fontSize: 10 }} />
                        )}
                        <Bar dataKey="calories" fill="#dc2626" radius={[4, 4, 0, 0]} name="Calories" isAnimationActive={true} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-text-muted text-sm gap-2">
                      <span className="text-3xl">📊</span>
                      <span>Log nutrition to see calorie data</span>
                    </div>
                  )}
                </Card>
              </motion.div>

              {macroData && (
                <motion.div variants={item}>
                  <Card padding="md">
                    <h3 className="font-semibold text-text-primary mb-3">7-Day Macro Averages</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Protein', avg: macroData.avg_protein_g, target: macroData.target_protein_g, color: '#3b82f6' },
                        { label: 'Carbs', avg: macroData.avg_carbs_g, target: macroData.target_carbs_g, color: '#eab308' },
                        { label: 'Fat', avg: macroData.avg_fat_g, target: macroData.target_fat_g, color: '#f97316' },
                      ].map(({ label, avg, target, color }) => {
                        const pct = target ? Math.min(avg / target, 1) : 0
                        return (
                          <div key={label} className="bg-bg-tertiary rounded-xl p-3">
                            <p className="text-xs text-text-muted mb-1">{label}</p>
                            <p className="font-bold text-text-primary">{Math.round(avg)}g</p>
                            {target && <p className="text-xs text-text-muted">of {target}g</p>}
                            <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}

            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Log Measurement Modal */}
      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Measurements">
        <div className="space-y-4">
          <Input label="Date" type="date" value={measureForm.date} onChange={e => setMeasureForm(f => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" placeholder="75.5" value={measureForm.weight_kg}
              onChange={e => setMeasureForm(f => ({ ...f, weight_kg: e.target.value }))} />
            <Input label="Body Fat (%)" type="number" placeholder="15" value={measureForm.body_fat_pct}
              onChange={e => setMeasureForm(f => ({ ...f, body_fat_pct: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Waist (cm)" type="number" placeholder="80" value={measureForm.waist_cm}
              onChange={e => setMeasureForm(f => ({ ...f, waist_cm: e.target.value }))} />
            <Input label="Chest (cm)" type="number" placeholder="100" value={measureForm.chest_cm}
              onChange={e => setMeasureForm(f => ({ ...f, chest_cm: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Left Arm (cm)" type="number" placeholder="35" value={measureForm.left_arm_cm}
              onChange={e => setMeasureForm(f => ({ ...f, left_arm_cm: e.target.value }))} />
            <Input label="Right Arm (cm)" type="number" placeholder="35" value={measureForm.right_arm_cm}
              onChange={e => setMeasureForm(f => ({ ...f, right_arm_cm: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Left Thigh (cm)" type="number" placeholder="55" value={measureForm.left_thigh_cm}
              onChange={e => setMeasureForm(f => ({ ...f, left_thigh_cm: e.target.value }))} />
            <Input label="Right Thigh (cm)" type="number" placeholder="55" value={measureForm.right_thigh_cm}
              onChange={e => setMeasureForm(f => ({ ...f, right_thigh_cm: e.target.value }))} />
          </div>
          <Input label="Notes (optional)" placeholder="Fasted morning weight..." value={measureForm.notes}
            onChange={e => setMeasureForm(f => ({ ...f, notes: e.target.value }))} />
          <Button fullWidth loading={savingMeasure} onClick={logMeasurement}>Save Measurements</Button>
        </div>
      </Modal>
    </div>
  )
}
