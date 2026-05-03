import { useState } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../../services/api'

interface OneRmResult {
  weight: number; reps: number; epley: number; brzycki: number
  lombardi: number; average: number
  percentage_chart: { pct: number; weight: number; reps: number }[]
}

interface Props { onClose: () => void }

export function OneRmCalculator({ onClose }: Props) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [result, setResult] = useState<OneRmResult | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    if (!weight || !reps) return
    setLoading(true)
    try {
      const res = await api.post('/tools/1rm-calculator', { weight: parseFloat(weight), reps: parseInt(reps) })
      setResult(res.data)
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
        <h3 className="font-bold text-text-primary">1RM Calculator</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
      </div>
      <div className="flex gap-2 mb-4">
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
          placeholder="Weight (kg)"
          className="flex-1 bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none focus:border-primary-700" />
        <input type="number" value={reps} onChange={e => setReps(e.target.value)}
          placeholder="Reps"
          className="w-20 bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm outline-none focus:border-primary-700" />
      </div>
      <button onClick={calculate} disabled={loading || !weight || !reps}
        className="w-full py-2.5 bg-primary-700 text-white rounded-xl font-semibold text-sm mb-4 disabled:opacity-50">
        {loading ? 'Calculating…' : 'Calculate'}
      </button>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Epley', value: result.epley },
              { label: 'Brzycki', value: result.brzycki },
              { label: 'Lombardi', value: result.lombardi },
            ].map(f => (
              <div key={f.label} className="bg-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted">{f.label}</p>
                <p className="text-lg font-bold text-text-primary">{f.value.toFixed(1)}</p>
              </div>
            ))}
          </div>
          <div className="bg-bg-tertiary rounded-xl p-3 text-center mb-4">
            <p className="text-xs text-text-muted">Average 1RM</p>
            <p className="text-2xl font-bold text-gradient">{result.average.toFixed(1)} kg</p>
          </div>
          {/* Percentage table */}
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-text-muted border-b border-border">
                <th className="text-left pb-1">%</th>
                <th className="text-right pb-1">Weight</th>
                <th className="text-right pb-1">~Reps</th>
              </tr></thead>
              <tbody>
                {result.percentage_chart.map(row => (
                  <tr key={row.pct} className="border-b border-border/40">
                    <td className="py-1 text-text-muted">{Math.round(row.pct * 100)}%</td>
                    <td className="py-1 text-right font-medium text-text-primary">{row.weight.toFixed(1)}</td>
                    <td className="py-1 text-right text-text-secondary">{row.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  )
}
