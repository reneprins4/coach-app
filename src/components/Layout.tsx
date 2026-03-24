import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Dumbbell, TrendingUp, User, Timer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false)
  const [workoutAgeMinutes, setWorkoutAgeMinutes] = useState(0)

  const tabs = [
    { to: '/',          icon: Home,       label: t('nav.today')   },
    { to: '/log',       icon: Dumbbell,   label: t('nav.train')   },
    { to: '/progress',  icon: TrendingUp, label: t('nav.progress') },
    { to: '/profile',   icon: User,       label: t('nav.profile')   },
  ]

  useEffect(() => {
    function check() {
      try {
        const raw = localStorage.getItem('coach-active-workout')
        setHasActiveWorkout(!!raw)
        if (raw) {
          const parsed = JSON.parse(raw) as { lastActivityAt?: string; startedAt?: string }
          const refTime = parsed.lastActivityAt || parsed.startedAt
          if (refTime) {
            setWorkoutAgeMinutes(Math.floor((Date.now() - new Date(refTime).getTime()) / 60000))
          }
        }
      } catch { setHasActiveWorkout(false) }
    }
    check()
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [])

  const isOnLogPage = location.pathname === '/log'
  const hideNav =
    location.pathname.startsWith('/history/') ||
    (isOnLogPage && hasActiveWorkout)

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-gray-900 focus:text-white"
      >
        Skip to content
      </a>

      {/* Active workout banner */}
      {hasActiveWorkout && !isOnLogPage && (
        <header role="banner">
          <button
            onClick={() => navigate('/log')}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 shadow-[0_2px_12px_rgba(6,182,212,0.3)] active:from-cyan-600 active:to-cyan-700"
            aria-label={t('nav.train') + ' - Training actief'}
          >
            <div className="flex items-center gap-3">
              <Timer size={16} className="text-white" aria-hidden="true" />
              <span className={`text-sm font-bold ${workoutAgeMinutes >= 120 ? 'text-amber-200' : 'text-white'}`}>
                {workoutAgeMinutes >= 120
                  ? `${t('nav.train')} · ${t('resume_banner.ago', { time: workoutAgeMinutes >= 1440 ? `${Math.floor(workoutAgeMinutes / 1440)}d` : `${Math.floor(workoutAgeMinutes / 60)}u` })}`
                  : workoutAgeMinutes > 0 ? `${t('nav.train')} · ${workoutAgeMinutes} min` : t('nav.train')
                }
              </span>
            </div>
            <span className="text-sm font-medium text-cyan-100">Ga terug</span>
          </button>
        </header>
      )}
      <main id="main-content" className={`flex-1 ${isOnLogPage ? 'pb-0' : 'pb-24'} ${hasActiveWorkout && !isOnLogPage ? 'pt-12' : ''}`}>
        <Outlet />
      </main>

      {!hideNav && (
        <nav aria-label="Main navigation" className="nav-premium fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-auto flex max-w-lg w-full">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                aria-label={label}
                className={({ isActive }) =>
                  `relative flex flex-1 flex-col items-center gap-1 pt-3 pb-2 text-[10px] font-medium uppercase tracking-wide transition-colors min-h-[44px] min-w-[44px] ${
                    isActive ? 'text-cyan-400' : 'text-[var(--text-3)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} aria-hidden="true" />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-cyan-500" aria-hidden="true" />
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
