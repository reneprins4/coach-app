import { useState, useEffect, useRef } from 'react'

export default function SetInput({ exerciseName, lastWeight, lastReps, onAdd }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const weightRef = useRef(null)

  // Pre-fill from last used values
  useEffect(() => {
    if (lastWeight !== null) setWeight(String(lastWeight))
    if (lastReps !== null) setReps(String(lastReps))
  }, [lastWeight, lastReps])

  function handleSubmit(e) {
    e.preventDefault()
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    const p = rpe ? parseFloat(rpe) : null

    if (isNaN(r) || r <= 0) return

    onAdd({
      weight_kg: isNaN(w) ? 0 : w,
      reps: r,
      rpe: p,
    })

    // Keep weight, clear reps for quick consecutive sets
    setReps('')
    setRpe('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-1">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-gray-500">KG</label>
        <input
          ref={weightRef}
          type="number"
          inputMode="decimal"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="0"
          className="h-12 w-full rounded-xl bg-gray-800 px-3 text-center text-lg font-medium text-white outline-none ring-1 ring-gray-700 focus:ring-gray-500"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs text-gray-500">Reps</label>
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="0"
          className="h-12 w-full rounded-xl bg-gray-800 px-3 text-center text-lg font-medium text-white outline-none ring-1 ring-gray-700 focus:ring-gray-500"
        />
      </div>
      <div className="w-16">
        <label className="mb-1 block text-xs text-gray-500">RPE</label>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          max="10"
          step="0.5"
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          placeholder="-"
          className="h-12 w-full rounded-xl bg-gray-800 px-3 text-center text-lg font-medium text-white outline-none ring-1 ring-gray-700 focus:ring-gray-500"
        />
      </div>
      <button
        type="submit"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-black active:scale-95 transition-transform"
        aria-label="Add set"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </form>
  )
}
