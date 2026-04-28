// TypeScript interfaces matching the FastAPI Pydantic schemas

export type Goal = 'CUTTING' | 'BULKING' | 'MAINTENANCE'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Sex = 'male' | 'female'
export type Plan = 'FREE' | 'PRO'
export type MuscleGroup =
  | 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS'
  | 'LEGS' | 'GLUTES' | 'CORE' | 'CARDIO' | 'FULL_BODY'
export type MealType =
  | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  | 'PRE_WORKOUT' | 'POST_WORKOUT'

// ── User ───────────────────────────────────────────────────────────────
export interface User {
  id: string
  supabase_id: string
  email: string
  name: string | null
  goal: Goal
  activity_level: ActivityLevel
  sex: Sex | null
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  goal_weight_kg: number | null
  calorie_target: number | null
  protein_target: number | null
  carbs_target: number | null
  fat_target: number | null
  use_kg: boolean
  plan: Plan
  created_at: string
}

// ── Exercise ───────────────────────────────────────────────────────────
export interface Exercise {
  id: string
  name: string
  muscle_group: MuscleGroup
  is_custom: boolean
  user_id: string | null
  description: string | null
  equipment: string | null
}

// ── Workout ────────────────────────────────────────────────────────────
export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
  is_warmup: boolean
  notes: string | null
  exercise?: {
    id: string
    name: string
    muscle_group: MuscleGroup
  }
}

export interface Workout {
  id: string
  user_id: string
  split_day_id: string | null
  label: string
  date: string
  notes: string | null
  duration_min: number | null
  sets: WorkoutSet[]
}

// ── Nutrition ──────────────────────────────────────────────────────────
export interface NutritionLog {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  food_name: string
  food_id: string | null
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  created_at: string
}

export interface DailySummary {
  date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  logs: NutritionLog[]
}

export interface CustomFood {
  id: string
  user_id: string
  name: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  created_at: string
}

export interface FoodSearchResult {
  name: string
  brand: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  serving_size: string | null
  image_url: string | null
}

// ── Splits ─────────────────────────────────────────────────────────────
export interface SplitDayExercise {
  id: string
  split_day_id: string
  exercise_id: string
  order: number
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  notes: string | null
  exercise?: {
    id: string
    name: string
    muscle_group: MuscleGroup
  }
}

export interface SplitDay {
  id: string
  split_id: string
  day_number: number
  label: string
  exercises: SplitDayExercise[]
}

export interface Split {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  days: SplitDay[]
}

// ── Progress ───────────────────────────────────────────────────────────
export interface VolumePoint {
  date: string
  volume: number
  sets: number
}

export interface StrengthPoint {
  date: string
  e1rm: number
  best_weight: number
  best_reps: number
}

// ── Body Measurements ──────────────────────────────────────────────────
export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  waist_cm: number | null
  chest_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  notes: string | null
  created_at: string
}

// ── Cardio ─────────────────────────────────────────────────────────────
export type CardioType =
  | 'recumbent_bike' | 'upright_bike' | 'spinning' | 'treadmill'
  | 'elliptical' | 'rowing' | 'stairmaster' | 'jump_rope'
  | 'battle_ropes' | 'swimming' | 'walking' | 'hiking' | 'hiit' | 'other'

export interface CardioSession {
  id: string
  user_id: string
  date: string
  workout_id: string | null
  cardio_type: CardioType
  duration_min: number
  calories_burned: number | null
  speed_kmh: number | null
  incline_pct: number | null
  level: number | null
  rpm: number | null
  distance_km: number | null
  heart_rate_avg: number | null
  heart_rate_max: number | null
  notes: string | null
  created_at: string
}

export interface DailyActivity {
  id: string
  user_id: string
  date: string
  steps: number
  calories_from_steps: number
  notes: string | null
  created_at: string
}

// ── AI ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
