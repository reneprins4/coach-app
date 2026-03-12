import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
import { generateWorkout } from '../lib/anthropic'
import { fetchRecentHistory } from '../hooks/useWorkouts'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { getSettings } from '../lib/settings'

const FOCUS_OPTIONS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'full body', label: 'Full Body' },
]

const TIME_OPTIONS = [30, 45, 60, 90]
const ENERGY_OPTIONS = ['low', 'medium', 'high']

export default function AICoach() {
  const nav = useNavigate()
  const aw = useActiveWorkout()
  const settings = getSettings()

  const [focus, setFocus] = useState('full body')
  const [time, setTime] = useState(60)
  const [energy, setEnergy] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [showReasoning, setShowReasoning] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const history = await fetchRecentHistory(30)
      const workout = await generateWorkout(history, {
        focus,
        time,
        energy,
        goal: settings.goal,
        frequency: settings.frequency,
      })
      setResult(workout)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAccept() {
    if (!result?.exercises) return
    // Load exercises into active workout
    const preloaded = result.exercises.map(ex => ({
      name: ex.name,
      muscle_group: '',
      category: '',
      sets: [],
      // Store the plan so we can show targets
      plan: { sets: ex.sets, reps_target: ex.reps_target, weight_kg: ex.weight_kg, notes: ex.notes },
    }))
    aw.startWorkout(preloaded)
    nav('/log')
  }

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6">
      <button
        onClick={() => nav(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 active:text-white"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <Sparkles size={28} className="text-orange-500" />
        <h1 className="text-2xl font-bold">AI Coach</h1>
      </div>

      {!result ? (
        <>
          {/* Focus */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">Focus area</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFocus(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    focus === opt.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">Available time</label>
            <div className="flex gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                    time === t
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {t} min
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-gray-300">Energy level</label>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEnergy(e)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium capitalize transition-colors ${
                    energy === e
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-900/20 p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={generate} className="mt-2 text-sm font-medium text-orange-500">
                  Try again
                </button>
              </div>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-bold text-white disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Workout
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Generated plan */}
          <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="mb-3 text-sm font-semibold text-orange-500">{result.focus || focus}</p>
            {result.estimated_duration && (
              <p className="mb-3 text-xs text-gray-500">Estimated: {result.estimated_duration}</p>
            )}

            <div className="space-y-3">
              {(result.exercises || []).map((ex, i) => (
                <div key={i} className="rounded-lg bg-gray-800 p-3">
                  <p className="font-medium text-white">{ex.name}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {ex.sets} sets x {ex.reps_target} reps @ {ex.weight_kg}kg
                  </p>
                  {ex.notes && <p className="mt-1 text-xs text-gray-500">{ex.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Reasoning */}
          {result.reasoning && (
            <div className="mb-4">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400"
              >
                <span>AI reasoning</span>
                {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showReasoning && (
                <div className="mt-1 rounded-b-xl border border-t-0 border-gray-800 bg-gray-900 px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-300">{result.reasoning}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); generate() }}
              disabled={loading}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-900"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Regenerate
            </button>
            <button
              onClick={handleAccept}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-orange-500 font-bold text-white active:scale-[0.97] transition-transform"
            >
              Accept
            </button>
          </div>
        </>
      )}
    </div>
  )
}
