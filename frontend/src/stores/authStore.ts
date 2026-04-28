import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../services/supabase'
import api from '../services/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  initialize: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      loading: false,
      initialized: false,

      setUser: (user) => set({ user }),

      initialize: async () => {
        set({ loading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            // Verify/upsert user in our DB
            const { data } = await api.post('/auth/verify', {
              supabase_id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name,
            })
            set({ user: data })
          }
        } catch {
          set({ user: null })
        } finally {
          set({ loading: false, initialized: true })
        }
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data })
        } catch {
          // ignore
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },
    }),
    {
      name: 'gymchad-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
