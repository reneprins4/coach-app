import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, CalendarDays, TrendingUp, User, Timer } from 'lucide-react'
import { useState, useEffect } from 'react'

const tabs = [
  { to: '/',         icon: LayoutDashboard, label: 'Home'     },
  { to: '/calendar', icon: CalendarDays,    label: 'Kalender' },
  { to: '/log',      icon: Dumbbell,        label: 'Trainen'  },
  { to: '/progress', icon: TrendingUp,      label: 'Voortgang'},
  { to: '/profile',  icon: User,            label: 'Profiel'  },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false)

  useEffect(() => {
    function check() {
      try {
        const raw = localStorage.getItem('coach-active-workout')
        setHasActiveWorkout(!!raw)
      } catch { setHasActiveWorkout(false) }
    }
    check()
    // Check elke seconde of er een actieve workout is
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [])

  const isOnLogPage = location.pathname === '/log'
  const hideNav =
    location.pathname.startsWith('/history/') ||
    location.pathname === '/coach' ||
    location.pathname === '/history'

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950">
      {/* Active workout banner */}
      {hasActiveWorkout && !isOnLogPage && (
        <button
          onClick={() => navigate('/log')}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-red-500 px-4 py-3 active:bg-red-600"
        >
          <div className="flex items-center gap-3">
            <Timer size={16} className="text-white" />
            <span className="text-sm font-semibold text-white">Training actief</span>
          </div>
          <span className="text-sm font-medium text-red-100">Ga terug</span>
        </button>
      )}
      <main className={`flex-1 pb-20 ${hasActiveWorkout && !isOnLogPage ? 'pt-12' : ''}`}>
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
