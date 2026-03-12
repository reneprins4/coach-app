import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Trash2, ChevronRight, Calendar } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function History() {
  const { workouts, loading, deleteWorkout } = useWorkouts()
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return workouts
    const lower = query.toLowerCase()
    return workouts.filter(w =>
      w.exerciseNames.some(n => n.toLowerCase().includes(lower)) ||
      (w.notes || '').toLowerCase().includes(lower)
    )
  }, [workouts, query])

  async function handleDelete() {
    if (deleteId) {
      try { await deleteWorkout(deleteId) } catch {}
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">History</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by exercise..."
          className="h-12 w-full rounded-xl bg-gray-900 pl-10 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Calendar size={40} className="mb-4 text-gray-700" />
          <p className="text-gray-500">{query ? 'No workouts match your search' : 'No workouts yet'}</p>
          {!query && (
            <Link to="/log" className="mt-4 text-sm font-medium text-orange-500">
              Start your first workout
            </Link>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(w => {
          const d = new Date(w.created_at)
          return (
            <div key={w.id} className="group relative">
              <Link
                to={`/history/${w.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 active:bg-gray-800"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-800">
                  <span className="text-xs text-gray-500">{DAY_NAMES[d.getDay()]}</span>
                  <span className="text-lg font-bold text-white">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {w.exerciseNames.join(', ') || 'Empty workout'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatVol(w.totalVolume)} total volume
                    {w.workout_sets.length > 0 && ` / ${w.workout_sets.length} sets`}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-700" />
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(w.id) }}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-gray-700 opacity-0 transition-opacity group-hover:opacity-100 active:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">Delete workout?</h3>
            <p className="mb-6 text-sm text-gray-400">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="h-12 flex-1 rounded-xl bg-red-600 font-semibold text-white active:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
