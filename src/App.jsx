import { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getSettings, saveSettings, mergeSettingsOnLogin } from './lib/settings'
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
const AuthContext = createContext(null)

export function useAuthContext() {
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
  const [settings, setSettings] = useState(getSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Laad settings van Supabase zodra gebruiker ingelogd is
  useEffect(() => {
    if (auth.user?.id) {
      mergeSettingsOnLogin(auth.user.id).then(merged => {
        if (merged) {
          setSettings(merged)
          setNeedsOnboarding(!merged.onboardingCompleted)
        }
        setSettingsLoaded(true)
      }).catch(() => setSettingsLoaded(true))
    } else if (!auth.loading) {
      setSettingsLoaded(true)
    }
  }, [auth.user?.id, auth.loading])

  // Settings opslaan helper (update context + cloud)
  function updateSettings(newSettings) {
    const merged = saveSettings(newSettings, auth.user?.id)
    setSettings(merged)
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

  // Show loader while checking auth OR while loading cloud settings for logged-in user
  if (auth.loading || (auth.user && !settingsLoaded)) {
    return <AuthLoader />
  }

  // Show login if not authenticated
  if (!auth.user) {
    return <Login onSendOtp={auth.sendOtp} onVerifyOtp={auth.verifyOtp} />
  }

  return (
    <AuthContext.Provider value={{ ...auth, settings, updateSettings, settingsLoaded }}>
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
  )
}
