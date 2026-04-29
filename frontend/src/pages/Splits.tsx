import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle2, Trash2, ChevronDown, ChevronUp, Zap, Sparkles, Search } from 'lucide-react'
import { splitsApi } from '../services/splits'
import { exercisesApi } from '../services/exercises'
import { useToast } from '../stores/uiStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import type { Split, Exercise, MuscleGroup } from '../types'

interface TemplateDay {
  label: string
  muscles: MuscleGroup[]
}

interface SplitTemplate {
  id: string
  name: string
  days_count: number
  badge: string
  desc: string
  days: TemplateDay[]
}

const PRESET_TEMPLATES: SplitTemplate[] = [
  {
    id: 'ppl_6',
    name: 'PPL 6-Day',
    days_count: 6,
    badge: '🔥 Popular',
    desc: 'Push / Pull / Legs twice per week — optimal for intermediate hypertrophy',
    days: [
      { label: 'Push A — Chest & Shoulders', muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] },
      { label: 'Pull A — Back & Biceps', muscles: ['BACK', 'BICEPS'] },
      { label: 'Legs A', muscles: ['LEGS', 'GLUTES'] },
      { label: 'Push B — Chest & Triceps', muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] },
      { label: 'Pull B — Back & Biceps', muscles: ['BACK', 'BICEPS'] },
      { label: 'Legs B — Hamstrings & Glutes', muscles: ['LEGS', 'GLUTES', 'CORE'] },
    ],
  },
  {
    id: 'ppl_3',
    name: 'PPL 3-Day',
    days_count: 3,
    badge: '⭐ Beginner',
    desc: 'Classic Push / Pull / Legs — great for beginners and intermediates',
    days: [
      { label: 'Push — Chest / Shoulders / Triceps', muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] },
      { label: 'Pull — Back / Biceps', muscles: ['BACK', 'BICEPS'] },
      { label: 'Legs — Quads / Hams / Glutes', muscles: ['LEGS', 'GLUTES', 'CORE'] },
    ],
  },
  {
    id: 'upper_lower_4',
    name: 'Upper / Lower 4-Day',
    days_count: 4,
    badge: '💪 Strength',
    desc: 'Upper / Lower split twice per week — balanced strength & hypertrophy',
    days: [
      { label: 'Upper A — Strength Focus', muscles: ['CHEST', 'BACK', 'SHOULDERS'] },
      { label: 'Lower A — Squat Focus', muscles: ['LEGS', 'GLUTES', 'CORE'] },
      { label: 'Upper B — Hypertrophy Focus', muscles: ['CHEST', 'BACK', 'BICEPS', 'TRICEPS'] },
      { label: 'Lower B — Deadlift Focus', muscles: ['LEGS', 'GLUTES', 'CORE'] },
    ],
  },
  {
    id: 'bro_5',
    name: 'Bro Split 5-Day',
    days_count: 5,
    badge: '💎 Classic',
    desc: 'One muscle group per day — the classic bodybuilder approach',
    days: [
      { label: 'Chest Day', muscles: ['CHEST'] },
      { label: 'Back Day', muscles: ['BACK'] },
      { label: 'Shoulders Day', muscles: ['SHOULDERS'] },
      { label: 'Arms Day', muscles: ['BICEPS', 'TRICEPS'] },
      { label: 'Legs Day', muscles: ['LEGS', 'GLUTES'] },
    ],
  },
  {
    id: 'fullbody_3',
    name: 'Full Body 3-Day',
    days_count: 3,
    badge: '🌟 Beginner',
    desc: 'Full body every session — maximize frequency for beginners',
    days: [
      { label: 'Full Body A — Push Focus', muscles: ['CHEST', 'SHOULDERS', 'LEGS', 'CORE'] },
      { label: 'Full Body B — Pull Focus', muscles: ['BACK', 'BICEPS', 'LEGS', 'GLUTES'] },
      { label: 'Full Body C — Mixed', muscles: ['CHEST', 'BACK', 'SHOULDERS', 'LEGS', 'CORE'] },
    ],
  },
  {
    id: 'push_pull_4',
    name: 'Push / Pull 4-Day',
    days_count: 4,
    badge: '⚡ Efficient',
    desc: 'Push & Pull twice per week — no leg day version for those who prioritise upper body',
    days: [
      { label: 'Push A — Chest Focused', muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] },
      { label: 'Pull A — Back Focused', muscles: ['BACK', 'BICEPS'] },
      { label: 'Push B — Shoulders Focused', muscles: ['SHOULDERS', 'CHEST', 'TRICEPS'] },
      { label: 'Pull B — Arms Focused', muscles: ['BACK', 'BICEPS'] },
    ],
  },
]

// Pick exercises by muscle group (first N per group)
function pickExercisesForDay(exercises: Exercise[], muscles: MuscleGroup[], perMuscle = 2): string[] {
  const ids: string[] = []
  for (const muscle of muscles) {
    const matching = exercises.filter(e => e.muscle_group === muscle && e.muscle_group !== 'CARDIO')
    // Take up to perMuscle exercises per muscle group
    matching.slice(0, perMuscle).forEach(e => ids.push(e.id))
  }
  return ids
}

export function SplitsPage() {
  const [splits, setSplits] = useState<Split[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [createModal, setCreateModal] = useState(false)
  const [templateModal, setTemplateModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null)
  const [exSearch, setExSearch] = useState('')
  const [exMuscleFilter, setExMuscleFilter] = useState<string>('All')
  const toast = useToast()

  // Custom form state
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  interface DayExercise { exercise_id: string; sets: number; repsMin: number; repsMax: number }
  interface DayState { label: string; exercises: DayExercise[] }
  const [days, setDays] = useState<DayState[]>([{ label: 'Day 1', exercises: [] }])

  useEffect(() => {
    Promise.all([
      splitsApi.list().then(setSplits).catch(() => {}),
      exercisesApi.list().then(setExercises).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const activateSplit = async (id: string) => {
    try {
      await splitsApi.activate(id)
      setSplits(s => s.map(sp => ({ ...sp, is_active: sp.id === id })))
      toast.success('Split activated!')
    } catch {
      toast.error('Failed to activate split')
    }
  }

  const deleteSplit = async (id: string) => {
    try {
      await splitsApi.delete(id)
      setSplits(s => s.filter(sp => sp.id !== id))
      toast.success('Split deleted')
    } catch {
      toast.error('Failed to delete split')
    }
  }

  const applyTemplate = async (template: SplitTemplate) => {
    setSavingTemplate(template.id)
    try {
      const newSplit = await splitsApi.create({
        name: template.name,
        description: template.desc,
        days: template.days.map((d, i) => ({
          day_number: i + 1,
          label: d.label,
          exercises: pickExercisesForDay(exercises, d.muscles, 2).map((exId, order) => ({
            exercise_id: exId,
            order,
            target_sets: 3,
            target_reps_min: 8,
            target_reps_max: 12,
          })),
        })),
      })
      setSplits(s => [newSplit, ...s])
      setTemplateModal(false)
      toast.success(`${template.name} created! You can customise exercises in the split.`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create split from template')
    } finally {
      setSavingTemplate(null)
    }
  }

  const createSplit = async () => {
    setSaving(true)
    try {
      const newSplit = await splitsApi.create({
        name,
        description: desc || undefined,
        days: days.map((d, i) => ({
          day_number: i + 1,
          label: d.label,
          exercises: d.exercises.map((ex, order) => ({
            exercise_id: ex.exercise_id,
            order,
            target_sets: ex.sets,
            target_reps_min: ex.repsMin,
            target_reps_max: ex.repsMax,
          })),
        })),
      })
      setSplits(s => [newSplit, ...s])
      setCreateModal(false)
      setName(''); setDesc(''); setDays([{ label: 'Day 1', exercises: [] }])
      toast.success('Split created!')
    } catch {
      toast.error('Failed to create split')
    } finally {
      setSaving(false)
    }
  }

  const addDay = () => setDays(d => [...d, { label: `Day ${d.length + 1}`, exercises: [] }])
  const removeDay = (i: number) => setDays(d => d.filter((_, idx) => idx !== i))
  const toggleExercise = (dayIdx: number, exId: string) => {
    setDays(d => d.map((day, i) => {
      if (i !== dayIdx) return day
      const exists = day.exercises.find(e => e.exercise_id === exId)
      return {
        ...day,
        exercises: exists
          ? day.exercises.filter(e => e.exercise_id !== exId)
          : [...day.exercises, { exercise_id: exId, sets: 3, repsMin: 8, repsMax: 12 }],
      }
    }))
  }
  const updateExercise = (dayIdx: number, exId: string, field: 'sets' | 'repsMin' | 'repsMax', val: number) => {
    setDays(d => d.map((day, i) => i !== dayIdx ? day : {
      ...day,
      exercises: day.exercises.map(e => e.exercise_id === exId ? { ...e, [field]: val } : e),
    }))
  }

  return (
    <div className="page px-4">
      <PageHeader
        title="My Splits"
        subtitle="Training programs"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setTemplateModal(true)}>
              <Sparkles className="w-4 h-4" /> Templates
            </Button>
            <Button size="sm" onClick={() => setCreateModal(true)}>
              <Plus className="w-4 h-4" /> Custom
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : splits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-6"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-4"
          >
            📋
          </motion.div>
          <p className="text-text-primary font-semibold mb-1">No splits yet</p>
          <p className="text-text-muted text-sm mb-6">Choose a preset template or create your own</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button onClick={() => setTemplateModal(true)}>
              <Sparkles className="w-4 h-4" /> Use a Template
            </Button>
            <Button variant="outline" onClick={() => setCreateModal(true)}>
              <Plus className="w-4 h-4" /> Build Custom Split
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {splits.map(split => (
              <motion.div key={split.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card padding="none">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {split.is_active && (
                        <div className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-text-primary">{split.name}</h3>
                        <p className="text-xs text-text-muted">{split.days.length} days{split.is_active ? ' · Active' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {!split.is_active && (
                        <Button variant="outline" size="sm" onClick={() => activateSplit(split.id)}>
                          <Zap className="w-3.5 h-3.5" /> Activate
                        </Button>
                      )}
                      {split.is_active && (
                        <span className="flex items-center gap-1 text-xs text-accent-green font-medium px-2 py-1 bg-accent-green/10 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                      <button
                        onClick={() => setExpandedId(expandedId === split.id ? null : split.id)}
                        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary"
                      >
                        {expandedId === split.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteSplit(split.id)}
                        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-accent-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === split.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {split.description && (
                            <p className="text-xs text-text-muted">{split.description}</p>
                          )}
                          {split.days.map(day => (
                            <div key={day.id}>
                              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Day {day.day_number} — {day.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {day.exercises.map(sde => (
                                  <span key={sde.id} className="px-2.5 py-1 bg-bg-tertiary rounded-lg text-xs text-text-secondary">
                                    {sde.exercise?.name || 'Unknown'}
                                    {sde.target_sets && ` ${sde.target_sets}×${sde.target_reps_min}–${sde.target_reps_max}`}
                                  </span>
                                ))}
                                {!day.exercises.length && <span className="text-xs text-text-disabled">No exercises</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Template picker modal */}
      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title="Choose a Template">
        <p className="text-sm text-text-muted mb-4">Select a proven training template. Exercises are pre-filled — you can customise them after.</p>
        <div className="space-y-3">
          {PRESET_TEMPLATES.map(template => (
            <div key={template.id} className="p-4 rounded-2xl bg-bg-tertiary border border-border">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-text-primary text-sm">{template.name}</h4>
                    <span className="text-xs text-primary-300 bg-primary-700/15 px-2 py-0.5 rounded-full">{template.badge}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{template.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {template.days.map((d, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-bg-secondary rounded text-text-secondary">{d.label.split(' — ')[0]}</span>
                ))}
              </div>
              <Button
                fullWidth
                size="sm"
                loading={savingTemplate === template.id}
                disabled={savingTemplate !== null && savingTemplate !== template.id}
                onClick={() => applyTemplate(template)}
              >
                Use {template.name}
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Custom create split modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Custom Split">
        <div className="space-y-4">
          <Input label="Split Name" placeholder="e.g. PPL 6-Day" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Description (optional)" placeholder="Push Pull Legs..." value={desc} onChange={e => setDesc(e.target.value)} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-secondary">Training Days</p>
              <Button variant="ghost" size="sm" onClick={addDay}>
                <Plus className="w-3.5 h-3.5" /> Add Day
              </Button>
            </div>
            <div className="space-y-3">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="bg-bg-tertiary rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder={`Day ${dayIdx + 1} name`}
                      value={day.label}
                      onChange={e => setDays(d => d.map((dd, i) => i === dayIdx ? { ...dd, label: e.target.value } : dd))}
                      className="flex-1"
                    />
                    {days.length > 1 && (
                      <button onClick={() => removeDay(dayIdx)} className="text-text-muted hover:text-accent-red">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mb-1.5">Select exercises:</p>
                  <div className="mb-2">
                    {/* Search & muscle filter */}
                    <div className="flex gap-1.5 mb-1.5">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
                        <input
                          placeholder="Search exercises..."
                          value={exSearch}
                          onChange={e => setExSearch(e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 bg-bg-secondary border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                        />
                      </div>
                      <select
                        value={exMuscleFilter}
                        onChange={e => setExMuscleFilter(e.target.value)}
                        className="bg-bg-secondary border border-border rounded-lg text-xs text-text-secondary px-2 py-1.5 focus:outline-none"
                      >
                        <option value="All">All</option>
                        {[...new Set(exercises.filter(e => e.muscle_group !== 'CARDIO').map(e => e.muscle_group))].sort().map(mg => (
                          <option key={mg} value={mg}>{mg}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                      {exercises
                        .filter(e => e.muscle_group !== 'CARDIO')
                        .filter(e => exMuscleFilter === 'All' || e.muscle_group === exMuscleFilter)
                        .filter(e => !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()))
                        .map(ex => {
                          const selected = day.exercises.find(e => e.exercise_id === ex.id)
                          return (
                            <button
                              key={ex.id}
                              onClick={() => toggleExercise(dayIdx, ex.id)}
                              className={`px-2 py-1 rounded-lg text-xs transition-colors ${selected ? 'bg-primary-700 text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'}`}
                            >
                              {ex.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                  {day.exercises.length > 0 && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-text-muted mb-1">Sets & reps:</p>
                      {day.exercises.map(ex => {
                        const exInfo = exercises.find(e => e.id === ex.exercise_id)
                        return (
                          <div key={ex.exercise_id} className="flex items-center gap-2">
                            <p className="text-xs text-text-primary flex-1 truncate">{exInfo?.name}</p>
                            <input
                              type="number" min={1} max={10}
                              value={ex.sets}
                              onChange={e => updateExercise(dayIdx, ex.exercise_id, 'sets', parseInt(e.target.value) || 3)}
                              className="w-10 text-center text-xs bg-bg-secondary border border-border rounded-lg py-1 text-text-primary"
                              title="Sets"
                            />
                            <span className="text-xs text-text-muted">×</span>
                            <input
                              type="number" min={1} max={30}
                              value={ex.repsMin}
                              onChange={e => updateExercise(dayIdx, ex.exercise_id, 'repsMin', parseInt(e.target.value) || 8)}
                              className="w-10 text-center text-xs bg-bg-secondary border border-border rounded-lg py-1 text-text-primary"
                              title="Min reps"
                            />
                            <span className="text-xs text-text-muted">–</span>
                            <input
                              type="number" min={1} max={30}
                              value={ex.repsMax}
                              onChange={e => updateExercise(dayIdx, ex.exercise_id, 'repsMax', parseInt(e.target.value) || 12)}
                              className="w-10 text-center text-xs bg-bg-secondary border border-border rounded-lg py-1 text-text-primary"
                              title="Max reps"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button fullWidth loading={saving} onClick={createSplit} disabled={!name.trim()}>
            Create Split
          </Button>
        </div>
      </Modal>
    </div>
  )
}
