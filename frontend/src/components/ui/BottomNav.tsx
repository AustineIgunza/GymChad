import { useLocation, NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, Dumbbell, MoreHorizontal } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { workoutsApi } from '../../services/workouts'
import { nutritionApi } from '../../services/nutrition'
import { MoreSheet } from './MoreSheet'
import { useState } from 'react'

export function BottomNav() {
  const queryClient = useQueryClient()
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  const today = new Date().toISOString().split('T')[0]

  const prefetch = (key: string, fn: () => Promise<any>) => {
    queryClient.prefetchQuery({ queryKey: [key], queryFn: fn })
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-end justify-around px-2 pt-2 pb-safe">

          {/* Home */}
          <NavLink to="/" end
            onMouseEnter={() => prefetch('workouts-today', () => workoutsApi.today())}
            className={({ isActive }) => `flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${isActive ? 'text-primary-400' : 'text-text-muted'}`}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </NavLink>

          {/* Nutrition */}
          <NavLink to="/nutrition"
            onMouseEnter={() => prefetch('nutrition-' + today, () => nutritionApi.getDay(today))}
            className={({ isActive }) => `flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${isActive ? 'text-primary-400' : 'text-text-muted'}`}>
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-[10px] font-medium">Nutrition</span>
          </NavLink>

          {/* Workout FAB - center, elevated */}
          <NavLink to="/workout"
            className="flex flex-col items-center -mt-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-700/30 transition-all ${location.pathname === '/workout' ? 'bg-primary-600' : 'bg-primary-700'}`}>
              <Dumbbell className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-medium text-text-muted mt-1">Workout</span>
          </NavLink>

          {/* More */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${showMore ? 'text-primary-400' : 'text-text-muted'}`}>
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>

        </div>
      </nav>

      <MoreSheet open={showMore} onClose={() => setShowMore(false)} />
    </>
  )
}
