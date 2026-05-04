import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, SkipForward, Plus, Minus } from 'lucide-react'

const PRESETS = [60, 90, 120, 180]
const LS_KEY = 'rest_timer_seconds'

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

interface Props {
  onClose: () => void
  onComplete?: () => void
  initialSeconds?: number
}

export function RestTimer({ onClose, onComplete, initialSeconds }: Props) {
  const stored = parseInt(localStorage.getItem(LS_KEY) || '90', 10)
  const [total, setTotal] = useState(initialSeconds ?? stored)
  const [remaining, setRemaining] = useState(initialSeconds ?? stored)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(total))
  }, [total])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          playBeep()
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
          onComplete?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [running, onComplete])

  const reset = (secs: number) => {
    clearInterval(intervalRef.current!)
    setTotal(secs)
    setRemaining(secs)
    setRunning(true)
  }

  const add = (secs: number) => {
    setRemaining(r => Math.max(0, r + secs))
    setTotal(t => Math.max(0, t + secs))
  }

  const pct = total > 0 ? remaining / total : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = circumference * pct
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-bg-card border border-border rounded-2xl p-5 shadow-2xl w-72"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-secondary">Rest Timer</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Circular progress */}
      <div className="flex justify-center mb-3">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={radius} fill="none"
              stroke={remaining <= 10 ? '#ef4444' : '#7c3aed'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.5s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-text-primary">
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
            <button
              onClick={() => setRunning(r => !r)}
              className="text-xs text-text-muted mt-1 hover:text-text-primary"
            >
              {running ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* +/- 30s */}
      <div className="flex justify-center gap-3 mb-3">
        <button onClick={() => add(-30)} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-3 py-1.5 bg-bg-tertiary rounded-lg">
          <Minus className="w-3 h-3" /> 30s
        </button>
        <button onClick={() => add(30)} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-3 py-1.5 bg-bg-tertiary rounded-lg">
          <Plus className="w-3 h-3" /> 30s
        </button>
        <button onClick={onClose} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-3 py-1.5 bg-bg-tertiary rounded-lg">
          <SkipForward className="w-3 h-3" /> Skip
        </button>
      </div>

      {/* Presets */}
      <div className="flex gap-2 justify-center">
        {PRESETS.map(s => (
          <button
            key={s}
            onClick={() => reset(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${total === s && remaining === s ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
          >
            {s}s
          </button>
        ))}
      </div>
    </motion.div>
  )
}
