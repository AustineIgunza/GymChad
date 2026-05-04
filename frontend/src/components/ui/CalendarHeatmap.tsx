import type { Workout } from '../../types'

interface HeatmapDay {
  date: string    // 'YYYY-MM-DD'
  count: number
  label?: string
}

interface CalendarHeatmapProps {
  data: HeatmapDay[]
  weeks?: number
  className?: string
}

export function buildHeatmapData(workouts: Workout[]): HeatmapDay[] {
  const map = new Map<string, { count: number; labels: string[] }>()
  for (const w of workouts) {
    const d = (w.date ?? '').slice(0, 10)
    if (!d) continue
    const entry = map.get(d) ?? { count: 0, labels: [] }
    entry.count++
    if (w.label) entry.labels.push(w.label)
    map.set(d, entry)
  }
  return Array.from(map.entries()).map(([date, { count, labels }]) => ({
    date, count, label: labels.join(', ')
  }))
}

export function CalendarHeatmap({ data, weeks = 52, className = '' }: CalendarHeatmapProps) {
  // Build lookup map
  const lookup = new Map(data.map(d => [d.date, d]))

  // Generate days array: start from (weeks * 7) days ago, aligned to Sunday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const totalDays = weeks * 7

  // Find most recent Sunday on or before (today - totalDays + 1)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - totalDays + 1)
  // Align to Sunday (day 0)
  const dayOfWeek = startDate.getDay()
  startDate.setDate(startDate.getDate() - dayOfWeek)

  // Generate all days
  const days: Array<{ date: Date; dateStr: string; col: number; row: number }> = []
  let col = 0
  let row = 0
  const cur = new Date(startDate)

  while (cur <= today || col < weeks) {
    if (cur > today) { col++; if (col >= weeks) break; cur.setDate(cur.getDate() + 7); continue }
    const dateStr = cur.toISOString().slice(0, 10)
    days.push({ date: new Date(cur), dateStr, col, row })
    cur.setDate(cur.getDate() + 1)
    row++
    if (row >= 7) { row = 0; col++ }
    if (col >= weeks) break
  }

  // Month labels: find first day of each month
  const monthLabels: Array<{ col: number; label: string }> = []
  let lastMonth = -1
  for (const d of days) {
    const m = d.date.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({
        col: d.col,
        label: d.date.toLocaleDateString('en', { month: 'short' })
      })
      lastMonth = m
    }
  }

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-bg-tertiary'
    if (count === 1) return 'bg-primary-700/50'
    return 'bg-primary-700'
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Month labels */}
      <div className="relative h-5 mb-1" style={{ width: `${weeks * 14}px` }}>
        {monthLabels.map(({ col: c, label }) => (
          <span
            key={`${c}-${label}`}
            className="absolute text-[10px] text-text-muted"
            style={{ left: `${c * 14}px` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="relative" style={{ width: `${weeks * 14}px`, height: `${7 * 14}px` }}>
        {days.map(({ dateStr, col: c, row: r }) => {
          const entry = lookup.get(dateStr)
          const count = entry?.count ?? 0
          const isToday = dateStr === todayStr
          return (
            <div
              key={dateStr}
              title={entry ? `${dateStr}: ${entry.label || count + ' workout(s)'}` : dateStr}
              className={`absolute w-3 h-3 rounded-sm transition-colors ${cellColor(count)} ${isToday ? 'ring-1 ring-primary-400 ring-offset-1 ring-offset-bg-primary' : ''}`}
              style={{ left: `${c * 14}px`, top: `${r * 14}px` }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 justify-end">
        <span className="text-[10px] text-text-muted">Less</span>
        <div className="w-3 h-3 rounded-sm bg-bg-tertiary" />
        <div className="w-3 h-3 rounded-sm bg-primary-700/50" />
        <div className="w-3 h-3 rounded-sm bg-primary-700" />
        <span className="text-[10px] text-text-muted">More</span>
      </div>
    </div>
  )
}
