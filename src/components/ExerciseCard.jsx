import SetInput from './SetInput'

export default function ExerciseCard({
  exercise,
  lastWeight,
  lastReps,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}) {
  return (
    <div className="rounded-2xl bg-gray-900 p-4">
      {/* Exercise header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{exercise.name}</h3>
        <button
          onClick={() => onRemoveExercise(exercise.name)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 active:bg-gray-800 active:text-gray-400"
          aria-label={`Remove ${exercise.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      {/* Set list */}
      {exercise.sets.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="grid grid-cols-[2rem_1fr_1fr_3rem_2rem] gap-2 px-1 text-xs text-gray-500">
            <span>#</span>
            <span>KG</span>
            <span>Reps</span>
            <span>RPE</span>
            <span></span>
          </div>
          {exercise.sets.map((set, idx) => (
            <div
              key={set.id}
              className="grid grid-cols-[2rem_1fr_1fr_3rem_2rem] gap-2 rounded-lg px-1 py-2 text-sm items-center"
            >
              <span className="text-gray-600">{idx + 1}</span>
              <span className="font-medium text-white">{set.weight_kg}</span>
              <span className="font-medium text-white">{set.reps}</span>
              <span className="text-gray-400">{set.rpe || '-'}</span>
              <button
                onClick={() => onRemoveSet(exercise.name, set.id)}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-700 active:text-red-400"
                aria-label="Remove set"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New set input */}
      <SetInput
        exerciseName={exercise.name}
        lastWeight={lastWeight}
        lastReps={lastReps}
        onAdd={(setData) => onAddSet(exercise.name, setData)}
      />
    </div>
  )
}
