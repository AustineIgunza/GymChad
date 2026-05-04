import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface UIState {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  theme: 'dark' | 'light'
  showRpe: boolean
  toggleTheme: () => void
  toggleRpe: () => void
  useKg: boolean
  toggleUnit: () => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  theme: (localStorage.getItem('theme') ?? 'dark') as 'dark' | 'light',
  showRpe: localStorage.getItem('showRpe') === 'true',

  toggleTheme: () => set(s => {
    const t = s.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    document.documentElement.classList.toggle('light', t === 'light')
    return { theme: t }
  }),

  toggleRpe: () => set(s => {
    const v = !s.showRpe
    localStorage.setItem('showRpe', String(v))
    return { showRpe: v }
  }),

  useKg: localStorage.getItem('useKg') !== 'false', // default true (kg)

  toggleUnit: () => set(s => {
    const v = !s.useKg
    localStorage.setItem('useKg', String(v))
    return { useKg: v }
  }),
}))

// Apply saved theme on module load
const savedTheme = localStorage.getItem('theme') ?? 'dark'
document.documentElement.classList.add(savedTheme)

// Helper hook
export const useToast = () => {
  const addToast = useUIStore((s) => s.addToast)
  return {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }
}
