import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Dumbbell, TrendingUp, User, Timer } from 'lucide-react'
import { useState, useEffect } from 'react'

const tabs = [
  { to: '/',          icon: Home,       label: 'Vandaag'   },
  { to: '/log',       icon: Dumbbell,   label: 'Trainen'   },
  { to: '/progress',  icon: TrendingUp, label: 'Voortgang' },
  { to: '/profile',   icon: User,       label: 'Profiel'   },
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
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [])

  const isOnLogPage = location.pathname === '/log'
  const hideNav =
    location.pathname.startsWith('/history/')

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950">
      {/* Active workout banner */}
      {hasActiveWorkout && !isOnLogPage && (
        <button
          onClick={() => navigate('/log')}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-cyan-500 px-4 py-3 active:bg-cyan-600"
        >
          <div className="flex items-center gap-3">
            <Timer size={16} className="text-white" />
            <span className="text-sm font-semibold text-white">Training actief</span>
          </div>
          <span className="text-sm font-medium text-cyan-100">Ga terug</span>
        </button>
      )}
      <main className={`flex-1 pb-20 ${hasActiveWorkout && !isOnLogPage ? 'pt-12' : ''}`}>
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="nav-premium fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <div className="mx-auto flex max-w-lg w-full">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-1 flex-col items-center gap-1 py-4 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-[var(--text-3)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-cyan-500" />
                    )}
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
