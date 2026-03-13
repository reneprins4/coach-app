import { lazy, Suspense, createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getSettings } from './lib/settings'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Logger = lazy(() => import('./pages/Logger'))
const History = lazy(() => import('./pages/History'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Progress = lazy(() => import('./pages/Progress'))
const AICoach = lazy(() => import('./pages/AICoach'))
const Profile = lazy(() => import('./pages/Profile'))
const Plan = lazy(() => import('./pages/Plan'))
const Calendar = lazy(() => import('./pages/Calendar'))

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

  // Luister naar localStorage changes (onboarding complete)
  useEffect(() => {
    function onStorage() {
      setNeedsOnboarding(!getSettings().onboardingCompleted)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Show loader while checking auth
  if (auth.loading) {
    return <AuthLoader />
  }

  // Show login if not authenticated
  if (!auth.user) {
    return <Login onSignIn={auth.signIn} />
  }

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
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
