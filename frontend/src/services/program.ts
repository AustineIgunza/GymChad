import api from './api'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProgramGoal = 'build_muscle' | 'get_stronger' | 'lose_weight' | 'general_fitness'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentOption =
  | 'Barbell'
  | 'Dumbbells'
  | 'Cable Machine'
  | 'Smith Machine'
  | 'Resistance Bands'
  | 'Bodyweight Only'

export interface GenerateProgramInput {
  goal: ProgramGoal
  level: ExperienceLevel
  days_per_week: number
  available_equipment: EquipmentOption[]
  duration_weeks: number
}

export interface ProgramExercise {
  exercise_id: string
  exercise_name: string
  sets: number
  reps_min: number
  reps_max: number
  target_rpe: number | null
  recommended_weight_kg: number | null
  notes: string | null
}

export interface TodayWorkout {
  program_id: string
  day_number: number
  label: string
  focus: string | null
  exercises: ProgramExercise[]
}

export interface WeekDay {
  day_number: number
  label: string
  is_rest: boolean
  completed: boolean
}

export interface ActiveProgram {
  id: string
  name: string
  goal: ProgramGoal
  level: ExperienceLevel
  duration_weeks: number
  current_week: number
  days_per_week: number
  week_days: WeekDay[]
  created_at: string
  paused: boolean
}

export interface ProgressionInfo {
  exercise_id: string
  exercise_name: string
  current_weight_kg: number | null
  suggested_weight_kg: number | null
  bumped_up: boolean
  increment_kg: number | null
  recommendation: string
}

// ── API ────────────────────────────────────────────────────────────────────────

export const programApi = {
  /** Generate a new program from user preferences. */
  generate: (data: GenerateProgramInput) =>
    api.post<ActiveProgram>('/program/generate', data).then(r => r.data),

  /** Get today's workout prescription for the active program. */
  today: () =>
    api.get<TodayWorkout>('/program/today').then(r => r.data),

  /** Get the current active program. */
  current: () =>
    api.get<ActiveProgram>('/program/current').then(r => r.data),

  /** Mark today's workout done and advance to the next day. Returns next day info. */
  advance: () =>
    api.post<TodayWorkout>('/program/advance').then(r => r.data),

  /** Get weight progression recommendation for a specific exercise. */
  progression: (exerciseId: string) =>
    api.get<ProgressionInfo>(`/program/progression/${exerciseId}`).then(r => r.data),

  /** Pause an active program. */
  pause: (id: string) =>
    api.put<ActiveProgram>(`/program/${id}/pause`).then(r => r.data),

  /** Delete / abandon a program. */
  delete: (id: string) =>
    api.delete(`/program/${id}`),
}
