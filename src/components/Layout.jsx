import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, Clock, TrendingUp, User } from 'lucide-react'

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/log', icon: Dumbbell, label: 'Log' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/history/') || location.pathname === '/coach'

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-lg">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
                    isActive ? 'text-orange-500' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
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
