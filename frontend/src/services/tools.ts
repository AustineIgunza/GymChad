import api from './api'
import type { WarmupSet, PlateResult, OneRmResult } from '../types'

export const toolsApi = {
  warmup: (working_weight: number, unit: 'kg' | 'lb' = 'kg') =>
    api.post<{ warmup_sets: WarmupSet[] }>('/tools/warmup-calculator', { working_weight, unit })
       .then(r => r.data),
  plates: (target_weight: number, bar_weight: number, unit: 'kg' | 'lb' = 'kg') =>
    api.post<PlateResult>('/tools/plate-calculator', { target_weight, bar_weight, unit })
       .then(r => r.data),
  oneRm: (weight: number, reps: number) =>
    api.post<OneRmResult>('/tools/1rm-calculator', { weight, reps })
       .then(r => r.data),
}
