import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, UtensilsCrossed, BarChart2, Settings, ClipboardList, History, Calendar, Wrench } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/',          icon: Home,             label: 'Home'      },
  { to: '/workout',   icon: Dumbbell,         label: 'Workout'   },
  { to: '/nutrition', icon: UtensilsCrossed,  label: 'Nutrition' },
  { to: '/splits',    icon: ClipboardList,    label: 'Splits'    },
  { to: '/analytics', icon: BarChart2,        label: 'Analytics' },
  { to: '/history',   icon: History,          label: 'History'   },
  { to: '/schedule',  icon: Calendar,         label: 'Schedule'  },
  { to: '/tools',     icon: Wrench,           label: 'Tools'     },
  { to: '/settings',  icon: Settings,         label: 'Settings'  },
]

export function SideNav() {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full z-30 bg-bg-secondary/90 border-r border-border backdrop-blur-xl md:w-16 lg:w-56">

      {/* Logo */}
      <div className="flex items-center h-16 px-3 lg:px-4 border-b border-border flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="ml-3 font-bold text-lg text-gradient hidden lg:block whitespace-nowrap">GymChad</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className="block">
            {({ isActive }) => (
              <div className={clsx(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group',
                isActive
                  ? 'bg-primary-700/20 text-primary-400'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
              )}>
                <Icon className={clsx(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary-400' : 'text-text-muted group-hover:text-text-secondary'
                )} />
                <span className={clsx(
                  'text-sm font-medium hidden lg:block whitespace-nowrap',
                  isActive ? 'text-primary-400' : ''
                )}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer branding on icon-only (md) */}
      <div className="flex-shrink-0 h-12 flex items-center justify-center lg:hidden border-t border-border">
        <span className="text-[9px] text-text-disabled font-medium tracking-widest uppercase">GC</span>
      </div>
    </aside>
  )
}
