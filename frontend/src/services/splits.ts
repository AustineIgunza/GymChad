import api from './api'
import type { Split } from '../types'

export const splitsApi = {
  list: () => api.get<Split[]>('/splits').then(r => r.data),

  get: (id: string) => api.get<Split>(`/splits/${id}`).then(r => r.data),

  create: (data: {
    name: string
    description?: string
    days: Array<{
      day_number: number
      label: string
      exercises: Array<{
        exercise_id: string
        order: number
        target_sets?: number
        target_reps_min?: number
        target_reps_max?: number
      }>
    }>
  }) => api.post<Split>('/splits', data).then(r => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.put<Split>(`/splits/${id}`, data).then(r => r.data),

  activate: (id: string) => api.put<Split>(`/splits/${id}/activate`).then(r => r.data),

  delete: (id: string) => api.delete(`/splits/${id}`),
}
