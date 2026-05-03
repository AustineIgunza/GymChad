// ── Enums ─────────────────────────────────────────────────────────────────────
export type SetType = 'normal' | 'warmup' | 'dropset' | 'superset'

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
  set_type?: SetType
  superset_group?: number | null
  notes?: string | null
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

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  exercise_name: string | null
  weight_kg: number
  reps: number
  achieved_at: string
  pr_type: 'weight' | 'volume' | 'reps'
}

export interface WorkoutSchedule {
  id: string
  user_id: string
  split_id: string | null
  split_day_id: string | null
  split_name: string | null
  split_day_label: string | null
  scheduled_date: string
  completed: boolean
  notes: string | null
}

export interface WarmupSet {
  set_number: number
  pct: number
  weight: number
  reps: number
  unit: string
}

export interface PlateResult {
  target_weight: number
  bar_weight: number
  weight_per_side: number
  plates_per_side: { weight: number; count: number }[]
  unit: string
  achievable: boolean
  actual_weight: number
}

export interface OneRmResult {
  weight: number
  reps: number
  epley: number
  brzycki: number
  lombardi: number
  average: number
  percentage_chart: { pct: number; weight: number; reps: number }[]
}

// ─── Program ───────────────────────────────────────────────
export interface ProgramWorkout {
  id: number
  program_id: number
  week: number
  day: number
  label: string
  focus: string
  exercises_json: any[]
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_rpe?: number
  notes?: string
  is_deload: boolean
  completed: boolean
}

export interface Program {
  id: number
  user_id: string
  name: string
  goal: string
  level: string
  days_per_week: number
  duration_weeks: number
  current_week: number
  current_day: number
  is_active: boolean
  created_at: string
  workouts: ProgramWorkout[]
}

export interface TodayWorkout {
  program_name: string
  week: number
  day: number
  label: string
  focus: string
  exercises: Array<{
    name: string
    sets: number
    reps_min: number
    reps_max: number
    target_rpe?: number
    recommended_weight?: number
    unit: string
  }>
}

// ─── Buddy Session ─────────────────────────────────────────
export interface BuddySession {
  id: number
  session_id: string
  code: string
  host_user_id: string
  guest_user_id?: string
  status: string
  created_at: string
}

export interface PartnerSet {
  exercise_name: string
  weight_kg: number
  reps: number
  rpe?: number
  set_number: number
  logged_at: string
}

// ─── Voice Logger ──────────────────────────────────────────
export interface ParsedSet {
  exercise_name?: string
  weight_kg?: number
  reps?: number
  rpe?: number
  set_type?: string
  confidence: number
  needs_clarification: boolean
  clarification_prompt?: string
}

// ─── Recovery & Nutrition Intelligence ─────────────────────
export interface RecoveryScore {
  score: number
  label: string
  rest_days: number
  volume_spike: number
  nutrition_quality: number
  rpe_trend: number
  components: Record<string, number>
}

export interface MuscleFatigue {
  muscle_groups: Array<{
    name: string
    fatigue_level: number
    last_trained?: string
  }>
}

export interface NutritionBrief {
  brief: string
  carbs_target: number
  protein_target: number
  timing: string
}

// ─── Gamification ──────────────────────────────────────────
export interface UserStreak {
  current_streak: number
  longest_streak: number
  last_workout_date?: string
  is_at_risk: boolean
}

export interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  xp_reward: number
  earned: boolean
  earned_at?: string
}

export interface UserXP {
  total_xp: number
  level: number
  xp_to_next_level: number
  xp_in_current_level: number
}

export interface Challenge {
  id: number
  name: string
  description: string
  type: string
  target_value: number
  start_date: string
  end_date: string
  participant_count: number
  created_by: string
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  value: number
  rank: number
}
