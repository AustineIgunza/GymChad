import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Target, LogOut, Scale, ChevronRight, Dumbbell, Download } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useToast, useUIStore } from '../stores/uiStore'
import api from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import type { Goal, ActivityLevel } from '../types'

export function SettingsPage() {
  const { user, logout } = useAuthStore()
  const [profileModal, setProfileModal] = useState(false)
  const [nutritionModal, setNutritionModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { theme, toggleTheme, showRpe, toggleRpe } = useUIStore()

  const [form, setForm] = useState({
    name: user?.name || '',
    weight_kg: String(user?.weight_kg || ''),
    height_cm: String(user?.height_cm || ''),
    age: String(user?.age || ''),
    goal_weight_kg: String(user?.goal_weight_kg || ''),
    sex: user?.sex || 'male',
    goal: user?.goal || 'MAINTENANCE' as Goal,
    activity_level: user?.activity_level || 'moderate' as ActivityLevel,
  })

  const [nutrForm, setNutrForm] = useState({
    calorie_target: String(user?.calorie_target || ''),
    protein_target: String(user?.protein_target || ''),
    carbs_target: String(user?.carbs_target || ''),
    fat_target: String(user?.fat_target || ''),
  })

  const saveProfile = async () => {
    const weight = parseFloat(form.weight_kg)
    const height = parseFloat(form.height_cm)
    const age = parseInt(form.age)
    const goalWeight = parseFloat(form.goal_weight_kg)

    if (form.weight_kg && isNaN(weight)) {
      toast.error('Invalid weight')
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', {
        ...form,
        weight_kg: isNaN(weight) ? undefined : weight,
        height_cm: isNaN(height) ? undefined : height,
        age: isNaN(age) ? undefined : age,
        goal_weight_kg: isNaN(goalWeight) ? undefined : goalWeight,
      })
      useAuthStore.getState().setUser(data)
      setProfileModal(false)
      toast.success('Profile updated!')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail
      toast.error(msg || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const saveNutrition = async () => {
    const cal = parseInt(nutrForm.calorie_target)
    const prot = parseInt(nutrForm.protein_target)
    const carbs = parseInt(nutrForm.carbs_target)
    const fat = parseInt(nutrForm.fat_target)

    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', {
        calorie_target: isNaN(cal) ? undefined : cal,
        protein_target: isNaN(prot) ? undefined : prot,
        carbs_target: isNaN(carbs) ? undefined : carbs,
        fat_target: isNaN(fat) ? undefined : fat,
      })
      useAuthStore.getState().setUser(data)
      setNutritionModal(false)
      toast.success('Nutrition targets updated!')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail
      toast.error(msg || 'Failed to save targets')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleExport = async (type: 'workouts' | 'measurements' | 'nutrition') => {
    try {
      const res = await api.get(`/export/${type}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `gymchad_${type}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type} exported!`)
    } catch { toast.error('Export failed') }
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="page px-4">
      <PageHeader title="Settings" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.06 } }}
        className="space-y-4"
      >
        {/* Profile card */}
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-700/20 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-text-primary">{user?.name || 'Athlete'}</h2>
              <p className="text-sm text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Appearance card */}
        <div className="glass rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-text-primary mb-3">Appearance</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-text-primary">Dark Mode</p>
              <p className="text-xs text-text-muted">Toggle dark/light theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-700' : 'bg-zinc-400'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-text-primary">Show RPE Selector</p>
              <p className="text-xs text-text-muted">Rate of Perceived Exertion per set</p>
            </div>
            <button
              onClick={toggleRpe}
              className={`relative w-12 h-6 rounded-full transition-colors ${showRpe ? 'bg-primary-700' : 'bg-zinc-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showRpe ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Settings sections */}
        {[
          {
            icon: <User className="w-4 h-4" />,
            title: 'Profile & Body Stats',
            desc: `${user?.weight_kg || '?'}kg · ${user?.height_cm || '?'}cm · goal: ${user?.goal_weight_kg || '?'}kg`,
            onClick: () => setProfileModal(true),
          },
          {
            icon: <Target className="w-4 h-4" />,
            title: 'Nutrition Targets',
            desc: `${user?.calorie_target || '?'} kcal target`,
            onClick: () => setNutritionModal(true),
          },
        ].map(({ icon, title, desc, onClick }) => (
          <button key={title} onClick={onClick} className="w-full">
            <Card hover padding="md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-primary-400">
                  {icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-text-primary text-sm">{title}</p>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </Card>
          </button>
        ))}

        {/* Goal badge */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-primary-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">Current Goal</p>
                <p className="text-xs text-text-muted">Change via profile settings</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              user?.goal === 'CUTTING' ? 'bg-accent-red/10 text-accent-red' :
              user?.goal === 'BULKING' ? 'bg-accent-green/10 text-accent-green' :
              'bg-bg-tertiary text-text-muted'
            }`}>
              {user?.goal}
            </span>
          </div>
        </Card>

        {/* Export Data */}
        <div className="glass rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-text-primary mb-3">Export Data</h3>
          <div className="space-y-2">
            {(['workouts', 'measurements', 'nutrition'] as const).map(type => (
              <button key={type} onClick={() => handleExport(type)}
                className="w-full flex items-center gap-3 py-2.5 px-3 bg-bg-tertiary rounded-xl hover:bg-bg-hover transition-colors text-left">
                <Download className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-primary capitalize">Export {type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <Button variant="danger" fullWidth onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>

        {/* Footer */}
        <p className="text-center text-text-disabled text-xs pb-2">GymChad v1.0 · Powered by Claude AI</p>
      </motion.div>

      {/* Profile modal */}
      <Modal open={profileModal} onClose={() => setProfileModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
          <Select
            label="Goal"
            value={form.goal}
            onChange={e => set('goal', e.target.value)}
            options={[
              { value: 'CUTTING', label: '🔥 Cutting' },
              { value: 'MAINTENANCE', label: '⚖️ Maintenance' },
              { value: 'BULKING', label: '💪 Bulking' },
            ]}
          />
          <Select
            label="Sex"
            value={form.sex}
            onChange={e => set('sex', e.target.value)}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
            <Input label="Height (cm)" type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" type="number" value={form.age} onChange={e => set('age', e.target.value)} />
            <Input label="Goal Weight (kg)" type="number" placeholder="e.g. 75" value={form.goal_weight_kg} onChange={e => set('goal_weight_kg', e.target.value)} />
          </div>
          <Select
            label="Activity Level"
            value={form.activity_level}
            onChange={e => set('activity_level', e.target.value)}
            options={[
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'light', label: 'Lightly Active' },
              { value: 'moderate', label: 'Moderately Active' },
              { value: 'active', label: 'Very Active' },
              { value: 'very_active', label: 'Extremely Active' },
            ]}
          />
          <p className="text-xs text-text-muted">Saving will recalculate your TDEE and macro targets.</p>
          <Button fullWidth loading={saving} onClick={saveProfile}>Save Changes</Button>
        </div>
      </Modal>

      {/* Nutrition targets modal */}
      <Modal open={nutritionModal} onClose={() => setNutritionModal(false)} title="Nutrition Targets">
        <div className="space-y-4">
          <Input
            label="Daily Calories (kcal)"
            type="number"
            value={nutrForm.calorie_target}
            onChange={e => setNutrForm(f => ({ ...f, calorie_target: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" value={nutrForm.protein_target} onChange={e => setNutrForm(f => ({ ...f, protein_target: e.target.value }))} />
            <Input label="Carbs (g)" type="number" value={nutrForm.carbs_target} onChange={e => setNutrForm(f => ({ ...f, carbs_target: e.target.value }))} />
            <Input label="Fat (g)" type="number" value={nutrForm.fat_target} onChange={e => setNutrForm(f => ({ ...f, fat_target: e.target.value }))} />
          </div>
          <Button fullWidth loading={saving} onClick={saveNutrition}>Save Targets</Button>
        </div>
      </Modal>
    </div>
  )
}
