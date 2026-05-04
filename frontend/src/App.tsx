import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './stores/authStore'
import { BottomNav } from './components/ui/BottomNav'
import { SideNav } from './components/ui/SideNav'
import { AnimatedBackground } from './components/ui/AnimatedBackground'
import { useSwipeBack } from './hooks/useSwipeBack'

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
const CardioPage = lazy(() => import('./pages/Cardio').then(m => ({ default: m.CardioPage })))
const ProgramPage = lazy(() => import('./pages/Program'))
const BuddyWorkoutPage = lazy(() => import('./pages/BuddyWorkout'))
const ChallengesPage = lazy(() => import('./pages/Challenges'))

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; routeName: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error(`[GymChad] Route error in ${this.props.routeName}:`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-text-primary font-semibold mb-1">Something went wrong</p>
          <p className="text-text-muted text-sm mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-primary-700 text-white rounded-xl text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  useSwipeBack()

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
            <AppShell>
              <RouteErrorBoundary routeName="Dashboard">
                <PageSuspense><PageTransition><Dashboard /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/workout" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Workout">
                <PageSuspense><PageTransition><WorkoutPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/nutrition" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Nutrition">
                <PageSuspense><PageTransition><NutritionPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Analytics">
                <PageSuspense><PageTransition><AnalyticsPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/splits" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Splits">
                <PageSuspense><PageTransition><SplitsPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="History">
                <PageSuspense><PageTransition><HistoryPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Settings">
                <PageSuspense><PageTransition><SettingsPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Schedule">
                <PageSuspense><PageTransition><SchedulePage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/tools" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Tools">
                <PageSuspense><PageTransition><ToolsPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/cardio" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Cardio">
                <PageSuspense><PageTransition><CardioPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />

        <Route path="/program" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Program">
                <PageSuspense><PageTransition><ProgramPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/buddy" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="BuddyWorkout">
                <PageSuspense><PageTransition><BuddyWorkoutPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <AppShell>
              <RouteErrorBoundary routeName="Challenges">
                <PageSuspense><PageTransition><ChallengesPage /></PageTransition></PageSuspense>
              </RouteErrorBoundary>
            </AppShell>
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
<AppRoutes />
      </div>
    </div>
  )
}
