import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './stores/authStore'
import { BottomNav } from './components/ui/BottomNav'
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
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
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
  // New user hasn't done onboarding yet
  const needsOnboarding = !user.weight_kg && !user.calorie_target
  if (needsOnboarding && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
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
            <div className="pb-20">
              <PageTransition><Dashboard /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/workout" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><WorkoutPage /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/nutrition" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><NutritionPage /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><AnalyticsPage /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/splits" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><SplitsPage /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><HistoryPage /></PageTransition>
              <BottomNav />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <div className="pb-20">
              <PageTransition><SettingsPage /></PageTransition>
              <BottomNav />
            </div>
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
