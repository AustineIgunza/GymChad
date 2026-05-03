import api from './api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StreakData {
  current_streak: number
  longest_streak: number
  last_workout_date: string | null
  is_at_risk: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp_reward: number
  earned: boolean
  earned_at: string | null
}

export interface XPData {
  total_xp: number
  level: number
  xp_to_next_level: number
  xp_in_current_level: number
}

export type ChallengeType = 'most_weight' | 'most_reps' | 'most_workouts' | 'most_volume'

export interface Challenge {
  id: string
  name: string
  description: string
  type: ChallengeType
  target_value: number
  start_date: string
  end_date: string
  participant_count?: number
  joined?: boolean
  current_value?: number
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  value: number
  rank: number
}

export interface CreateChallengePayload {
  name: string
  description: string
  type: ChallengeType
  target_value: number
  start_date: string
  end_date: string
}

// ── API ──────────────────────────────────────────────────────────────────────

export const gamificationApi = {
  /** Current user's streak info */
  getStreak: () =>
    api.get<StreakData>('/gamification/streak').then(r => r.data),

  /** All achievements (earned + locked) */
  getAchievements: () =>
    api.get<Achievement[]>('/gamification/achievements').then(r => r.data),

  /** XP and level data */
  getXP: () =>
    api.get<XPData>('/gamification/xp').then(r => r.data),

  /** All available challenges */
  getChallenges: () =>
    api.get<Challenge[]>('/gamification/challenges').then(r => r.data),

  /** Challenges the current user has joined */
  getMyChallenges: () =>
    api.get<Challenge[]>('/gamification/challenges/my').then(r => r.data),

  /** Create a new challenge */
  createChallenge: (payload: CreateChallengePayload) =>
    api.post<Challenge>('/gamification/challenges', payload).then(r => r.data),

  /** Join an existing challenge by id */
  joinChallenge: (id: string) =>
    api.post<void>(`/gamification/challenges/${id}/join`).then(r => r.data),

  /** Leaderboard for a specific challenge */
  getLeaderboard: (id: string) =>
    api.get<LeaderboardEntry[]>(`/gamification/challenges/${id}/leaderboard`).then(r => r.data),
}
