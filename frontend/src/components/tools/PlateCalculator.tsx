import { useState } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../../services/api'

interface PlateResult {
  target_weight: number; bar_weight: number; weight_per_side: number
  plates_per_side: { weight: number; count: number }[]
  unit: string; achievable: boolean; actual_weight: number
}

const PLATE_COLORS: Record<number, string> = {
  25: '#dc2626', 20: '#1d4ed8', 15: '#ca8a04', 10: '#16a34a',
  5: '#e5e7eb', 2.5: '#374151', 1.25: '#9ca3af',
  45: '#dc2626', 35: '#1d4ed8', // lb equivalents
}

function getPlateColor(weight: number): string {
  return PLATE_COLORS[weight] ?? '#6b7280'
}

interface Props { onClose: () => void }

export function PlateCalculator({ onClose }: Props) {
  const [target, setTarget] = useState('')
  const [barWeight, setBarWeight] = useState('20')
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [result, setResult] = useState<PlateResult | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    if (!target) return
    setLoading(true)
    try {
      const res = await api.post('/tools/plate-calculator', {
        target_weight: parseFloat(target),
        bar_weight: parseFloat(barWeight),
        unit,
      })
      setResult(res.data)
    } catch {} finally { setLoading(false) }
  }

  // Expand plates_per_side into individual plate array for SVG
  const plateList = result ? result.plates_per_side.flatMap(p => Array(p.count).fill(p.weight)) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary">Plate Calculator</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
      </div>
      <div className="flex gap-2 mb-3">
        <input type="number" value={target} onChange={e => setTarget(e.target.value)}
          placeholder="Target weight"
          className="flex-1 bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none focus:border-primary-700" />
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['kg','lb'] as const).map(u => (
            <button key={u} onClick={() => { setUnit(u); setBarWeight(u === 'kg' ? '20' : '45') }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${unit === u ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-muted">Bar:</span>
        <input type="number" value={barWeight} onChange={e => setBarWeight(e.target.value)}
          className="w-20 bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none focus:border-primary-700" />
        <span className="text-xs text-text-muted">{unit}</span>
      </div>
      <button onClick={calculate} disabled={loading || !target}
        className="w-full py-2.5 bg-primary-700 text-white rounded-xl font-semibold text-sm mb-4 disabled:opacity-50">
        {loading ? 'Calculating…' : 'Calculate'}
      </button>

      {result && (
        <>
          <p className="text-center text-sm text-text-muted mb-3">
            {result.achievable
              ? `${result.actual_weight} ${unit} — ${result.weight_per_side} ${unit} per side`
              : `Closest: ${result.actual_weight} ${unit}`}
          </p>
          {/* Barbell SVG */}
          <div className="flex items-center justify-center gap-0.5 my-3 overflow-x-auto">
            {/* Left plates (reversed) */}
            {[...plateList].reverse().map((w, i) => (
              <div key={`l-${i}`}
                style={{ background: getPlateColor(w), width: 14 + w * 0.3, height: 48 + w, borderRadius: 3 }}
                className="flex-shrink-0"
                title={`${w}${unit}`} />
            ))}
            {/* Bar */}
            <div className="w-16 h-5 bg-zinc-400 rounded-sm flex-shrink-0" />
            {/* Right plates */}
            {plateList.map((w, i) => (
              <div key={`r-${i}`}
                style={{ background: getPlateColor(w), width: 14 + w * 0.3, height: 48 + w, borderRadius: 3 }}
                className="flex-shrink-0"
                title={`${w}${unit}`} />
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {result.plates_per_side.map(p => (
              <div key={p.weight} className="flex items-center gap-1">
                <div style={{ background: getPlateColor(p.weight) }} className="w-3 h-3 rounded-sm" />
                <span className="text-xs text-text-muted">{p.weight}{unit} ×{p.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
