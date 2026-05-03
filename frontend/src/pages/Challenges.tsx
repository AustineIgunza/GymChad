import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Flame, Trophy, Star, Zap, Crown, Users, Plus, Lock, Medal,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AchievementToast } from '../components/gamification/AchievementToast'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../stores/uiStore'
import {
  gamificationApi,
  type StreakData,
  type Achievement,
  type XPData,
  type Challenge,
  type LeaderboardEntry,
  type ChallengeType,
  type CreateChallengePayload,
} from '../services/gamification'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Challenges', 'Leaderboard'] as const
type Tab = typeof TABS[number]

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  most_weight: 'Most Weight Lifted',
  most_reps: 'Most Reps',
  most_workouts: 'Most Workouts',
  most_volume: 'Most Volume',
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return <div className="skeleton h-28 rounded-2xl" />
}

// Streak Card
function StreakCard({ streak }: { streak: StreakData }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">Current Streak</p>
            <p className="text-2xl font-bold text-text-primary leading-none">
              {streak.current_streak}{' '}
              <span className="text-base font-semibold text-text-muted">days</span>
            </p>
          </div>
        </div>
        {streak.is_at_risk && (
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: [0.92, 1.04, 0.96, 1] }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30"
          >
            <span className="text-xs">🔥</span>
            <span className="text-xs font-semibold text-yellow-400">Streak at risk!</span>
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-text-muted">
        <Trophy className="w-3.5 h-3.5 text-yellow-400/60" />
        <span>Longest: <span className="text-text-primary font-semibold">{streak.longest_streak} days</span></span>
      </div>
      {streak.last_workout_date && (
        <p className="text-xs text-text-disabled mt-1">
          Last workout: {new Date(streak.last_workout_date).toLocaleDateString()}
        </p>
      )}
    </Card>
  )
}

// XP / Level Card
function XPCard({ xp }: { xp: XPData }) {
  const pct = xp.xp_to_next_level > 0
    ? Math.min((xp.xp_in_current_level / xp.xp_to_next_level) * 100, 100)
    : 100
  const remaining = xp.xp_to_next_level - xp.xp_in_current_level

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary-700/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium">Total XP</p>
            <p className="text-xl font-bold text-text-primary leading-none">{xp.total_xp.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-700/20 border border-primary-700/30">
          <Star className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-sm font-bold text-primary-400">Level {xp.level}</span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-text-muted">
          <span>{xp.xp_in_current_level} XP</span>
          <span>{xp.xp_to_next_level} XP</span>
        </div>
        <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-primary-700 to-primary-400"
          />
        </div>
        <p className="text-xs text-text-muted text-right">
          {remaining > 0 ? (
            <><span className="text-primary-400 font-semibold">{remaining} XP</span> to Level {xp.level + 1}</>
          ) : (
            <span className="text-green-400 font-semibold">Level up ready!</span>
          )}
        </p>
      </div>
    </Card>
  )
}

// Single Achievement tile
function AchievementTile({
  achievement,
  onUnlockPreview,
}: {
  achievement: Achievement
  onUnlockPreview: (a: Achievement) => void
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={achievement.earned ? { scale: 1.03 } : {}}
      onClick={() => achievement.earned && onUnlockPreview(achievement)}
      className={clsx(
        'relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-200',
        achievement.earned
          ? 'bg-bg-card border-yellow-400/20 cursor-pointer'
          : 'bg-bg-secondary border-border opacity-60',
      )}
    >
      {/* Glow for earned */}
      {achievement.earned && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl bg-yellow-400/5 pointer-events-none"
        />
      )}

      {/* Icon */}
      <div className={clsx(
        'relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-2',
        achievement.earned ? 'bg-yellow-400/10' : 'bg-bg-tertiary grayscale',
      )}>
        <span>{achievement.icon || '🏅'}</span>
        {!achievement.earned && (
          <div className="absolute inset-0 rounded-xl bg-bg-secondary/60 flex items-center justify-center">
            <Lock className="w-4 h-4 text-text-disabled" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className={clsx(
        'text-xs font-semibold text-center leading-tight mb-1.5',
        achievement.earned ? 'text-text-primary' : 'text-text-muted',
      )}>
        {achievement.name}
      </p>

      {/* XP badge */}
      <span className={clsx(
        'text-[10px] font-bold px-2 py-0.5 rounded-full',
        achievement.earned
          ? 'bg-yellow-400/15 text-yellow-400'
          : 'bg-bg-tertiary text-text-disabled',
      )}>
        +{achievement.xp_reward} XP
      </span>
    </motion.div>
  )
}

// Challenge card (for lists)
function ChallengeCard({
  challenge,
  showJoin,
  showLeaderboard,
  onJoin,
  onViewLeaderboard,
  joining,
}: {
  challenge: Challenge
  showJoin?: boolean
  showLeaderboard?: boolean
  onJoin?: (id: string) => void
  onViewLeaderboard?: (id: string) => void
  joining?: boolean
}) {
  const pct = challenge.target_value > 0 && challenge.current_value != null
    ? Math.min((challenge.current_value / challenge.target_value) * 100, 100)
    : 0

  return (
    <motion.div variants={fadeUp}>
      <Card padding="md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary text-sm">{challenge.name}</p>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{challenge.description}</p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-700/15 text-primary-400 border border-primary-700/20">
            {CHALLENGE_TYPE_LABELS[challenge.type]}
          </span>
        </div>

        {/* Progress bar (only if joined with current_value) */}
        {challenge.current_value != null && (
          <div className="mb-3 space-y-1">
            <div className="flex justify-between text-xs text-text-muted">
              <span>{challenge.current_value} / {challenge.target_value}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-primary-700 to-primary-400"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-text-disabled">
            {new Date(challenge.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="flex gap-2">
            {showLeaderboard && onViewLeaderboard && (
              <Button variant="outline" size="sm" onClick={() => onViewLeaderboard(challenge.id)}>
                <Medal className="w-3.5 h-3.5" />
                Leaderboard
              </Button>
            )}
            {showJoin && onJoin && (
              <Button size="sm" loading={joining} onClick={() => onJoin(challenge.id)}>
                <Users className="w-3.5 h-3.5" />
                Join
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Create Challenge Modal
function CreateChallengeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CreateChallengePayload>({
    name: '',
    description: '',
    type: 'most_workouts',
    target_value: 10,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  })

  const set = (key: keyof CreateChallengePayload, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.end_date) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const challenge = await gamificationApi.createChallenge(form)
      // Auto-join after creation
      await gamificationApi.joinChallenge(challenge.id)
      toast.success('Challenge created and joined!')
      onCreated()
      onClose()
    } catch {
      toast.error('Failed to create challenge')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Sheet slides up */}
          <motion.div
            key="modal-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
            <h2 className="text-lg font-bold text-text-primary mb-5">Create Challenge</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Challenge Name *"
                placeholder="e.g. Summer Shred"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <textarea
                  placeholder="Describe your challenge..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted text-base focus:outline-none focus:ring-2 focus:ring-primary-700/50 focus:border-primary-700/50 transition-all duration-200 px-4 py-2.5 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Type *</label>
                <select
                  value={form.type}
                  onChange={e => set('type', e.target.value as ChallengeType)}
                  className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-primary-700/50 transition-all duration-200 px-4 py-2.5 min-h-[44px]"
                >
                  {(Object.entries(CHALLENGE_TYPE_LABELS) as [ChallengeType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Target Value *"
                type="number"
                min={1}
                value={form.target_value}
                onChange={e => set('target_value', Number(e.target.value))}
                hint="e.g. number of workouts, total kg lifted, etc."
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date *"
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
                <Input
                  label="End Date *"
                  type="date"
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button fullWidth loading={loading} type="submit">
                  Create & Join
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Rank badge
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center">
      <Crown className="w-4 h-4 text-yellow-400" />
    </div>
  )
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full bg-gray-400/20 border border-gray-400/40 flex items-center justify-center">
      <Medal className="w-4 h-4 text-gray-400" />
    </div>
  )
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full bg-amber-700/20 border border-amber-600/40 flex items-center justify-center">
      <Medal className="w-4 h-4 text-amber-600" />
    </div>
  )
  return (
    <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border flex items-center justify-center">
      <span className="text-xs font-bold text-text-muted">#{rank}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ChallengesPage() {
  const { user } = useAuthStore()
  const toast = useToast()

  // Data
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [xp, setXP] = useState<XPData | null>(null)
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([])
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('')

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  // Load all overview data
  const fetchOverview = useCallback(async () => {
    setLoading(true)
    const [s, a, x] = await Promise.all([
      gamificationApi.getStreak().catch(() => null),
      gamificationApi.getAchievements().catch(() => []),
      gamificationApi.getXP().catch(() => null),
    ])
    setStreak(s)
    setAchievements(a)
    setXP(x)
    setLoading(false)
  }, [])

  // Load challenges data
  const fetchChallenges = useCallback(async () => {
    const [all, mine] = await Promise.all([
      gamificationApi.getChallenges().catch(() => []),
      gamificationApi.getMyChallenges().catch(() => []),
    ])
    setAllChallenges(all)
    setMyChallenges(mine)
    if (mine.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(mine[0].id)
    }
  }, [selectedChallengeId])

  useEffect(() => {
    fetchOverview()
    fetchChallenges()
  }, [fetchOverview, fetchChallenges])

  // Load leaderboard when challenge is selected
  useEffect(() => {
    if (!selectedChallengeId) return
    setLoadingLeaderboard(true)
    gamificationApi.getLeaderboard(selectedChallengeId)
      .then(data => setLeaderboard(data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoadingLeaderboard(false))
  }, [selectedChallengeId])

  const handleJoin = async (id: string) => {
    setJoiningId(id)
    try {
      await gamificationApi.joinChallenge(id)
      toast.success('Joined challenge!')
      await fetchChallenges()
    } catch {
      toast.error('Failed to join challenge')
    } finally {
      setJoiningId(null)
    }
  }

  const handleViewLeaderboard = (id: string) => {
    setSelectedChallengeId(id)
    setActiveTab('Leaderboard')
  }

  // Discover = all challenges that the user has NOT joined
  const myIds = new Set(myChallenges.map(c => c.id))
  const discoverChallenges = allChallenges.filter(c => !myIds.has(c.id))

  return (
    <div className="page min-h-screen pb-24 md:pb-8">
      {/* Achievement toast overlay */}
      <AchievementToast
        achievement={toastAchievement}
        onClose={() => setToastAchievement(null)}
      />

      {/* Header */}
      <div className="px-4 pt-14 pb-2 md:pt-8">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-text-primary"
        >
          Challenges & Streaks
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.08 } }}
          className="text-text-muted text-sm mt-0.5"
        >
          Level up your fitness journey
        </motion.p>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-lg border-b border-border px-4">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'relative py-3 px-4 text-sm font-semibold transition-colors duration-200',
                activeTab === tab ? 'text-primary-400' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="px-4 mt-4"
        >

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <div className="skeleton h-64 rounded-2xl" />
                </>
              ) : (
                <>
                  {/* Streak */}
                  <motion.div variants={fadeUp}>
                    {streak ? <StreakCard streak={streak} /> : (
                      <Card>
                        <p className="text-text-muted text-sm text-center py-4">No streak data yet — start working out!</p>
                      </Card>
                    )}
                  </motion.div>

                  {/* XP / Level */}
                  <motion.div variants={fadeUp}>
                    {xp ? <XPCard xp={xp} /> : (
                      <Card>
                        <p className="text-text-muted text-sm text-center py-4">No XP data available</p>
                      </Card>
                    )}
                  </motion.div>

                  {/* Achievements */}
                  <motion.div variants={fadeUp}>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <h2 className="font-semibold text-text-primary">Achievements</h2>
                      <span className="ml-auto text-xs text-text-muted">
                        {achievements.filter(a => a.earned).length} / {achievements.length} earned
                      </span>
                    </div>

                    {achievements.length === 0 ? (
                      <Card>
                        <p className="text-text-muted text-sm text-center py-6">No achievements yet — keep training!</p>
                      </Card>
                    ) : (
                      <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 md:grid-cols-3 gap-3"
                      >
                        {achievements.map(achievement => (
                          <AchievementTile
                            key={achievement.id}
                            achievement={achievement}
                            onUnlockPreview={setToastAchievement}
                          />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {/* ── CHALLENGES TAB ───────────────────────────────────────────── */}
          {activeTab === 'Challenges' && (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

              {/* My Challenges */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-primary-400" />
                  <h2 className="font-semibold text-text-primary">My Challenges</h2>
                </div>
                {myChallenges.length === 0 ? (
                  <motion.div variants={fadeUp}>
                    <Card>
                      <p className="text-text-muted text-sm text-center py-6">You haven't joined any challenges yet</p>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {myChallenges.map(challenge => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        showLeaderboard
                        onViewLeaderboard={handleViewLeaderboard}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Discover */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <h2 className="font-semibold text-text-primary">Discover</h2>
                </div>
                {discoverChallenges.length === 0 ? (
                  <motion.div variants={fadeUp}>
                    <Card>
                      <p className="text-text-muted text-sm text-center py-6">
                        {allChallenges.length === 0 ? 'No challenges available yet — create one!' : 'You\'ve joined all available challenges!'}
                      </p>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {discoverChallenges.map(challenge => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        showJoin
                        onJoin={handleJoin}
                        joining={joiningId === challenge.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── LEADERBOARD TAB ──────────────────────────────────────────── */}
          {activeTab === 'Leaderboard' && (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

              {/* Challenge selector */}
              <motion.div variants={fadeUp}>
                {myChallenges.length === 0 ? (
                  <Card>
                    <p className="text-text-muted text-sm text-center py-6">Join a challenge to see its leaderboard</p>
                  </Card>
                ) : (
                  <>
                    <label className="text-sm font-medium text-text-secondary block mb-2">Select Challenge</label>
                    <select
                      value={selectedChallengeId}
                      onChange={e => setSelectedChallengeId(e.target.value)}
                      className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/50 transition-all duration-200 px-4 py-2.5 min-h-[44px] mb-4"
                    >
                      {myChallenges.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Leaderboard list */}
                    {loadingLeaderboard ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                      </div>
                    ) : leaderboard.length === 0 ? (
                      <Card>
                        <p className="text-text-muted text-sm text-center py-6">No participants yet</p>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {leaderboard.map((entry, idx) => {
                          const isCurrentUser = entry.user_id === user?.id
                          return (
                            <motion.div
                              key={entry.user_id}
                              variants={fadeUp}
                              custom={idx}
                              className={clsx(
                                'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                                isCurrentUser
                                  ? 'bg-primary-700/10 border-primary-700/30'
                                  : 'bg-bg-card border-border',
                                entry.rank <= 3 && 'border-yellow-400/20',
                              )}
                            >
                              <RankBadge rank={entry.rank} />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={clsx(
                                    'text-sm font-semibold truncate',
                                    isCurrentUser ? 'text-primary-400' : 'text-text-primary',
                                  )}>
                                    {entry.display_name}
                                  </p>
                                  {isCurrentUser && (
                                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary-700/20 text-primary-400">
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <p className={clsx(
                                  'font-bold text-sm',
                                  entry.rank === 1 ? 'text-yellow-400' :
                                  entry.rank === 2 ? 'text-gray-400' :
                                  entry.rank === 3 ? 'text-amber-600' :
                                  'text-text-primary',
                                )}>
                                  {entry.value.toLocaleString()}
                                </p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create Challenge FAB — visible only on Challenges tab */}
      <AnimatePresence>
        {activeTab === 'Challenges' && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowCreateModal(true)}
            className="fixed bottom-24 right-5 md:bottom-8 z-30 w-14 h-14 rounded-full bg-primary-700 hover:bg-primary-600 text-white shadow-glow-sm flex items-center justify-center transition-colors duration-200"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Create Challenge Modal */}
      <CreateChallengeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchChallenges}
      />
    </div>
  )
}

// Default export for lazy() in App.tsx
export default ChallengesPage
