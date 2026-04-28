import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

const icons = {
  success: <CheckCircle2 className="w-4 h-4 text-accent-green" />,
  error: <XCircle className="w-4 h-4 text-accent-red" />,
  info: <Info className="w-4 h-4 text-accent-blue" />,
  warning: <AlertTriangle className="w-4 h-4 text-accent-yellow" />,
}

const colors = {
  success: 'border-accent-green/20 bg-accent-green/5',
  error: 'border-accent-red/20 bg-accent-red/5',
  info: 'border-accent-blue/20 bg-accent-blue/5',
  warning: 'border-accent-yellow/20 bg-accent-yellow/5',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl ${colors[toast.type]}`}
          >
            <div className="mt-0.5 flex-shrink-0">{icons[toast.type]}</div>
            <p className="text-sm text-text-primary flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-text-primary flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
