import api from './api'
import type { WorkoutSchedule } from '../types'

export const scheduleApi = {
  list: (params?: { date_from?: string; date_to?: string }) =>
    api.get<WorkoutSchedule[]>('/schedule', { params }).then(r => r.data),
  create: (data: { split_id?: string; split_day_id?: string; scheduled_date: string; notes?: string }) =>
    api.post<WorkoutSchedule>('/schedule', data).then(r => r.data),
  update: (id: string, data: { completed?: boolean; notes?: string }) =>
    api.patch<WorkoutSchedule>(`/schedule/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/schedule/${id}`),
}
