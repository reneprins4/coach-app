export default function StartWorkout({ onStart }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <h2 className="mb-2 text-2xl font-bold text-white">Ready to train?</h2>
      <p className="mb-8 text-gray-400">Start a new workout session</p>
      <button
        onClick={onStart}
        className="h-16 w-full max-w-sm rounded-2xl bg-white font-semibold text-black text-lg active:scale-[0.97] transition-transform"
      >
        Start Workout
      </button>
    </div>
  )
}
