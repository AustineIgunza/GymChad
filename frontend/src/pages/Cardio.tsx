import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Activity, Footprints, Flame, Timer, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardioSession {
  id: string
  date: string
  cardio_type: string
  duration_min: number
  calories_burned: number
  level?: number | null
  speed_kmh?: number | null
  incline_pct?: number | null
  rpm?: number | null
  notes?: string | null
}

interface StepsDay {
  date: string
  steps: number
  calories: number
}

// ── Cardio type config ─────────────────────────────────────────────────────────

const CARDIO_TYPES = [
  { value: 'recumbent_bike', label: 'Recumbent Bike', fields: ['level', 'rpm'] },
  { value: 'upright_bike',   label: 'Upright Bike',   fields: ['level', 'rpm'] },
  { value: 'spinning',       label: 'Spinning',        fields: ['level', 'rpm'] },
  { value: 'treadmill',      label: 'Treadmill',       fields: ['speed', 'incline'] },
  { value: 'walking',        label: 'Walking',         fields: [] },
  { value: 'elliptical',     label: 'Elliptical',      fields: [] },
  { value: 'rowing',         label: 'Rowing',          fields: [] },
  { value: 'stairmaster',    label: 'StairMaster',     fields: [] },
  { value: 'jump_rope',      label: 'Jump Rope',       fields: [] },
  { value: 'swimming',       label: 'Swimming',        fields: [] },
  { value: 'hiking',         label: 'Hiking',          fields: [] },
  { value: 'battle_ropes',   label: 'Battle Ropes',    fields: [] },
  { value: 'hiit',           label: 'HIIT',            fields: [] },
  { value: 'other',          label: 'Other',           fields: [] },
]

const CARDIO_LABEL: Record<string, string> = Object.fromEntries(
  CARDIO_TYPES.map(t => [t.value, t.label])
)

// ── Log form state ─────────────────────────────────────────────────────────────

interface LogForm {
  date: string
  cardioType: string
  durationMin: string
  level: string
  rpm: string
  speedKmh: string
  inclinePct: string
  notes: string
}

const defaultForm = (): LogForm => ({
  date: new Date().toISOString().split('T')[0],
  cardioType: 'treadmill',
  durationMin: '',
  level: '',
  rpm: '',
  speedKmh: '',
  inclinePct: '',
  notes: '',
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(sessions: CardioSession[]): Array<{ date: string; sessions: CardioSession[] }> {
  const map = new Map<string, CardioSession[]>()
  for (const s of sessions) {
    const arr = map.get(s.date) ?? []
    arr.push(s)
    map.set(s.date, arr)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sessions]) => ({ date, sessions }))
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CardioPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'sessions' | 'steps'>('sessions')
  const [showLogModal, setShowLogModal] = useState(false)
  const [form, setForm] = useState<LogForm>(defaultForm)
  const [editStepsDate, setEditStepsDate] = useState<string | null>(null)
  const [stepsInput, setStepsInput] = useState('')
  const [savingSteps, setSavingSteps] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<CardioSession[]>({
    queryKey: ['cardio-sessions'],
    queryFn: () => api.get('/cardio?days=60').then(r => r.data),
  })

  const { data: stepsHistory = [], isLoading: loadingSteps } = useQuery<StepsDay[]>({
    queryKey: ['cardio-steps'],
    queryFn: () => api.get('/cardio/steps?days=30').then(r => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const logMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.post('/cardio', data),
    onSuccess: () => {
      toast.success('Cardio logged!')
      queryClient.invalidateQueries({ queryKey: ['cardio-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['activity-today'] })
      setShowLogModal(false)
      setForm(defaultForm())
    },
    onError: () => toast.error('Failed to log cardio'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cardio/${id}`),
    onSuccess: () => {
      toast.success('Removed')
      queryClient.invalidateQueries({ queryKey: ['cardio-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['activity-today'] })
    },
    onError: () => toast.error('Failed to remove'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const selectedType = CARDIO_TYPES.find(t => t.value === form.cardioType)
  const showLevelRpm = selectedType?.fields.includes('level') && selectedType.fields.includes('rpm')
  const showSpeedIncline = selectedType?.fields.includes('speed') && selectedType.fields.includes('incline')

  const handleLog = () => {
    if (!form.durationMin || parseFloat(form.durationMin) <= 0) {
      toast.error('Enter a valid duration')
      return
    }
    const body: Record<string, any> = {
      date: form.date,
      cardio_type: form.cardioType,
      duration_min: parseFloat(form.durationMin),
    }
    if (showLevelRpm) {
      if (form.level) body.level = parseFloat(form.level)
      if (form.rpm) body.rpm = parseFloat(form.rpm)
    }
    if (showSpeedIncline) {
      if (form.speedKmh) body.speed_kmh = parseFloat(form.speedKmh)
      if (form.inclinePct) body.incline_pct = parseFloat(form.inclinePct)
    }
    if (form.notes.trim()) body.notes = form.notes.trim()
    logMutation.mutate(body)
  }

  const handleSaveSteps = async (date: string) => {
    const steps = parseInt(stepsInput)
    if (!steps || steps < 0) { toast.error('Enter valid steps'); return }
    setSavingSteps(true)
    try {
      await api.post('/cardio/activity', { date, steps })
      toast.success('Steps updated')
      queryClient.invalidateQueries({ queryKey: ['cardio-steps'] })
      queryClient.invalidateQueries({ queryKey: ['activity-today'] })
      setEditStepsDate(null)
      setStepsInput('')
    } catch {
      toast.error('Failed to save steps')
    } finally {
      setSavingSteps(false)
    }
  }

  // ── Summary stats ─────────────────────────────────────────────────────────────

  const totalCalThisWeek = sessions
    .filter(s => {
      const d = new Date(s.date + 'T12:00:00')
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    })
    .reduce((a, s) => a + (s.calories_burned || 0), 0)

  const totalMinThisWeek = sessions
    .filter(s => {
      const d = new Date(s.date + 'T12:00:00')
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    })
    .reduce((a, s) => a + (s.duration_min || 0), 0)

  const avgSteps7d = stepsHistory.length > 0
    ? Math.round(stepsHistory.slice(0, 7).reduce((a, d) => a + d.steps, 0) / Math.min(stepsHistory.slice(0, 7).length, 7))
    : 0

  const grouped = groupByDate(sessions)

  return (
    <div className="page px-4">
      <PageHeader
        title="Cardio"
        action={
          <Button size="sm" onClick={() => setShowLogModal(true)}>
            <Plus className="w-4 h-4" /> Log
          </Button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Timer, label: 'This week', val: `${totalMinThisWeek}m`, color: 'text-primary-400' },
          { icon: Flame, label: 'Calories', val: `${totalCalThisWeek}`, color: 'text-accent-orange' },
          { icon: Footprints, label: 'Avg steps', val: avgSteps7d > 0 ? avgSteps7d.toLocaleString() : '—', color: 'text-accent-green' },
        ].map(({ icon: Icon, label, val, color }) => (
          <Card key={label} padding="sm" className="text-center">
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <div className="text-base font-bold text-text-primary">{val}</div>
            <div className="text-xs text-text-muted">{label}</div>
          </Card>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-4">
        {(['sessions', 'steps'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${tab === t ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            {t === 'sessions' ? <Activity className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div className="space-y-3">
          {loadingSessions && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-bg-tertiary rounded-2xl h-24" />
              ))}
            </div>
          )}

          {!loadingSessions && sessions.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-4xl mb-3"
              >
                🏃
              </motion.div>
              <p className="text-text-primary font-semibold mb-1">No cardio logged yet</p>
              <p className="text-text-muted text-sm">Tap Log to record a session</p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {grouped.map(({ date, sessions: daySessions }) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-1">
                  {formatDate(date)}
                </p>
                <Card padding="none">
                  <div className="divide-y divide-border">
                    {daySessions.map(session => (
                      <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-700/15 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            {CARDIO_LABEL[session.cardio_type] ?? session.cardio_type}
                          </p>
                          <p className="text-xs text-text-muted">
                            {session.duration_min} min
                            {session.calories_burned ? ` · ${session.calories_burned} kcal` : ''}
                            {session.level ? ` · Lvl ${session.level}` : ''}
                            {session.speed_kmh ? ` · ${session.speed_kmh} km/h` : ''}
                            {session.incline_pct ? ` · ${session.incline_pct}% incline` : ''}
                            {session.rpm ? ` · ${session.rpm} RPM` : ''}
                          </p>
                          {session.notes && (
                            <p className="text-xs text-text-disabled mt-0.5 truncate">{session.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(session.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Steps tab */}
      {tab === 'steps' && (
        <div className="space-y-2">
          {loadingSteps && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse bg-bg-tertiary rounded-2xl h-14" />
              ))}
            </div>
          )}

          {!loadingSteps && (
            <Card padding="none">
              <div className="divide-y divide-border">
                {stepsHistory.map(day => {
                  const isToday = day.date === new Date().toISOString().split('T')[0]
                  const hasSteps = day.steps > 0
                  const isEditing = editStepsDate === day.date

                  return (
                    <div key={day.date} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Footprints className={`w-4 h-4 flex-shrink-0 ${hasSteps ? 'text-accent-green' : 'text-text-disabled'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">
                              {formatDate(day.date)}
                              {isToday && <span className="ml-1.5 text-xs text-primary-400 font-semibold">Today</span>}
                            </span>
                          </div>
                          {hasSteps && (
                            <p className="text-xs text-text-muted">
                              {day.steps.toLocaleString()} steps · ~{day.calories} kcal
                            </p>
                          )}
                          {!hasSteps && (
                            <p className="text-xs text-text-disabled">No steps logged</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditStepsDate(day.date)
                            setStepsInput(day.steps > 0 ? String(day.steps) : '')
                          }}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-primary-400 transition-colors"
                        >
                          {hasSteps ? 'Edit' : 'Log'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline steps edit */}
                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 mt-3">
                              <input
                                type="number"
                                value={stepsInput}
                                onChange={e => setStepsInput(e.target.value)}
                                placeholder="Steps"
                                autoFocus
                                className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                              />
                              <Button
                                size="sm"
                                loading={savingSteps}
                                onClick={() => handleSaveSteps(day.date)}
                              >
                                Save
                              </Button>
                              <button
                                onClick={() => { setEditStepsDate(null); setStepsInput('') }}
                                className="text-xs text-text-muted hover:text-text-primary px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Log Cardio Modal */}
      <Modal open={showLogModal} onClose={() => { setShowLogModal(false); setForm(defaultForm()) }} title="Log Cardio">
        <div className="space-y-4">

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-700/50"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Type</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
              {CARDIO_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, cardioType: t.value }))}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${form.cardioType === t.value ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Duration (minutes) *</label>
            <input
              type="number"
              value={form.durationMin}
              onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))}
              placeholder="30"
              min="1"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
            />
          </div>

          {/* Conditional fields for bikes */}
          {showLevelRpm && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Level (1–20)</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  placeholder="10"
                  min="1" max="20"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">RPM</label>
                <input
                  type="number"
                  value={form.rpm}
                  onChange={e => setForm(f => ({ ...f, rpm: e.target.value }))}
                  placeholder="80"
                  min="1"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                />
              </div>
            </div>
          )}

          {/* Conditional fields for treadmill */}
          {showSpeedIncline && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Speed (km/h)</label>
                <input
                  type="number"
                  value={form.speedKmh}
                  onChange={e => setForm(f => ({ ...f, speedKmh: e.target.value }))}
                  placeholder="10"
                  min="0" step="0.5"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Incline (%)</label>
                <input
                  type="number"
                  value={form.inclinePct}
                  onChange={e => setForm(f => ({ ...f, inclinePct: e.target.value }))}
                  placeholder="2"
                  min="0" max="30" step="0.5"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Zone 2 easy run"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
            />
          </div>

          <Button fullWidth loading={logMutation.isPending} onClick={handleLog}>
            Log Cardio
          </Button>
        </div>
      </Modal>
    </div>
  )
}
