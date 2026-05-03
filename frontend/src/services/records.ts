import api from './api'
import type { PersonalRecord } from '../types'

export const recordsApi = {
  getAll: () => api.get<PersonalRecord[]>('/records').then(r => r.data),
  getByExercise: (exerciseId: string) =>
    api.get<PersonalRecord[]>(`/records/${exerciseId}`).then(r => r.data),
}
