import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import { useWorkoutDetail } from '../hooks/useWorkouts'

export default function WorkoutDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { workout, loading } = useWorkoutDetail(id)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="px-4 py-6">
        <button onClick={() => nav('/history')} className="flex items-center gap-2 text-gray-400">
          <ArrowLeft size={20} /> Terug
        </button>
        <p className="mt-8 text-center text-gray-500">Training niet gevonden</p>
      </div>
    )
  }

  const d = new Date(workout.created_at)
  const dateStr = d.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Group sets by exercise
  const grouped = {}
  for (const s of workout.workout_sets) {
    if (!grouped[s.exercise]) grouped[s.exercise] = []
    grouped[s.exercise].push(s)
  }

  return (
    <div className="px-4 py-6">
      <button
        onClick={() => nav('/history')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 active:text-white"
      >
        <ArrowLeft size={18} /> Geschiedenis
      </button>

      <h1 className="mb-1 text-xl font-bold text-white">{dateStr}</h1>

      {/* Stats */}
      <div className="mb-6 mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
          <Dumbbell size={16} className="mx-auto mb-1 text-gray-500" />
          <p className="text-lg font-bold text-white">{Object.keys(grouped).length}</p>
          <p className="text-[10px] text-gray-500">oefeningen</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
          <TrendingUp size={16} className="mx-auto mb-1 text-gray-500" />
          <p className="text-lg font-bold text-white">{formatVol(workout.totalVolume)}</p>
          <p className="text-[10px] text-gray-500">volume</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
          <Clock size={16} className="mx-auto mb-1 text-gray-500" />
          <p className="text-lg font-bold text-white">{workout.workout_sets.length}</p>
          <p className="text-[10px] text-gray-500">totaal sets</p>
        </div>
      </div>

      {/* Notes */}
      {workout.notes && (
        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-3">
          <p className="text-sm text-gray-300">{workout.notes}</p>
        </div>
      )}

      {/* Exercise breakdown */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([exercise, sets]) => (
          <div key={exercise} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-base font-bold text-white">{exercise}</h3>
            <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-600">
              <span>#</span><span>Kg</span><span>Reps</span><span>RPE</span>
            </div>
            {sets.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[1.5rem_1fr_1fr_3rem] items-center gap-2 px-1 py-2 text-sm">
                <span className="text-gray-600">{i + 1}</span>
                <span className="font-medium text-white">{s.weight_kg}</span>
                <span className="font-medium text-white">{s.reps}</span>
                <span className="text-gray-400">{s.rpe || '-'}</span>
              </div>
            ))}
            <div className="mt-2 border-t border-gray-800 pt-2 text-xs text-gray-500">
              Volume: {formatVol(sets.reduce((sum, x) => sum + (x.weight_kg || 0) * (x.reps || 0), 0))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
