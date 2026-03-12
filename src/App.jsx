import { useWorkout } from './hooks/useWorkout'
import { useExercises } from './hooks/useExercises'
import StartWorkout from './components/StartWorkout'
import ActiveWorkout from './components/ActiveWorkout'

function App() {
  const {
    workout,
    saving,
    error,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    finishWorkout,
    discardWorkout,
    isActive,
  } = useWorkout()

  const { exercises } = useExercises()

  async function handleFinish() {
    try {
      // TODO: get real user id from auth
      await finishWorkout('00000000-0000-0000-0000-000000000000')
    } catch {
      // error is set in hook
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {!isActive ? (
        <>
          <header className="border-b border-gray-800 px-4 py-4">
            <h1 className="text-xl font-bold tracking-tight">Coach</h1>
          </header>
          <StartWorkout onStart={startWorkout} />
        </>
      ) : (
        <ActiveWorkout
          workout={workout}
          exercises={exercises}
          onAddExercise={addExercise}
          onRemoveExercise={removeExercise}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onFinish={handleFinish}
          onDiscard={discardWorkout}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}

export default App
