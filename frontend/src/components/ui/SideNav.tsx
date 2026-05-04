import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, UtensilsCrossed, BarChart2, Settings, ClipboardList, History, Calendar, Wrench, Brain, Users, Trophy, Activity } from 'lucide-react'
import { clsx } from 'clsx'

type NavItem = { to: string; icon: React.ElementType; label: string }
type NavSection = { label: string | null; items: NavItem[] }

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { to: '/',        icon: Home,    label: 'Home'    },
      { to: '/workout', icon: Dumbbell, label: 'Workout' },
    ]
  },
  {
    label: 'Track',
    items: [
      { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
      { to: '/cardio',    icon: Activity,         label: 'Cardio'    },
      { to: '/history',   icon: History,          label: 'History'   },
      { to: '/splits',    icon: ClipboardList,    label: 'Splits'    },
      { to: '/analytics', icon: BarChart2,        label: 'Analytics' },
    ]
  },
  {
    label: 'Plan',
    items: [
      { to: '/schedule',   icon: Calendar, label: 'Schedule'   },
      { to: '/program',    icon: Brain,    label: 'Program'    },
      { to: '/challenges', icon: Trophy,   label: 'Challenges' },
    ]
  },
  {
    label: 'Tools',
    items: [
      { to: '/tools', icon: Wrench, label: 'Tools' },
      { to: '/buddy', icon: Users,  label: 'Buddy' },
    ]
  },
  {
    label: null,
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

function NavItemRow({ to, icon: Icon, label }: NavItem) {
  return (
    <NavLink to={to} end={to === '/'} className="block">
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
  )
}

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

      {/* Nav sections */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* Divider between sections */}
            {sectionIdx > 0 && (
              <div className="px-3 py-2">
                {/* On lg (wide sidebar): show text label */}
                {section.label && (
                  <span className="text-[9px] text-text-disabled uppercase tracking-widest font-medium hidden lg:block">
                    {section.label}
                  </span>
                )}
                {/* On md (icon-only sidebar): show thin line */}
                <div className="border-t border-border/50 lg:hidden" />
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItemRow key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer branding on icon-only (md) */}
      <div className="flex-shrink-0 h-12 flex items-center justify-center lg:hidden border-t border-border">
        <span className="text-[9px] text-text-disabled font-medium tracking-widest uppercase">GC</span>
      </div>
    </aside>
  )
}
