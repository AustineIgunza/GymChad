import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './stores/authStore'
import { BottomNav } from './components/ui/BottomNav'
import { SideNav } from './components/ui/SideNav'
import { ToastContainer } from './components/ui/Toast'

// Pages
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Onboarding } from './pages/auth/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { WorkoutPage } from './pages/Workout'
import { NutritionPage } from './pages/Nutrition'
import { AnalyticsPage } from './pages/Analytics'
import { SettingsPage } from './pages/Settings'
import { SplitsPage } from './pages/Splits'
import { HistoryPage } from './pages/History'

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

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell><PageTransition><Dashboard /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/workout" element={
          <ProtectedRoute>
            <AppShell><PageTransition><WorkoutPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/nutrition" element={
          <ProtectedRoute>
            <AppShell><PageTransition><NutritionPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppShell><PageTransition><AnalyticsPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/splits" element={
          <ProtectedRoute>
            <AppShell><PageTransition><SplitsPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppShell><PageTransition><HistoryPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppShell><PageTransition><SettingsPage /></PageTransition></AppShell>
          </ProtectedRoute>
        } />

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
    <div className="bg-animated min-h-screen">
      <ToastContainer />
      <AppRoutes />
    </div>
  )
}
