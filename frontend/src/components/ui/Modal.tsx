import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const MAX_WIDTHS = { sm: 400, md: 500, lg: 640, xl: 800 }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40"
          />

          {/* ── Mobile: bottom sheet ── */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border rounded-t-3xl flex flex-col"
            style={{ maxHeight: '92vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-5 pb-safe">{children}</div>
          </motion.div>

          {/* ── Desktop: centered dialog ── */}
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full bg-bg-secondary border border-border rounded-2xl shadow-2xl flex flex-col"
              style={{ maxWidth: MAX_WIDTHS[size], maxHeight: '88vh' }}
            >
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                  <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="overflow-y-auto flex-1 p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
