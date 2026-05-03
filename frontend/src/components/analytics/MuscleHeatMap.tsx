import { useEffect, useState } from 'react'
import api from '../../services/api'

type MuscleGroup = 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS' | 'LEGS' | 'GLUTES' | 'CORE'

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps', TRICEPS: 'Triceps', LEGS: 'Legs',
  GLUTES: 'Glutes', CORE: 'Core',
}

function heatColor(sets: number, max: number): string {
  if (sets === 0 || max === 0) return 'rgba(255,255,255,0.05)'
  const intensity = sets / max
  if (intensity < 0.33) return `rgba(59,130,246,${0.3 + intensity * 0.4})`
  if (intensity < 0.66) return `rgba(124,58,237,${0.4 + intensity * 0.3})`
  return `rgba(220,38,38,${0.5 + intensity * 0.4})`
}

export function MuscleHeatMap() {
  const [data, setData] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    // Get workouts from last 7 days and tally muscle groups
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 7)
    api.get('/workouts', { params: { date_from: dateFrom.toISOString().slice(0,10), limit: 100 } })
      .then(async r => {
        const workouts = Array.isArray(r.data) ? r.data : []
        const counts: Record<string, number> = {}
        for (const wo of workouts) {
          const sets: any[] = wo.sets ?? []
          for (const s of sets) {
            if (s.exercise?.muscle_group) {
              counts[s.exercise.muscle_group] = (counts[s.exercise.muscle_group] ?? 0) + 1
            }
          }
        }
        setData(counts)
      }).catch(() => {})
  }, [])

  const muscles: MuscleGroup[] = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'GLUTES', 'CORE']
  const max = Math.max(1, ...Object.values(data))

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="font-semibold text-text-primary mb-1">Muscle Activity (7 days)</h3>
      <p className="text-xs text-text-muted mb-4">Sets per muscle group</p>
      <div className="grid grid-cols-4 gap-2">
        {muscles.map(mg => {
          const sets = data[mg] ?? 0
          const color = heatColor(sets, max)
          const isActive = filter === mg
          return (
            <button
              key={mg}
              onClick={() => setFilter(isActive ? null : mg)}
              className={`rounded-xl p-3 text-center transition-all border ${isActive ? 'border-primary-700' : 'border-transparent'}`}
              style={{ background: color }}
            >
              <p className="text-xs font-semibold text-text-primary">{MUSCLE_LABELS[mg]}</p>
              <p className="text-lg font-bold text-text-primary">{sets}</p>
              <p className="text-[10px] text-text-muted">sets</p>
            </button>
          )
        })}
      </div>
      {filter && (
        <p className="text-xs text-primary-400 mt-2 text-center">
          Filtered by {MUSCLE_LABELS[filter as MuscleGroup]} — {data[filter] ?? 0} sets this week
        </p>
      )}
    </div>
  )
}
