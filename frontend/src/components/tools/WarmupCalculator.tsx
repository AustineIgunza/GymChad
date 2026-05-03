import { useState } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../../services/api'

interface WarmupSet { set_number: number; pct: number; weight: number; reps: number; unit: string }

interface Props { onClose: () => void; defaultWeight?: number }

export function WarmupCalculator({ onClose, defaultWeight }: Props) {
  const [weight, setWeight] = useState(defaultWeight?.toString() ?? '')
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [sets, setSets] = useState<WarmupSet[]>([])
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    if (!weight) return
    setLoading(true)
    try {
      const res = await api.post('/tools/warmup-calculator', { working_weight: parseFloat(weight), unit })
      setSets(res.data.warmup_sets)
    } catch {} finally { setLoading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary">Warmup Calculator</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          placeholder="Working weight"
          className="flex-1 bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none focus:border-primary-700"
        />
        <div className="flex rounded-xl overflow-hidden border border-border">
          {(['kg','lb'] as const).map(u => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${unit === u ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>
      <button onClick={calculate} disabled={loading || !weight}
        className="w-full py-2.5 bg-primary-700 text-white rounded-xl font-semibold text-sm mb-4 disabled:opacity-50">
        {loading ? 'Calculating…' : 'Calculate'}
      </button>
      {sets.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border">
              <th className="text-left pb-2">Set</th>
              <th className="text-right pb-2">%</th>
              <th className="text-right pb-2">Weight</th>
              <th className="text-right pb-2">Reps</th>
            </tr>
          </thead>
          <tbody>
            {sets.map(s => (
              <tr key={s.set_number} className="border-b border-border/50">
                <td className="py-2 text-text-secondary">Warm {s.set_number}</td>
                <td className="py-2 text-right text-text-muted">{Math.round(s.pct * 100)}%</td>
                <td className="py-2 text-right font-semibold text-text-primary">{s.weight.toFixed(1)} {unit}</td>
                <td className="py-2 text-right text-text-secondary">{s.reps} reps</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  )
}
