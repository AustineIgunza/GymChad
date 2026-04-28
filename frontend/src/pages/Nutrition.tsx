import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, X, PencilLine } from 'lucide-react'
import { nutritionApi } from '../services/nutrition'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../stores/uiStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { MacroRing } from '../components/ui/MacroRing'
import { PageHeader } from '../components/ui/PageHeader'
import type { DailySummary, NutritionLog, FoodSearchResult, MealType } from '../types'

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: '🌅 Breakfast', LUNCH: '☀️ Lunch', DINNER: '🌙 Dinner',
  SNACK: '🍎 Snack', PRE_WORKOUT: '⚡ Pre-Workout', POST_WORKOUT: '💪 Post-Workout',
}
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']

type AddMode = 'search' | 'manual'

interface ManualFood {
  name: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
  quantity_g: string
}

const defaultManual: ManualFood = {
  name: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  quantity_g: '100',
}

export function NutritionPage() {
  const { user } = useAuthStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('search')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [mealType, setMealType] = useState<MealType>('BREAKFAST')
  const [saving, setSaving] = useState(false)
  const [manualFood, setManualFood] = useState<ManualFood>(defaultManual)
  const toast = useToast()

  const fetchNutrition = async (d: string) => {
    setLoading(true)
    try {
      const data = await nutritionApi.getDay(d)
      setSummary(data)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNutrition(date) }, [date])

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  const handleSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const results = await nutritionApi.searchFoods(searchQ)
      setSearchResults(results)
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const calcMacros = (food: FoodSearchResult, grams: number) => {
    const ratio = grams / 100
    return {
      calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
      protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
    }
  }

  const handleLog = async () => {
    if (!selectedFood) return
    setSaving(true)
    try {
      const g = parseFloat(quantity)
      const macros = calcMacros(selectedFood, g)
      await nutritionApi.create({ date, meal_type: mealType, food_name: selectedFood.name, quantity_g: g, ...macros })
      await fetchNutrition(date)
      closeModal()
      toast.success('Food logged!')
    } catch {
      toast.error('Failed to log food')
    } finally {
      setSaving(false)
    }
  }

  const handleLogManual = async () => {
    if (!manualFood.name.trim() || !manualFood.calories) {
      toast.error('Name and calories are required')
      return
    }
    setSaving(true)
    try {
      const qty = parseFloat(manualFood.quantity_g) || 100
      await nutritionApi.create({
        date,
        meal_type: mealType,
        food_name: manualFood.name,
        quantity_g: qty,
        calories: parseFloat(manualFood.calories) || 0,
        protein_g: parseFloat(manualFood.protein_g) || 0,
        carbs_g: parseFloat(manualFood.carbs_g) || 0,
        fat_g: parseFloat(manualFood.fat_g) || 0,
      })
      await fetchNutrition(date)
      closeModal()
      toast.success('Food logged!')
    } catch {
      toast.error('Failed to log food')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await nutritionApi.delete(id)
      await fetchNutrition(date)
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const closeModal = () => {
    setAddModal(false)
    setSelectedFood(null)
    setSearchQ('')
    setSearchResults([])
    setManualFood(defaultManual)
    setAddMode('search')
  }

  const groupedLogs = MEAL_TYPES.reduce((acc, m) => {
    acc[m] = summary?.logs.filter(l => l.meal_type === m) || []
    return acc
  }, {} as Record<MealType, NutritionLog[]>)

  const macros = calcMacros(
    selectedFood || { calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0 } as any,
    parseFloat(quantity) || 100
  )

  return (
    <div className="page px-4">
      <PageHeader
        title="Nutrition"
        action={
          <Button size="sm" onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" /> Log Food
          </Button>
        }
      />

      {/* Date picker */}
      <div className="flex items-center justify-between bg-bg-card border border-border rounded-2xl px-4 py-3 mb-4">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-text-primary text-sm">
          {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <button
          onClick={() => changeDate(1)}
          disabled={date >= new Date().toISOString().split('T')[0]}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Macro ring summary */}
      {summary && (
        <Card padding="md" className="mb-4">
          <div className="flex justify-center">
            <MacroRing
              calories={summary.total_calories}
              target={user?.calorie_target || 2000}
              protein={summary.total_protein_g}
              carbs={summary.total_carbs_g}
              fat={summary.total_fat_g}
              size={160}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
            {[
              { label: 'Calories', val: Math.round(summary.total_calories), target: user?.calorie_target, unit: 'kcal', color: 'text-primary-400' },
              { label: 'Protein', val: Math.round(summary.total_protein_g), target: user?.protein_target, unit: 'g', color: 'text-accent-blue' },
              { label: 'Carbs', val: Math.round(summary.total_carbs_g), target: user?.carbs_target, unit: 'g', color: 'text-accent-yellow' },
              { label: 'Fat', val: Math.round(summary.total_fat_g), target: user?.fat_target, unit: 'g', color: 'text-accent-orange' },
            ].map(({ label, val, target, unit, color }) => (
              <div key={label} className="text-center">
                <div className={`text-base font-bold ${color}`}>{val}</div>
                <div className="text-xs text-text-muted">{label}</div>
                {target && <div className="text-xs text-text-disabled">/{target}{unit}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Meals */}
      <div className="space-y-3">
        {MEAL_TYPES.map(mealType => {
          const logs = groupedLogs[mealType]
          if (!logs.length && !loading) return null
          return (
            <Card key={mealType} padding="none">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-sm">{MEAL_LABELS[mealType]}</h3>
                <span className="text-xs text-text-muted">
                  {Math.round(logs.reduce((a, l) => a + l.calories, 0))} kcal
                </span>
              </div>
              <div className="divide-y divide-border">
                {logs.map(log => (
                  <motion.div
                    key={log.id}
                    layout
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{log.food_name}</p>
                      <p className="text-xs text-text-muted">{log.quantity_g}g · {Math.round(log.protein_g)}g P · {Math.round(log.carbs_g)}g C · {Math.round(log.fat_g)}g F</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-text-secondary">{Math.round(log.calories)}</span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {!logs.length && loading && (
                  <div className="px-4 py-3">
                    <div className="skeleton h-10 rounded-lg" />
                  </div>
                )}
              </div>
            </Card>
          )
        })}

        {!loading && !summary?.logs.length && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl mb-3"
            >
              🥗
            </motion.div>
            <p className="text-text-primary font-semibold mb-1">Nothing logged yet</p>
            <p className="text-text-muted text-sm mb-4">Track your meals to hit your targets</p>
            <Button onClick={() => setAddModal(true)}>
              <Plus className="w-4 h-4" /> Log your first meal
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add food modal */}
      <Modal open={addModal} onClose={closeModal} title="Log Food">

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-4">
          <button
            onClick={() => { setAddMode('search'); setSelectedFood(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === 'search' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            <Search className="w-3.5 h-3.5" /> Search Database
          </button>
          <button
            onClick={() => { setAddMode('manual'); setSelectedFood(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === 'manual' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            <PencilLine className="w-3.5 h-3.5" /> Manual Entry
          </button>
        </div>

        {/* Meal type selector (shared) */}
        <div className="mb-4">
          <p className="text-xs font-medium text-text-secondary mb-2">Meal</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map(m => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${mealType === m ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'}`}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* ── SEARCH MODE ── */}
        {addMode === 'search' && (
          !selectedFood ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search food..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  leftIcon={<Search className="w-4 h-4" />}
                  className="flex-1"
                />
                <Button onClick={handleSearch} loading={searching}>Go</Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((food, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedFood(food)}
                    className="w-full text-left p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover transition-colors border border-border"
                  >
                    <p className="text-sm font-medium text-text-primary leading-tight truncate">{food.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g C · {food.fat_per_100g}g F per 100g
                    </p>
                  </button>
                ))}
                {!searching && !searchResults.length && searchQ && (
                  <p className="text-center text-text-muted text-sm py-4">No results. Try manual entry instead.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-primary text-sm leading-snug flex-1">{selectedFood.name}</p>
                <button onClick={() => setSelectedFood(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Input label="Quantity (g)" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />

              <div className="grid grid-cols-4 gap-2 p-3 bg-bg-tertiary rounded-xl text-center">
                {[
                  { label: 'Calories', val: macros.calories },
                  { label: 'Protein', val: `${macros.protein_g}g` },
                  { label: 'Carbs', val: `${macros.carbs_g}g` },
                  { label: 'Fat', val: `${macros.fat_g}g` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="text-sm font-bold text-text-primary">{val}</div>
                    <div className="text-xs text-text-muted">{label}</div>
                  </div>
                ))}
              </div>

              <Button fullWidth loading={saving} onClick={handleLog}>Log Food</Button>
            </div>
          )
        )}

        {/* ── MANUAL MODE ── */}
        {addMode === 'manual' && (
          <div className="space-y-4">
            <Input
              label="Food Name"
              placeholder="e.g. Chicken Breast"
              value={manualFood.name}
              onChange={e => setManualFood(f => ({ ...f, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Calories (kcal) *"
                type="number"
                placeholder="250"
                value={manualFood.calories}
                onChange={e => setManualFood(f => ({ ...f, calories: e.target.value }))}
              />
              <Input
                label="Serving size (g)"
                type="number"
                placeholder="100"
                value={manualFood.quantity_g}
                onChange={e => setManualFood(f => ({ ...f, quantity_g: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Protein (g)"
                type="number"
                placeholder="30"
                value={manualFood.protein_g}
                onChange={e => setManualFood(f => ({ ...f, protein_g: e.target.value }))}
              />
              <Input
                label="Carbs (g)"
                type="number"
                placeholder="0"
                value={manualFood.carbs_g}
                onChange={e => setManualFood(f => ({ ...f, carbs_g: e.target.value }))}
              />
              <Input
                label="Fat (g)"
                type="number"
                placeholder="5"
                value={manualFood.fat_g}
                onChange={e => setManualFood(f => ({ ...f, fat_g: e.target.value }))}
              />
            </div>
            <p className="text-xs text-text-muted">Enter the total for your serving size above, not per 100g.</p>
            <Button fullWidth loading={saving} onClick={handleLogManual} disabled={!manualFood.name.trim() || !manualFood.calories}>
              Log Food
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
