import { useEffect, useState } from 'react'

interface MacroRingProps {
  calories: number
  target: number
  protein: number
  carbs: number
  fat: number
  size?: number
}

export function MacroRing({ calories, target, protein, carbs, fat, size = 140 }: MacroRingProps) {
  const r = 46
  const cx = 60
  const cy = 60
  const circumference = 2 * Math.PI * r
  const pct = Math.min(calories / (target || 2000), 1)

  // Animate the stroke on mount
  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedPct(pct), 50)
    return () => clearTimeout(timeout)
  }, [pct])

  const totalMacroKcal = protein * 4 + carbs * 4 + fat * 9 || 1
  const proteinPct = (protein * 4) / totalMacroKcal
  const carbsPct = (carbs * 4) / totalMacroKcal

  void (proteinPct * circumference)
  void (carbsPct * circumference)

  const remaining = Math.max(0, target - calories)
  const isOver = calories >= target && target > 0

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        {/* Subtle glow filter */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e3a" strokeWidth={10} />

        {/* Calorie progress arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={isOver ? '#1d4ed8' : '#dc2626'}
          strokeWidth={10}
          strokeDasharray={`${animatedPct * circumference} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          filter="url(#glow)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s ease' }}
        />

        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#f8fafc" fontSize="18" fontWeight="700" fontFamily="Inter">
          {Math.round(calories)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">
          kcal
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fill={isOver ? '#60a5fa' : '#94a3b8'} fontSize="9" fontFamily="Inter">
          {remaining > 0 ? `${Math.round(remaining)} left` : isOver ? `${Math.round(calories - target)} over` : 'target hit!'}
        </text>
      </svg>

      {/* Macro breakdown */}
      <div className="flex items-center gap-5 text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="text-text-muted">Protein</span>
          <span className="font-semibold text-text-primary">{Math.round(protein)}g</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-2 h-2 rounded-full bg-accent-yellow" />
          <span className="text-text-muted">Carbs</span>
          <span className="font-semibold text-text-primary">{Math.round(carbs)}g</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-2 h-2 rounded-full bg-accent-orange" />
          <span className="text-text-muted">Fat</span>
          <span className="font-semibold text-text-primary">{Math.round(fat)}g</span>
        </div>
      </div>
    </div>
  )
}
