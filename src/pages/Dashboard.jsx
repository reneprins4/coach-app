import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Zap, TrendingUp, Calendar, Award, Sparkles } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
const MUSCLE_COLORS = {
  chest: 'bg-red-500',
  back: 'bg-blue-500',
  legs: 'bg-green-500',
  shoulders: 'bg-yellow-500',
  arms: 'bg-purple-500',
  core: 'bg-cyan-500',
}

function e1rm(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export default function Dashboard() {
  const { workouts, loading } = useWorkouts()

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const thisWeek = workouts.filter(w => new Date(w.created_at) >= weekStart)
    const weekVolume = thisWeek.reduce((s, w) => s + (w.totalVolume || 0), 0)

    // Days since last workout
    const lastWorkout = workouts[0]
    const daysSince = lastWorkout
      ? Math.floor((now.getTime() - new Date(lastWorkout.created_at).getTime()) / 86400000)
      : null

    // Streak (consecutive days with workouts)
    let streak = 0
    if (workouts.length > 0) {
      const dates = new Set(workouts.map(w =>
        new Date(w.created_at).toISOString().split('T')[0]
      ))
      const d = new Date()
      // Start from today or yesterday
      let check = d.toISOString().split('T')[0]
      if (!dates.has(check)) {
        d.setDate(d.getDate() - 1)
        check = d.toISOString().split('T')[0]
      }
      while (dates.has(check)) {
        streak++
        d.setDate(d.getDate() - 1)
        check = d.toISOString().split('T')[0]
      }
    }

    // Recent PRs (last 7 days)
    const prWindow = new Date(now)
    prWindow.setDate(now.getDate() - 7)
    const allSets = workouts.flatMap(w => (w.workout_sets || []).map(s => ({ ...s, workout_date: w.created_at })))
    const exerciseBest = {}
    for (const s of allSets) {
      const val = e1rm(s.weight_kg || 0, s.reps || 0)
      if (!exerciseBest[s.exercise] || val > exerciseBest[s.exercise].best) {
        exerciseBest[s.exercise] = { best: val, date: s.workout_date, weight: s.weight_kg, reps: s.reps }
      }
    }
    const recentPRs = Object.entries(exerciseBest)
      .filter(([, v]) => new Date(v.date) >= prWindow)
      .map(([name, v]) => ({ name, ...v }))
      .slice(0, 5)

    // Muscle heatmap for this week
    const muscleVolume = {}
    for (const w of thisWeek) {
      for (const s of (w.workout_sets || [])) {
        const mg = getMuscleGroup(s.exercise)
        muscleVolume[mg] = (muscleVolume[mg] || 0) + (s.weight_kg || 0) * (s.reps || 0)
      }
    }
    const maxMuscleVol = Math.max(...Object.values(muscleVolume), 1)

    return { thisWeekCount: thisWeek.length, weekVolume, daysSince, streak, recentPRs, muscleVolume, maxMuscleVol }
  }, [workouts])

  const today = DAY_NAMES[new Date().getDay()]

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Good {getTimeOfDay()}</h1>
      <p className="mb-6 text-gray-400">{today} — let's get after it</p>

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard icon={Calendar} label="This week" value={stats.thisWeekCount} unit="workouts" />
        <StatCard icon={TrendingUp} label="Volume" value={formatVolume(stats.weekVolume)} unit="this week" />
        <StatCard icon={Zap} label="Streak" value={stats.streak} unit="days" />
        <StatCard
          icon={Award}
          label="Last workout"
          value={stats.daysSince !== null ? stats.daysSince : '--'}
          unit={stats.daysSince === 1 ? 'day ago' : 'days ago'}
        />
      </div>

      {/* Muscle heatmap */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Muscle groups this week</h2>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS.map(mg => {
            const vol = stats.muscleVolume[mg] || 0
            const intensity = vol > 0 ? Math.max(0.15, vol / stats.maxMuscleVol) : 0
            return (
              <div key={mg} className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2">
                <div
                  className={`h-3 w-3 rounded-full ${MUSCLE_COLORS[mg]}`}
                  style={{ opacity: intensity || 0.15 }}
                />
                <div>
                  <p className="text-xs font-medium capitalize text-gray-300">{mg}</p>
                  <p className="text-[10px] text-gray-500">{vol > 0 ? formatVolume(vol) : 'Rest'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent PRs */}
      {stats.recentPRs.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Recent personal records</h2>
          <div className="space-y-2">
            {stats.recentPRs.map(pr => (
              <div key={pr.name} className="flex items-center justify-between">
                <span className="text-sm text-white">{pr.name}</span>
                <span className="text-sm font-medium text-orange-500">
                  {pr.weight}kg x {pr.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach CTA */}
      <Link
        to="/coach"
        className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 transition-colors active:bg-orange-500/20"
      >
        <Sparkles size={24} className="text-orange-500" />
        <div>
          <p className="font-semibold text-white">Generate a workout</p>
          <p className="text-sm text-gray-400">AI Coach will program your next session</p>
        </div>
      </Link>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, unit }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-400">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{unit}</p>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatVolume(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}

function getMuscleGroup(exerciseName) {
  const lower = exerciseName.toLowerCase()
  if (/bench|chest|fly|dip|push.?up/.test(lower)) return 'chest'
  if (/squat|leg|lunge|hip|calf|extension|curl(?!.*(bicep|hammer|dumbbell))/.test(lower)) return 'legs'
  if (/dead|row|pull|lat|back/.test(lower)) return 'back'
  if (/press(?!.*bench)|shoulder|lateral|raise|face|shrug/.test(lower)) return 'shoulders'
  if (/curl|bicep|tricep|hammer|skull|pushdown/.test(lower)) return 'arms'
  if (/plank|ab|crunch|core/.test(lower)) return 'core'
  return 'chest' // default
}
