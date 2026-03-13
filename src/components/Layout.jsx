import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, CalendarDays, TrendingUp, User } from 'lucide-react'

const tabs = [
  { to: '/',        icon: LayoutDashboard, label: 'Home'     },
  { to: '/plan',    icon: CalendarDays,    label: 'Plan'     },
  { to: '/log',     icon: Dumbbell,        label: 'Trainen'  },
  { to: '/progress',icon: TrendingUp,      label: 'Voortgang'},
  { to: '/profile', icon: User,            label: 'Profiel'  },
]

export default function Layout() {
  const location = useLocation()
  const hideNav =
    location.pathname.startsWith('/history/') ||
    location.pathname === '/coach' ||
    location.pathname === '/history'

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800/60 bg-gray-950/98 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                    isActive ? 'text-red-500' : 'text-gray-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
