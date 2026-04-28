import api from './api'
import type { DailySummary, NutritionLog, CustomFood, FoodSearchResult } from '../types'

export const nutritionApi = {
  getDay: (date: string) =>
    api.get<DailySummary>('/nutrition', { params: { date } }).then(r => r.data),

  summary: (days = 30) =>
    api.get<any[]>('/nutrition/summary', { params: { days } }).then(r => r.data),

  create: (data: Omit<NutritionLog, 'id' | 'user_id' | 'created_at'>) =>
    api.post<NutritionLog>('/nutrition', data).then(r => r.data),

  update: (id: string, data: Partial<NutritionLog>) =>
    api.put<NutritionLog>(`/nutrition/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/nutrition/${id}`),

  getCustomFoods: () => api.get<CustomFood[]>('/nutrition/custom').then(r => r.data),

  createCustomFood: (data: Omit<CustomFood, 'id' | 'user_id' | 'created_at'>) =>
    api.post<CustomFood>('/nutrition/custom', data).then(r => r.data),

  deleteCustomFood: (id: string) => api.delete(`/nutrition/custom/${id}`),

  searchFoods: (q: string) =>
    api.get<FoodSearchResult[]>('/foods/search', { params: { q } }).then(r => r.data),
}
