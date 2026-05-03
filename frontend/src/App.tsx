import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './stores/authStore'
import { BottomNav } from './components/ui/BottomNav'
import { SideNav } from './components/ui/SideNav'
import { ToastContainer } from './components/ui/Toast'
import { AnimatedBackground } from './components/ui/AnimatedBackground'

// Auth pages are small and needed immediately — keep them eager
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Onboarding } from './pages/auth/Onboarding'
import { SharedSplitPage } from './pages/SharedSplit'

// FIX: BUG 4 — Lazy-load all heavy pages so tab switching doesn't block the main thread.
// Previously all pages were eagerly imported, causing large initial bundle and navigation hangs.
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const WorkoutPage = lazy(() => import('./pages/Workout').then(m => ({ default: m.WorkoutPage })))
const NutritionPage = lazy(() => import('./pages/Nutrition').then(m => ({ default: m.NutritionPage })))
const AnalyticsPage = lazy(() => import('./pages/Analytics').then(m => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })))
const SplitsPage = lazy(() => import('./pages/Splits').then(m => ({ default: m.SplitsPage })))
const HistoryPage = lazy(() => import('./pages/History').then(m => ({ default: m.HistoryPage })))
const SchedulePage = lazy(() => import('./pages/Schedule').then(m => ({ default: m.SchedulePage })))
const ToolsPage = lazy(() => import('./pages/Tools').then(m => ({ default: m.ToolsPage })))
const ProgramPage = lazy(() => import('./pages/Program'))
const BuddyWorkoutPage = lazy(() => import('./pages/BuddyWorkout'))
const ChallengesPage = lazy(() => import('./pages/Challenges'))

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' } },
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
      {children}
    </motion.div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!initialized) {
      const t = setTimeout(() => setTimedOut(true), 6000)
      return () => clearTimeout(t)
    }
  }, [initialized])

  if (!initialized && !timedOut) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-12 h-12 rounded-2xl bg-primary-700/30 flex items-center justify-center"
        >
          <div className="w-6 h-6 rounded-lg bg-primary-700" />
        </motion.div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  const needsOnboarding = !user.weight_kg && !user.calorie_target
  if (needsOnboarding && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

/** Shell used by every protected page — sidebar + bottom nav + content offset */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      {/* Content shifts right on md (icon sidebar=64px) and lg (full sidebar=224px) */}
      <main className="flex-1 min-w-0 md:ml-16 lg:ml-56 pb-20 md:pb-0">
        {/* cap content width on large screens so it doesn't stretch uncomfortably */}
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

// FIX: BUG 4 — Suspense fallback for lazy-loaded pages prevents blank screens during code-split chunk loading
function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-xl bg-primary-700/30 animate-pulse" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected routes — each wrapped in PageSuspense for lazy chunk loading */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><Dashboard /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/workout" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><WorkoutPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/nutrition" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><NutritionPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><AnalyticsPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/splits" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><SplitsPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><HistoryPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><SettingsPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><SchedulePage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/tools" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><ToolsPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/program" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><ProgramPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/buddy" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><BuddyWorkoutPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <AppShell><PageSuspense><PageTransition><ChallengesPage /></PageTransition></PageSuspense></AppShell>
          </ProtectedRoute>
        } />

        {/* Public shared split route */}
        <Route path="/splits/shared/:token" element={<SharedSplitPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="bg-animated min-h-screen relative">
      <AnimatedBackground />
      <div className="relative" style={{ zIndex: 1 }}>
        <ToastContainer />
        <AppRoutes />
      </div>
    </div>
  )
}
