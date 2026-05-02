import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  // In production (Vercel) /api/* is proxied to Railway via vercel.json rewrites.
  // Locally, set VITE_API_URL=http://localhost:8000/api/v1 in frontend/.env
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 15000, // 15s — prevents indefinite hangs if Railway/Supabase is slow
})

// Cached token — avoids calling async getSession() on every request
// (calling getSession() per-request was causing the app-wide hang)
let _token: string | null = null

// Seed from existing session on module load
supabase.auth.getSession().then(({ data: { session } }) => {
  _token = session?.access_token ?? null
})

// Keep updated on sign-in, sign-out, and silent token refresh
supabase.auth.onAuthStateChange((_event, session) => {
  _token = session?.access_token ?? null
})

// Synchronous interceptor — never awaits anything
api.interceptors.request.use((config) => {
  if (_token) config.headers['Authorization'] = `Bearer ${_token}`
  return config
})

export default api
