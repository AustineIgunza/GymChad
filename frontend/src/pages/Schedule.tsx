import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Plus, X } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import toast from 'react-hot-toast'
import api from '../services/api'

interface Schedule {
  id: string; split_id: string | null; split_day_id: string | null
  split_name: string | null; split_day_label: string | null
  scheduled_date: string; completed: boolean; notes: string | null
}

interface Split { id: string; name: string; days: { id: string; label: string; day_number: number }[] }

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [splits, setSplits] = useState<Split[]>([])
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [selectedSplit, setSelectedSplit] = useState('')
  const [selectedDay, setSelectedDay] = useState('')

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dateFrom = fmt(weekStart)
  const dateTo = fmt(addDays(weekStart, 6))

  useEffect(() => {
    api.get('/schedule', { params: { date_from: dateFrom, date_to: dateTo } })
      .then(r => setSchedule(r.data)).catch(() => {})
    api.get('/splits').then(r => setSplits(r.data)).catch(() => {})
  }, [dateFrom, dateTo])

  const toggle = async (item: Schedule) => {
    try {
      const res = await api.patch(`/schedule/${item.id}`, { completed: !item.completed })
      setSchedule(s => s.map(x => x.id === item.id ? res.data : x))
    } catch { toast.error('Failed to update') }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/schedule/${id}`)
      setSchedule(s => s.filter(x => x.id !== id))
    } catch { toast.error('Failed to delete') }
  }

  const add = async (date: string) => {
    if (!selectedSplit) return
    try {
      const res = await api.post('/schedule', {
        split_id: selectedSplit,
        split_day_id: selectedDay || undefined,
        scheduled_date: date,
      })
      setSchedule(s => [...s, res.data])
      setAddingFor(null)
      setSelectedSplit('')
      setSelectedDay('')
    } catch { toast.error('Failed to schedule') }
  }

  const currentSplit = splits.find(s => s.id === selectedSplit)

  return (
    <div className="page">
      <div className="page-inner pt-6">
        <PageHeader title="Schedule" subtitle="Plan your training week" />

        {/* Week nav */}
        <div className="flex items-center justify-between my-4">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 rounded-xl bg-bg-tertiary">
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </button>
          <span className="text-sm font-medium text-text-secondary">
            {weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} –
            {addDays(weekStart, 6).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 rounded-xl bg-bg-tertiary">
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="space-y-2">
          {days.map((day, i) => {
            const dateStr = fmt(day)
            const items = schedule.filter(s => s.scheduled_date === dateStr)
            const isToday = dateStr === fmt(new Date())
            return (
              <div key={dateStr} className={`glass rounded-2xl p-3 ${isToday ? 'border-primary-700/40' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary-400' : 'text-text-primary'}`}>{DAY_LABELS[i]}</span>
                    <span className="text-xs text-text-muted">{day.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                    {isToday && <span className="text-[10px] bg-primary-700/20 text-primary-400 px-2 py-0.5 rounded-full">Today</span>}
                  </div>
                  <button onClick={() => setAddingFor(dateStr)} className="text-text-muted hover:text-primary-400 p-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {items.length === 0 && <p className="text-xs text-text-disabled">Rest day</p>}
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-bg-tertiary rounded-xl px-3 py-2 mb-1">
                    <button onClick={() => toggle(item)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.completed ? 'bg-emerald-600 border-emerald-600' : 'border-border'}`}>
                      {item.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {item.split_name ?? 'Workout'}
                      </p>
                      {item.split_day_label && <p className="text-xs text-text-muted">{item.split_day_label}</p>}
                    </div>
                    <button onClick={() => remove(item.id)} className="text-text-disabled hover:text-red-400 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add form */}
                {addingFor === dateStr && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-2">
                    <select value={selectedSplit} onChange={e => { setSelectedSplit(e.target.value); setSelectedDay('') }}
                      className="w-full bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-sm text-text-primary">
                      <option value="">Select split…</option>
                      {splits.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {currentSplit && (
                      <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
                        className="w-full bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-sm text-text-primary">
                        <option value="">Any day</option>
                        {[...currentSplit.days].sort((a,b) => a.day_number - b.day_number).map(d => (
                          <option key={d.id} value={d.id}>Day {d.day_number}: {d.label}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => add(dateStr)} className="flex-1 py-2 bg-primary-700 text-white rounded-xl text-sm font-semibold">Add</button>
                      <button onClick={() => setAddingFor(null)} className="px-4 py-2 bg-bg-tertiary text-text-muted rounded-xl text-sm">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
