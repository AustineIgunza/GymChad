import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../services/supabase'
import api from '../services/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  _authSubscription: (() => void) | null
  setUser: (user: User | null) => void
  initialize: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

async function verifyWithBackend(supabaseUser: { id: string; email?: string; user_metadata?: any }): Promise<User | null> {
  try {
    const { data } = await api.post('/auth/verify', {
      supabase_id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name,
    })
    return data
  } catch (err: any) {
    console.error('[GymChad] Backend verify failed:', err?.message || err)
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      initialized: false,
      _authSubscription: null,

      setUser: (user) => set({ user }),

      initialize: async () => {
        set({ loading: true })
        try {
          // getSession handles the ?code= / #access_token= hash from Supabase redirect
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('auth timeout')), 5000)
          )
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          if (session?.user) {
            const user = await verifyWithBackend(session.user)
            set({ user })
          } else {
            set({ user: null })
          }
        } catch {
          set({ user: null })
        } finally {
          set({ loading: false, initialized: true })
        }

        // Unsubscribe previous listener before registering a new one
        const prev = useAuthStore.getState()._authSubscription
        if (prev) prev()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const user = await verifyWithBackend(session.user)
            set({ user, initialized: true })
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, initialized: true })
          }
        })
        set({ _authSubscription: () => subscription.unsubscribe() })
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
        // FIX: Proactive — clear persisted workout state on logout so the next user
        // doesn't see a previous session's active workout
        localStorage.removeItem('gymchad-active-workout')
      },
    }),
    {
      name: 'gymchad-auth',
      partialize: (state) => ({ user: state.user, _authSubscription: undefined }),
    }
  )
)
