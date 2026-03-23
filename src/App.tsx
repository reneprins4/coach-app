import { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SplashScreen } from '@capacitor/splash-screen'
import { useAuth } from './hooks/useAuth'
import { getSettings, saveSettings, mergeSettingsOnLogin } from './lib/settings'
import { invalidateWorkoutCache } from './lib/workoutCache'
import { isBeginnerMode as checkBeginnerMode } from './lib/beginnerMode'
import { supabase } from './lib/supabase'
import { logError } from './lib/logger'
import type { AuthContextValue, UserSettings } from './types'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './components/Onboarding'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Logger = lazy(() => import('./pages/Logger'))
const History = lazy(() => import('./pages/History'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Progress = lazy(() => import('./pages/Progress'))
const AICoach = lazy(() => import('./pages/AICoach'))
const Profile = lazy(() => import('./pages/Profile'))
const Plan = lazy(() => import('./pages/Plan'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))

// Auth context
const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
    </div>
  )
}

function AuthLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const [needsOnboarding, setNeedsOnboarding] = useState(!getSettings().onboardingCompleted)
  const [settings, setSettings] = useState<UserSettings>(getSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Laad settings van Supabase zodra gebruiker ingelogd is
  useEffect(() => {
    if (auth.user?.id) {
      const userId = auth.user.id

      /** Check workouts as fallback proof of prior onboarding */
      async function checkWorkoutsForOnboarding() {
        try {
          const { count } = await supabase.from('workouts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
          if (count && count > 0) {
            saveSettings({ onboardingCompleted: true }, userId ?? null)
            setNeedsOnboarding(false)
            return
          }
        } catch { /* ignore — keep current onboarding state */ }
        setNeedsOnboarding(true)
      }

      mergeSettingsOnLogin(userId).then(async merged => {
        if (merged) {
          setSettings(merged)
          if (merged.onboardingCompleted) {
            setNeedsOnboarding(false)
          } else {
            // onboardingCompleted missing or false — always check for existing workouts
            await checkWorkoutsForOnboarding()
          }
        } else {
          // merge returned nothing — check workouts as proof of prior usage
          await checkWorkoutsForOnboarding()
        }
        setSettingsLoaded(true)
      }).catch(async (err) => {
        logError('App.mergeSettingsOnLogin', err)
        // Fallback: check if user has workouts as proof of prior onboarding
        await checkWorkoutsForOnboarding()
        setSettingsLoaded(true)
      })
    } else if (!auth.loading) {
      setSettingsLoaded(true)
    }
  }, [auth.user?.id, auth.loading])

  // Settings opslaan helper (update context + cloud)
  function updateSettings(newSettings: Partial<UserSettings>): UserSettings {
    const merged = saveSettings(newSettings, auth.user?.id ?? null)
    setSettings(merged)
    invalidateWorkoutCache() // Settings changed → workout needs regeneration
    return merged
  }

  // Luister naar localStorage changes (onboarding complete)
  useEffect(() => {
    function onStorage() {
      const s = getSettings()
      setNeedsOnboarding(!s.onboardingCompleted)
      setSettings(s)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Clear session cache on sign-out to prevent stale data leaking between users
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        Object.keys(sessionStorage)
          .filter(k => k.startsWith('__kravex_start_flow_cache_'))
          .forEach(k => sessionStorage.removeItem(k))
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Hide native splash screen once auth + settings are resolved
  useEffect(() => {
    if (!auth.loading && (settingsLoaded || !auth.user)) {
      SplashScreen.hide()
    }
  }, [auth.loading, auth.user, settingsLoaded])

  // Show loader while checking auth OR while loading cloud settings for logged-in user
  if (auth.loading || (auth.user && !settingsLoaded)) {
    return <AuthLoader />
  }

  // Show login if not authenticated
  if (!auth.user) {
    return <Login onSendOtp={auth.sendOtp} onVerifyOtp={auth.verifyOtp} />
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ ...auth, settings, updateSettings, settingsLoaded, isBeginnerMode: checkBeginnerMode(settings.experienceLevel) }}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<Layout />}>
                <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/log" element={<Logger />} />
                <Route path="/history" element={<History />} />
                <Route path="/history/:id" element={<WorkoutDetail />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/coach" element={<AICoach />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthContext.Provider>
    </ErrorBoundary>
  )
}
