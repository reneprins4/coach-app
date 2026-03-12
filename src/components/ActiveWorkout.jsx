import { useState, useMemo } from 'react'
import ExerciseCard from './ExerciseCard'
import ExercisePicker from './ExercisePicker'
import { useLastUsed } from '../hooks/useLastUsed'

function formatDuration(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

export default function ActiveWorkout({
  workout,
  exercises,
  onAddExercise,
  onRemoveExercise,
  onAddSet,
  onRemoveSet,
  onFinish,
  onDiscard,
  saving,
  error,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const { getLastWeight, getLastReps, saveLastUsed } = useLastUsed()

  // Total sets count
  const totalSets = useMemo(
    () => workout.exercises.reduce((sum, e) => sum + e.sets.length, 0),
    [workout.exercises]
  )

  function handleAddSet(exerciseName, setData) {
    onAddSet(exerciseName, setData)
    saveLastUsed(exerciseName, setData.weight_kg, setData.reps)
  }

  // Filter out already-added exercises
  const availableExercises = useMemo(() => {
    const added = new Set(workout.exercises.map((e) => e.name))
    return exercises.filter((e) => !added.has(e.name))
  }, [exercises, workout.exercises])

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Workout in progress</p>
            <p className="text-xs text-gray-600">
              {formatDuration(workout.startedAt)} / {totalSets} sets
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDiscard(true)}
              className="h-10 rounded-xl px-4 text-sm font-medium text-gray-400 ring-1 ring-gray-800 active:bg-gray-900"
            >
              Discard
            </button>
            <button
              onClick={onFinish}
              disabled={saving || totalSets === 0}
              className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              {saving ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </header>

      {/* Exercises */}
      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        {workout.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.name}
            exercise={exercise}
            lastWeight={getLastWeight(exercise.name)}
            lastReps={getLastReps(exercise.name)}
            onAddSet={handleAddSet}
            onRemoveSet={onRemoveSet}
            onRemoveExercise={onRemoveExercise}
          />
        ))}

        {workout.exercises.length === 0 && (
          <p className="py-12 text-center text-gray-600">
            Add an exercise to get started
          </p>
        )}
      </main>

      {/* Floating add button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={() => setShowPicker(true)}
          className="h-14 w-full rounded-2xl bg-gray-900 font-medium text-white ring-1 ring-gray-800 active:bg-gray-800"
        >
          + Add Exercise
        </button>
      </div>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePicker
          exercises={availableExercises}
          onSelect={onAddExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Discard confirmation */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Discard workout?
            </h3>
            <p className="mb-6 text-sm text-gray-400">
              This will delete all logged sets. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDiscard()
                  setShowDiscard(false)
                }}
                className="h-12 flex-1 rounded-xl bg-red-600 font-medium text-white active:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
