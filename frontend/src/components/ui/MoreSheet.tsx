import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, Calendar, Layers, BookOpen, Dumbbell,
  Trophy, Wrench, Users, Settings, ChevronRight, X, Activity
} from 'lucide-react'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    label: 'Training',
    items: [
      { to: '/history', icon: Calendar, label: 'History' },
      { to: '/splits', icon: Layers, label: 'Splits' },
      { to: '/schedule', icon: BookOpen, label: 'Schedule' },
      { to: '/program', icon: Dumbbell, label: 'Program' },
    ]
  },
  {
    label: 'Performance',
    items: [
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
      { to: '/cardio',    icon: Activity,  label: 'Cardio'    },
      { to: '/challenges', icon: Trophy, label: 'Challenges' },
    ]
  },
  {
    label: 'Tools',
    items: [
      { to: '/tools', icon: Wrench, label: 'Tools' },
      { to: '/buddy', icon: Users, label: 'Buddy' },
    ]
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const navigate = useNavigate()

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card rounded-t-3xl pb-safe overflow-y-auto max-h-[80vh]"
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 relative">
              <div className="w-12 h-1 bg-border rounded-full absolute left-1/2 -translate-x-1/2 top-2.5" />
              <h2 className="text-base font-bold text-text-primary">More</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            <div className="px-4 pb-6">
              {sections.map(section => (
                <div key={section.label} className="mb-4">
                  <p className="text-[11px] text-text-disabled uppercase tracking-widest px-2 mb-1.5">{section.label}</p>
                  <div className="bg-bg-tertiary rounded-2xl overflow-hidden">
                    {section.items.map((item, i) => (
                      <button
                        key={item.to}
                        onClick={() => go(item.to)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left ${i > 0 ? 'border-t border-border/50' : ''}`}
                      >
                        <item.icon className="w-5 h-5 text-text-muted flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-text-primary">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-text-muted/50" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
