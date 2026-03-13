import { lazy, Suspense, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'

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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
    </div>
  )
}

function AuthLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-950">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
    </div>
  )
}

export default function App() {
  const auth = useAuth()

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
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
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
