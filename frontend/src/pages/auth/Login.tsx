import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Dumbbell } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../stores/uiStore'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const { initialize } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  const resendConfirmation = async () => {
    if (!email) { toast.error('Enter your email first'); return }
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast.success('Confirmation email resent — check your inbox')
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await initialize()
      // Check if the backend successfully verified and returned a user
      const { user } = useAuthStore.getState()
      if (!user) {
        toast.error('Signed in but could not reach the server. Check your connection and try again.')
        return
      }
      navigate('/')
    } catch (err: any) {
      const msg: string = err.message || ''
      if (msg.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirmation(true)
        toast.error('Please confirm your email first — check your inbox for a confirmation link.')
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        toast.error('Wrong email or password.')
      } else {
        toast.error(msg || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-animated">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4 mb-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center shadow-glow-red">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gradient">GymChad</h1>
          <p className="text-text-muted text-sm mt-1">Your AI-powered gym companion</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="text-xl font-bold text-text-primary mb-6">Welcome back</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />
            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
              Sign In
            </Button>
          </form>
          {needsConfirmation && (
            <div className="mt-4 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl text-center">
              <p className="text-xs text-text-secondary mb-2">Didn't get the confirmation email?</p>
              <button
                onClick={resendConfirmation}
                disabled={resending}
                className="text-xs font-semibold text-accent-yellow hover:text-accent-yellow/80 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend confirmation email'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 font-medium hover:text-primary-300">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
