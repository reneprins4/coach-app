import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Dumbbell } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { getCurrentBlock, getBlockProgress, PHASES } from '../lib/periodization'

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
        <h1 className="mb-3 text-2xl font-bold text-white">{getGreeting()}</h1>
        <p className="mb-8 text-sm text-gray-500">
          Je hebt nog geen trainingen.<br />
          Laten we beginnen.
        </p>
        <button
          onClick={() => nav('/coach')}
          className="mb-4 w-full max-w-xs rounded-xl bg-cyan-500 px-6 py-4 font-bold text-white transition-colors active:bg-cyan-600"
        >
          Start training
        </button>
        <button
          onClick={() => nav('/log')}
          className="w-full max-w-xs rounded-xl bg-gray-900 px-6 py-4 font-semibold text-white ring-1 ring-gray-800 transition-colors active:bg-gray-800"
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
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{getDayName()}</p>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}{settings.name ? `, ${settings.name}` : ''}
        </h1>
      </div>

      {/* Compact stats - 2 columns */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.thisWeekCount}</p>
          <p className="mt-1 text-xs text-gray-500">Deze week</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.streak}</p>
          <p className="mt-1 text-xs text-gray-500">Dagen streak</p>
        </div>
      </div>

      {/* Active block - compact single line with progress */}
      {block && phase && (
        <div className="mb-5 rounded-xl bg-gray-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white">{phase.label}</span>
            <span className="text-xs text-gray-500">Week {progress?.currentWeek}/{progress?.totalWeeks}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${progress?.pct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <button
        onClick={() => nav('/coach')}
        className="mb-3 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-cyan-500 font-bold text-white transition-colors active:bg-cyan-600"
      >
        <Sparkles size={20} />
        Start training
      </button>

      {/* Secondary CTA */}
      <button
        onClick={() => nav('/log')}
        className="mb-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 font-medium text-gray-300 ring-1 ring-gray-800 transition-colors active:bg-gray-800"
      >
        <Dumbbell size={18} />
        Vrije training
      </button>

      {/* Recent workouts - compact */}
      {recentWorkouts.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Laatste trainingen</p>
          <div className="space-y-2">
            {recentWorkouts.map(w => {
              const date = new Date(w.created_at)
              const exercises = [...new Set((w.workout_sets || []).map(s => s.exercise))].slice(0, 3)
              return (
                <div
                  key={w.id}
                  onClick={() => nav(`/history/${w.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-900 px-4 py-3 active:bg-gray-800"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {exercises.length > 0 ? exercises.join(', ') : 'Geen oefeningen'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-600">{(w.workout_sets || []).length} sets</span>
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
