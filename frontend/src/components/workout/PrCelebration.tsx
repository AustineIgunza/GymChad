import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  weight: number
  reps: number
  exerciseName: string
  onClose: () => void
}

// Generate confetti particles
function Confetti() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#dc2626','#1d4ed8','#7c3aed','#f59e0b','#10b981'][i % 5],
    size: 6 + Math.random() * 8,
    duration: 1.5 + Math.random(),
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}

export function PrCelebration({ show, weight, reps, exerciseName, onClose }: Props) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 3500)
      return () => clearTimeout(t)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && (
        <>
          <style>{`
            @keyframes confettiFall {
              0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
          <Confetti />
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-bg-card/95 backdrop-blur-xl border-2 border-primary-700/50 rounded-3xl p-8 text-center shadow-2xl max-w-xs mx-4 pointer-events-auto"
              onClick={onClose}>
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-2xl font-bold text-gradient mb-1">New PR!</h2>
              <p className="text-text-muted text-sm mb-3">{exerciseName}</p>
              <p className="text-3xl font-bold text-text-primary">{weight}kg × {reps}</p>
              <p className="text-xs text-text-muted mt-3">Tap to dismiss</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
