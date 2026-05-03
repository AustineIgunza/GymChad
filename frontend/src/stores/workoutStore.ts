import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workout } from '../types'

// FIX: BUG 5 / Proactive — max age for a persisted active workout session (24 hours in ms)
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000

interface ActiveSet {
  exercise_id: string
  exercise_name: string
  muscle_group: string
  sets: Array<{
    reps: number
    weight_kg: number
    rpe?: number
    is_warmup: boolean
    completed: boolean
  }>
}

interface WorkoutState {
  activeWorkout: Workout | null
  activeSets: ActiveSet[]
  startTime: number | null
  setActiveWorkout: (w: Workout | null) => void
  addExerciseToActive: (exercise: { id: string; name: string; muscle_group: string }) => void
  clearActive: () => void
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      activeWorkout: null,
      activeSets: [],
      startTime: null,

      setActiveWorkout: (w) =>
        set({ activeWorkout: w, startTime: w ? Date.now() : null }),

      addExerciseToActive: (exercise) =>
        set((state) => ({
          activeSets: state.activeSets.some(s => s.exercise_id === exercise.id)
            ? state.activeSets
            : [
                ...state.activeSets,
                {
                  exercise_id: exercise.id,
                  exercise_name: exercise.name,
                  muscle_group: exercise.muscle_group,
                  sets: [{ reps: 8, weight_kg: 0, is_warmup: false, completed: false }],
                },
              ],
        })),

      clearActive: () => set({ activeWorkout: null, activeSets: [], startTime: null }),
    }),
    {
      name: 'gymchad-active-workout',
      // FIX: BUG 5 / Proactive — on rehydration, discard stale sessions older than 24 hours
      // to prevent a previous day's incomplete workout from being resurrected
      onRehydrateStorage: () => (state) => {
        if (state && state.startTime && Date.now() - state.startTime > MAX_SESSION_AGE_MS) {
          state.activeWorkout = null
          state.activeSets = []
          state.startTime = null
        }
      },
    }
  )
)
