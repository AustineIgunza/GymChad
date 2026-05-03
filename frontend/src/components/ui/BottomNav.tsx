import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, UtensilsCrossed, Calendar, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary/80 border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className="flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1 py-1">
                <div className={clsx(
                  'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                  isActive ? 'bg-primary-700/20' : 'hover:bg-bg-hover'
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl bg-primary-700/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={clsx(
                    'w-5 h-5 relative z-10 transition-colors duration-200',
                    isActive ? 'text-primary-400' : 'text-text-muted'
                  )} />
                </div>
                <span className={clsx(
                  'text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-primary-400' : 'text-text-muted'
                )}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
