import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Target, Activity, Scale } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../stores/uiStore'
import type { Goal, ActivityLevel, Sex } from '../../types'

const STEPS = ['goal', 'body', 'activity'] as const
type Step = typeof STEPS[number]

export function Onboarding() {
  const [step, setStep] = useState<Step>('goal')
  const [form, setForm] = useState({
    name: '',
    goal: 'MAINTENANCE' as Goal,
    sex: 'male' as Sex,
    weight_kg: '',
    height_cm: '',
    age: '',
    activity_level: 'moderate' as ActivityLevel,
  })
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  const stepIdx = STEPS.indexOf(step)

  const next = () => setStep(STEPS[stepIdx + 1])
  const back = () => setStep(STEPS[stepIdx - 1])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await api.put('/auth/onboarding', {
        ...form,
        weight_kg: parseFloat(form.weight_kg),
        height_cm: parseFloat(form.height_cm),
        age: parseInt(form.age),
      })
      setUser(data)
      navigate('/')
      toast.success('Welcome to GymChad! 💪')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const goalOptions = [
    { value: 'CUTTING', icon: '🔥', title: 'Cutting', desc: 'Lose fat, maintain muscle' },
    { value: 'MAINTENANCE', icon: '⚖️', title: 'Maintenance', desc: 'Stay lean and perform' },
    { value: 'BULKING', icon: '💪', title: 'Bulking', desc: 'Build muscle and strength' },
  ]

  return (
    <div className="min-h-screen bg-animated flex flex-col p-6 pt-16">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIdx ? 'bg-primary-600' : 'bg-border'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'goal' && (
          <motion.div key="goal" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary-700/20 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">What's your goal?</h1>
              <p className="text-text-muted">This shapes your calorie and macro targets.</p>
            </div>

            <Input
              label="What should we call you?"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="mb-6"
            />

            <div className="space-y-3">
              {goalOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('goal', opt.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                    form.goal === opt.value
                      ? 'border-primary-600 bg-primary-700/10'
                      : 'border-border bg-bg-card hover:border-border-strong'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className="font-semibold text-text-primary">{opt.title}</div>
                    <div className="text-sm text-text-muted">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'body' && (
          <motion.div key="body" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary-700/20 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6 text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">Your body stats</h1>
              <p className="text-text-muted">Used to calculate your TDEE and macro targets.</p>
            </div>

            <div className="space-y-4">
              <Select
                label="Sex"
                value={form.sex}
                onChange={(e) => set('sex', e.target.value)}
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Weight (kg)"
                  type="number"
                  placeholder="75"
                  value={form.weight_kg}
                  onChange={(e) => set('weight_kg', e.target.value)}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  placeholder="175"
                  value={form.height_cm}
                  onChange={(e) => set('height_cm', e.target.value)}
                />
              </div>
              <Input
                label="Age"
                type="number"
                placeholder="25"
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
              />
            </div>
          </motion.div>
        )}

        {step === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary-700/20 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">Activity level</h1>
              <p className="text-text-muted">Outside the gym — how active are you day-to-day?</p>
            </div>

            <div className="space-y-3">
              {[
                { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement' },
                { value: 'light', label: 'Lightly Active', desc: 'Exercise 1–3 days/week' },
                { value: 'moderate', label: 'Moderately Active', desc: 'Exercise 3–5 days/week' },
                { value: 'active', label: 'Very Active', desc: 'Hard exercise 6–7 days/week' },
                { value: 'very_active', label: 'Extremely Active', desc: 'Physical job + hard training' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('activity_level', opt.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                    form.activity_level === opt.value
                      ? 'border-primary-600 bg-primary-700/10'
                      : 'border-border bg-bg-card hover:border-border-strong'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-text-primary">{opt.label}</div>
                    <div className="text-sm text-text-muted">{opt.desc}</div>
                  </div>
                  {form.activity_level === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {stepIdx > 0 && (
          <Button variant="secondary" onClick={back} className="flex-1">
            Back
          </Button>
        )}
        {stepIdx < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1" fullWidth>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} loading={loading} className="flex-1" fullWidth>
            Let's go! 🚀
          </Button>
        )}
      </div>
    </div>
  )
}
