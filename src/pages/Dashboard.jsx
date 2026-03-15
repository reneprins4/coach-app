import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Dumbbell, ChevronRight } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { getCurrentBlock, getBlockProgress, PHASES } from '../lib/periodization'
import { analyzeTraining } from '../lib/training-analysis'
import MuscleMap from '../components/MuscleMap'

export default function Dashboard() {
  const { user, settings } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  const nav = useNavigate()

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    const thisWeek = workouts.filter(w => new Date(w.created_at) >= weekStart)

    let streak = 0
    const dates = new Set(workouts.map(w => new Date(w.created_at).toISOString().split('T')[0]))
    const d = new Date()
    let check = d.toISOString().split('T')[0]
    if (!dates.has(check)) { d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
    while (dates.has(check)) {
      streak++; d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0]
    }

    return { thisWeekCount: thisWeek.length, streak }
  }, [workouts])

  const muscleStatus = useMemo(() => analyzeTraining(workouts.slice(0, 30)), [workouts])

  const block = getCurrentBlock()
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null

  const recentWorkouts = workouts.slice(0, 2)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  // Empty state for new users
  if (workouts.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 text-3xl font-black tracking-tight text-white">{getGreeting()}</h1>
        <p className="mb-8 text-sm text-gray-500">
          Tijd om te beginnen.
        </p>
        <button
          onClick={() => nav('/coach')}
          className="btn-primary mb-4 max-w-xs"
        >
          Start training
        </button>
        <button
          onClick={() => nav('/log')}
          className="btn-secondary max-w-xs"
        >
          Vrije training
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">

      {/* Header */}
      <div className="mb-6">
        <p className="label-caps">{getDayName()}</p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          {getGreeting()}{settings.name ? `, ${settings.name}` : ''}
        </h1>
      </div>

      {/* Stats - 2 columns with visual weight */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-3xl font-bold tabular text-white">{stats.thisWeekCount}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Trainingen</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-3xl font-bold tabular text-white">{stats.streak}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Streak</p>
        </div>
      </div>

      {/* Active block - with subtle cyan gradient and glowing progress */}
      {block && phase && (
        <div className="card-premium mb-5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white">{phase.label}</span>
            <span className="text-xs text-gray-500">Week {progress?.currentWeek}/{progress?.totalWeeks}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              style={{ width: `${progress?.pct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Muscle Status Map */}
      {workouts.length > 0 && (
        <div className="mb-6 rounded-2xl p-4" style={{
          background: 'linear-gradient(135deg, #0f1624 0%, #0a0f1a 100%)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <p className="label-caps mb-4">Herstel</p>
          <MuscleMap muscleStatus={muscleStatus} />
        </div>
      )}

      {/* Primary CTA */}
      <button
        onClick={() => nav('/coach')}
        className="btn-primary mb-3"
      >
        Start training
      </button>

      {/* Secondary CTA */}
      <button
        onClick={() => nav('/log')}
        className="btn-secondary mb-6"
      >
        Vrije training
      </button>

      {/* Recent workouts - clean list style */}
      {recentWorkouts.length > 0 && (
        <div>
          <p className="label-caps mb-3">Recent</p>
          <div className="divide-y divide-gray-800/50">
            {recentWorkouts.map(w => {
              const date = new Date(w.created_at)
              const exercises = [...new Set((w.workout_sets || []).map(s => s.exercise))].slice(0, 4)
              return (
                <div
                  key={w.id}
                  onClick={() => nav(`/history/${w.id}`)}
                  className="flex cursor-pointer items-center justify-between py-3 active:opacity-70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-400">
                      {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="truncate text-sm text-white">
                      {exercises.length > 0 ? exercises.join(', ') : 'Geen oefeningen'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="ml-2 shrink-0 text-gray-600" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 17) return 'Goedemiddag'
  return 'Goedenavond'
}

function getDayName() {
  return ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'][new Date().getDay()]
}
