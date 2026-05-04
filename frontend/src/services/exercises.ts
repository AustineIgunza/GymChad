import api from './api'
import type { Exercise, MuscleGroup } from '../types'

export const exercisesApi = {
  list: (signal?: AbortSignal, params?: { muscle_group?: MuscleGroup; search?: string }) =>
    api.get<Exercise[]>('/exercises', { params, signal }).then(r => r.data),

  create: (data: { name: string; muscle_group: MuscleGroup; description?: string; equipment?: string }) =>
    api.post<Exercise>('/exercises', data).then(r => r.data),

  delete: (id: string) => api.delete(`/exercises/${id}`),
}
