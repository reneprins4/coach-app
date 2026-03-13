import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Logger = lazy(() => import('./pages/Logger'))
const History = lazy(() => import('./pages/History'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Progress = lazy(() => import('./pages/Progress'))
const AICoach = lazy(() => import('./pages/AICoach'))
const Profile = lazy(() => import('./pages/Profile'))
const Plan = lazy(() => import('./pages/Plan'))

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
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
  )
}
