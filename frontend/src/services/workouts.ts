import api from './api'
import type { Workout, WorkoutSet } from '../types'

export const workoutsApi = {
  list: (params?: { page?: number; limit?: number; date_from?: string; date_to?: string }) =>
    api.get<Workout[]>('/workouts', { params }).then(r => r.data),

  today: () => api.get<Workout[]>('/workouts/today').then(r => r.data),

  get: (id: string) => api.get<Workout>(`/workouts/${id}`).then(r => r.data),

  create: (data: { label: string; split_day_id?: string; notes?: string; date?: string }) =>
    api.post<Workout>('/workouts', data).then(r => r.data),

  update: (id: string, data: { label?: string; notes?: string; duration_min?: number }) =>
    api.put<Workout>(`/workouts/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/workouts/${id}`),

  addSet: (workoutId: string, data: {
    exercise_id: string
    set_number: number
    reps: number
    weight_kg: number
    rpe?: number
    is_warmup?: boolean
    notes?: string
  }) => api.post<WorkoutSet>(`/workouts/${workoutId}/sets`, data).then(r => r.data),

  updateSet: (workoutId: string, setId: string, data: Partial<WorkoutSet>) =>
    api.put<WorkoutSet>(`/workouts/${workoutId}/sets/${setId}`, data).then(r => r.data),

  deleteSet: (workoutId: string, setId: string) =>
    api.delete(`/workouts/${workoutId}/sets/${setId}`),

  exerciseHistory: (exerciseId: string, sessions = 10) =>
    api.get<any[]>(`/workouts/history/${exerciseId}`, { params: { sessions } }).then(r => r.data),

  recommendations: () => api.get<any[]>('/workouts/recommendations').then(r => r.data),
}
