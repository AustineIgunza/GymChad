import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Dumbbell } from 'lucide-react'
import api from '../services/api'

interface SharedSplit {
  id: string; name: string; description: string | null
  days: { day_number: number; label: string; exercises: { exercise?: { name: string } }[] }[]
}

export function SharedSplitPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [split, setSplit] = useState<SharedSplit | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api.get(`/splits/shared/${token}`).then(r => setSplit(r.data)).catch(() => setError('Split not found')).finally(() => setLoading(false))
  }, [token])

  const importSplit = async () => {
    if (!split) return
    setImporting(true)
    try {
      // Duplicate by posting to import endpoint — backend handles via shared token
      await api.post(`/splits/shared/${token}/import`)
      navigate('/splits')
    } catch {
      // Fallback: just navigate to login
      navigate('/login')
    } finally { setImporting(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-text-muted">Loading…</div>
    </div>
  )

  if (error || !split) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <p className="text-text-muted mb-4">{error || 'Split not found'}</p>
        <button onClick={() => navigate('/')} className="text-primary-400 underline">Go home</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg-primary p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{split.name}</h1>
            {split.description && <p className="text-sm text-text-muted">{split.description}</p>}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {split.days.map(day => (
            <motion.div key={day.day_number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: day.day_number * 0.05 }}
              className="bg-bg-card border border-border rounded-2xl p-4">
              <h3 className="font-semibold text-text-primary mb-2">Day {day.day_number}: {day.label}</h3>
              <div className="space-y-1">
                {day.exercises.map((ex, i) => (
                  <p key={i} className="text-sm text-text-muted">• {ex.exercise?.name ?? 'Unknown'}</p>
                ))}
                {day.exercises.length === 0 && <p className="text-sm text-text-muted">Rest day</p>}
              </div>
            </motion.div>
          ))}
        </div>

        <button onClick={importSplit} disabled={importing}
          className="w-full py-3 bg-primary-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Download className="w-5 h-5" />
          {importing ? 'Importing…' : 'Import to My Splits'}
        </button>
      </div>
    </div>
  )
}
