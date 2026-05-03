import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface AchievementToastProps {
  achievement: {
    name: string
    description: string
    icon: string
    xp_reward: number
  } | null
  onClose: () => void
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!achievement) return
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [achievement, onClose])

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key="achievement-toast"
          initial={{ opacity: 0, y: -80, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100vw-2rem)] max-w-sm"
        >
          {/* Gold gradient card */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-900/90 via-yellow-800/80 to-yellow-900/90 backdrop-blur-xl p-4">

            {/* Sparkle shimmer overlay */}
            <motion.div
              animate={{ x: ['−100%', '150%'] }}
              transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent pointer-events-none"
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-yellow-400/60 hover:text-yellow-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              {/* Icon with glow ring */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
                className="relative flex-shrink-0 w-14 h-14 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center"
              >
                <motion.div
                  animate={{ boxShadow: ['0 0 0px #facc1500', '0 0 20px #facc15aa', '0 0 0px #facc1500'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-2xl"
                />
                <span className="text-2xl">{achievement.icon || '🏆'}</span>
              </motion.div>

              <div className="flex-1 min-w-0">
                {/* Header label */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-yellow-400 text-[10px] font-bold tracking-widest uppercase">
                    ✨ Achievement Unlocked
                  </span>
                </div>

                {/* Name */}
                <p className="text-white font-bold text-sm leading-tight truncate">
                  {achievement.name}
                </p>

                {/* Description */}
                <p className="text-yellow-200/70 text-xs mt-0.5 leading-snug line-clamp-2">
                  {achievement.description}
                </p>

                {/* XP badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 400 }}
                  className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 bg-yellow-400/20 border border-yellow-400/40 rounded-full"
                >
                  <span className="text-yellow-400 font-bold text-xs">
                    +{achievement.xp_reward} XP
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Progress bar auto-dismiss indicator */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400/50 rounded-b-2xl"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
