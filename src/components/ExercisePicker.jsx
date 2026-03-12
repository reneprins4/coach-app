import { useState } from 'react'
import { useExerciseSearch } from '../hooks/useExercises'

export default function ExercisePicker({ exercises, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = useExerciseSearch(exercises, query)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises..."
          autoFocus
          className="h-12 flex-1 rounded-xl bg-gray-900 px-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-500">No exercises found</p>
        )}
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => {
              onSelect(exercise)
              onClose()
            }}
            className="flex w-full items-center justify-between border-b border-gray-900 px-4 py-4 text-left active:bg-gray-900"
          >
            <div>
              <p className="text-base font-medium text-white">{exercise.name}</p>
              <p className="text-sm text-gray-500">
                {exercise.muscle_group} / {exercise.category}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
