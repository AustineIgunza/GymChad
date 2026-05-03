import { clsx } from 'clsx'

interface Props {
  value: number | null
  onChange: (rpe: number | null) => void
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat Easy',
  5: 'Moderate Hard', 6: 'Hard', 7: 'Very Hard', 8: 'Extremely Hard',
  9: 'Near Max', 10: 'Max Effort',
}

function rpeColor(rpe: number): string {
  if (rpe <= 4) return 'bg-emerald-600 text-white'
  if (rpe <= 7) return 'bg-amber-500 text-white'
  return 'bg-red-600 text-white'
}

export function RpeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      <span className="text-xs text-text-muted mr-1">RPE:</span>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className={clsx(
            'w-7 h-7 rounded-md text-xs font-semibold transition-all',
            value === n ? rpeColor(n) : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'
          )}
          title={RPE_LABELS[n]}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
