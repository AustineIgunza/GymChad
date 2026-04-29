// ── Enums ─────────────────────────────────────────────────────────────────────
export type Goal = 'CUTTING' | 'BULKING' | 'MAINTENANCE'
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MuscleGroup = 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS' | 'LEGS' | 'GLUTES' | 'CORE' | 'CARDIO' | 'FULL_BODY'
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_WORKOUT' | 'POST_WORKOUT'
export type CardioType =
  | 'recumbent_bike' | 'upright_bike' | 'spinning' | 'treadmill' | 'walking'
  | 'elliptical' | 'rowing' | 'stairmaster' | 'jump_rope' | 'swimming'
  | 'hiking' | 'battle_ropes' | 'hiit' | 'other'

// ── Core models (snake_case — matches FastAPI JSON responses) ─────────────────
export interface User {
  id: string
  supabase_id: string
  email: string
  name: string | null
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: Sex | null
  goal: Goal | null
  activity_level: ActivityLevel | null
  calorie_target: number | null
  protein_target: number | null
  carbs_target: number | null
  fat_target: number | null
  goal_weight_kg: number | null
  steps_today?: number
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  muscle_group: MuscleGroup
  equipment: string | null
  description: string | null
  is_custom: boolean
  user_id: string | null
}

export interface Split {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  days_count: number
  created_at: string
  days: SplitDay[]
}

export interface SplitDay {
  id: string
  split_id: string
  day_number: number
  label: string
  exercises: SplitDayExercise[]
}

export interface SplitDayExercise {
  id: string
  split_day_id: string
  exercise_id: string
  order_index: number
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  exercise?: Exercise
}

export interface Workout {
  id: string
  user_id: string
  split_day_id: string | null
  label: string
  date: string
  notes: string | null
  duration_min: number | null
  sets?: WorkoutSet[]
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
  is_warmup: boolean
  exercise?: Exercise
}

export interface NutritionLog {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  food_name: string
  food_id?: string | null
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  created_at: string
}

// Backend DailySummary returns field named 'logs'
export interface DailySummary {
  date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  logs: NutritionLog[]
}

// CustomFood — per-100g values matching backend schema
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
  id: string
  name: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
}

export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  waist_cm: number | null
  chest_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  notes: string | null
  created_at: string
}

export interface CardioSession {
  id: string
  user_id: string
  date: string
  cardio_type: CardioType
  duration_min: number
  calories_burned: number | null
  level: number | null
  speed_kmh: number | null
  incline_pct: number | null
  rpm: number | null
  distance_km: number | null
  notes: string | null
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AISession {
  id: string
  user_id: string
  created_at: string
  messages: ChatMessage[]
}
