import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { useFilteredExercises } from '../hooks/useExercises'

const MUSCLE_FILTERS = ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core']

export default function ExercisePicker({ exercises, addedNames = [], onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState(null)
  const filtered = useFilteredExercises(exercises, query, muscleFilter)
  const available = filtered.filter(e => !addedNames.includes(e.name))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800">
          <X size={20} />
        </button>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises..."
            autoFocus
            className="h-12 w-full rounded-xl bg-gray-900 pl-10 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
          />
        </div>
      </div>

      {/* Muscle group filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        {MUSCLE_FILTERS.map(mg => (
          <button
            key={mg}
            onClick={() => setMuscleFilter(mg === 'all' ? null : mg)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              (mg === 'all' && !muscleFilter) || mg === muscleFilter
                ? 'bg-orange-500 text-white'
                : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
            }`}
          >
            {mg}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {available.length === 0 && (
          <p className="px-4 py-12 text-center text-gray-500">No exercises found</p>
        )}
        {available.map(exercise => (
          <button
            key={exercise.id}
            onClick={() => { onSelect(exercise); onClose() }}
            className="flex w-full items-center justify-between border-b border-gray-900 px-4 py-4 text-left active:bg-gray-900"
          >
            <div>
              <p className="text-base font-medium text-white">{exercise.name}</p>
              <p className="text-xs text-gray-500">{exercise.muscle_group} / {exercise.category}</p>
            </div>
            <span className="text-2xl text-gray-700">+</span>
          </button>
        ))}
      </div>
    </div>
  )
}
