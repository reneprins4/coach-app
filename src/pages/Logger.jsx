import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Minus, ChevronDown, Timer, Trash2, Check, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { useExercises, useFilteredExercises } from '../hooks/useExercises'
import { useRestTimer } from '../hooks/useRestTimer'
import { getExerciseHistory } from '../hooks/useWorkouts'
import { getExerciseSubstitute } from '../lib/anthropic'
import { getSettings } from '../lib/settings'
import ExercisePicker from '../components/ExercisePicker'
import RestTimerBar from '../components/RestTimerBar'
import FinishModal from '../components/FinishModal'

export default function Logger() {
  const nav = useNavigate()
  const aw = useActiveWorkout()
  const { exercises } = useExercises()
  const rest = useRestTimer()
  const settings = getSettings()
  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [finishResult, setFinishResult] = useState(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const [swapTarget, setSwapTarget] = useState(null) // exercise being swapped

  // Auto-load AI-generated pending workout when navigating from Coach
  useEffect(() => {
    const raw = localStorage.getItem('coach-pending-workout')
    if (raw && !aw.isActive) {
      try {
        const plan = JSON.parse(raw)
        aw.startWorkout(plan)
      } catch {}
      localStorage.removeItem('coach-pending-workout')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFinish() {
    const result = await aw.finishWorkout()
    if (result) {
      setFinishResult(result)
      setShowFinish(true)
    }
  }

  function handleFinishClose() {
    setShowFinish(false)
    setFinishResult(null)
    nav('/')
  }

  if (!aw.isActive) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
        <h1 className="mb-2 text-2xl font-bold">Klaar voor training</h1>
        <p className="mb-8 text-center text-gray-400">Start een training om sets te loggen</p>
        <button
          onClick={() => aw.startWorkout()}
          className="h-16 w-full max-w-sm rounded-2xl bg-orange-500 text-lg font-bold text-white active:scale-[0.97] transition-transform"
        >
          Start training
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-orange-500" />
              <span className="font-mono text-lg font-bold text-white">
                {formatTime(aw.elapsed)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {aw.totalSets} sets / {formatVolume(aw.totalVolume)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDiscard(true)}
              className="h-10 rounded-xl px-3 text-sm text-gray-400 ring-1 ring-gray-800 active:bg-gray-900"
            >
              Stoppen
            </button>
            <button
              onClick={handleFinish}
              disabled={aw.saving || aw.totalSets === 0}
              className="h-10 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              {aw.saving ? 'Opslaan...' : 'Afronden'}
            </button>
          </div>
        </div>
        {aw.error && (
          <p className="mt-2 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{aw.error}</p>
        )}
      </header>

      {/* Rest timer */}
      {rest.active && <RestTimerBar remaining={rest.remaining} total={rest.total} onStop={rest.stop} />}

      {/* Exercise list */}
      <div className="flex-1 space-y-4 px-4 py-4">
        {aw.workout.exercises.map(exercise => (
          <ExerciseBlock
            key={exercise.name}
            exercise={exercise}
            onAddSet={(data) => {
              aw.addSet(exercise.name, data)
              rest.start()
            }}
            onRemoveSet={(id) => aw.removeSet(exercise.name, id)}
            onRemove={() => aw.removeExercise(exercise.name)}
            onSwap={() => setSwapTarget(exercise)}
            lastUsed={aw.getLastUsed(exercise.name)}
          />
        ))}

        {aw.workout.exercises.length === 0 && (
          <p className="py-16 text-center text-gray-600">Add an exercise to get started</p>
        )}

        {/* Notes */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
          <textarea
            value={aw.workout.notes}
            onChange={(e) => aw.updateNotes(e.target.value)}
            placeholder="Training notities..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
        </div>
      </div>

      {/* Add exercise button */}
      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2">
        <button
          onClick={() => setShowPicker(true)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 font-semibold text-white ring-1 ring-gray-800 active:bg-gray-800"
        >
          <Plus size={20} />
          Oefening toevoegen
        </button>
      </div>

      {/* Modals */}
      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          addedNames={aw.workout.exercises.map(e => e.name)}
          onSelect={(ex) => aw.addExercise(ex)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showFinish && finishResult && (
        <FinishModal result={finishResult} onClose={handleFinishClose} />
      )}

      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">Training stoppen?</h3>
            <p className="mb-6 text-sm text-gray-400">Alle gelogde sets gaan verloren.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                Annuleer
              </button>
              <button
                onClick={() => { aw.discardWorkout(); setShowDiscard(false) }}
                className="h-12 flex-1 rounded-xl bg-red-600 font-semibold text-white active:bg-red-700"
              >
                Stoppen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap exercise modal */}
      {swapTarget && (
        <SwapModal
          exercise={swapTarget}
          settings={settings}
          onAccept={(sub) => {
            aw.replaceExercise(swapTarget.name, {
              name: sub.name,
              muscle_group: sub.muscle_group,
              category: '',
              plan: {
                sets: sub.sets,
                reps_min: sub.reps_min,
                reps_max: sub.reps_max,
                weight_kg: sub.weight_kg,
                rpe_target: sub.rpe_target,
                rest_seconds: sub.rest_seconds,
                notes: sub.notes,
              },
            })
            setSwapTarget(null)
          }}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  )
}

// ── SWAP MODAL ───────────────────────────────────────────────────────────────
const SWAP_REASONS = [
  { value: 'machine_busy', label: '🔴 Machine bezet', desc: 'Apparaat bezet' },
  { value: 'no_equipment', label: '⚠️ Geen apparaat', desc: 'Niet beschikbaar' },
  { value: 'want_variety', label: '🔄 Wil variatie', desc: 'Iets anders' },
  { value: 'feels_off', label: '💪 Voelt niet goed', desc: 'Niet in de stemming' },
]

function SwapModal({ exercise, settings, onAccept, onClose }) {
  const [reason, setReason] = useState(null)
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)

  async function handleFetch() {
    if (!reason) return
    setLoading(true)
    setError(null)
    try {
      const sub = await getExerciseSubstitute({
        exercise,
        reason,
        equipment: settings.equipment,
        experienceLevel: settings.experienceLevel,
        bodyweight: settings.bodyweight,
      })
      setSuggestion(sub)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Oefening wisselen</h3>
          <button onClick={onClose} className="p-1 text-gray-500"><X size={20} /></button>
        </div>

        <div className="mb-4 rounded-xl bg-gray-800 px-3 py-2">
          <p className="text-xs text-gray-500">Vervangen</p>
          <p className="font-semibold text-white">{exercise.name}</p>
          {exercise.muscle_group && (
            <p className="text-xs capitalize text-orange-400">{exercise.muscle_group}</p>
          )}
        </div>

        {!suggestion ? (
          <>
            <p className="mb-3 text-sm text-gray-400">Waarom wissel je?</p>
            <div className="mb-4 space-y-2">
              {SWAP_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    reason === r.value
                      ? 'bg-orange-500/20 ring-1 ring-orange-500/50'
                      : 'bg-gray-800 ring-1 ring-gray-700'
                  }`}
                >
                  <span className="font-medium text-white">{r.label}</span>
                  <span className="text-xs text-gray-500">{r.desc}</span>
                </button>
              ))}
            </div>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <button
              onClick={handleFetch}
              disabled={!reason || loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-bold text-white disabled:opacity-50"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Alternatief zoeken...</> : <><RefreshCw size={18} /> Zoek alternatief</>}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-400">Voorgesteld alternatief</p>
              <p className="text-xl font-black text-white">{suggestion.name}</p>
              <p className="mt-1 text-xs capitalize text-gray-400">{suggestion.muscle_group}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-800 py-2">
                  <p className="font-bold text-white">{suggestion.sets}×{suggestion.reps_min}-{suggestion.reps_max}</p>
                  <p className="text-[10px] text-gray-500">sets×herh.</p>
                </div>
                <div className="rounded-lg bg-orange-500/20 py-2">
                  <p className="font-bold text-orange-400">{suggestion.weight_kg}kg</p>
                  <p className="text-[10px] text-gray-500">gewicht</p>
                </div>
                <div className="rounded-lg bg-gray-800 py-2">
                  <p className="font-bold text-white">RPE {suggestion.rpe_target}</p>
                  <p className="text-[10px] text-gray-500">intensiteit</p>
                </div>
              </div>
              {suggestion.why && (
                <p className="mt-3 text-xs text-gray-400">{suggestion.why}</p>
              )}
              {suggestion.notes && (
                <p className="mt-1 text-xs text-orange-300">{suggestion.notes}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSuggestion(null); setReason(null) }}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700"
              >
                Probeer ander
              </button>
              <button
                onClick={() => onAccept(suggestion)}
                className="h-12 flex-1 rounded-xl bg-orange-500 font-bold text-white active:scale-[0.97] transition-transform"
              >
                Gebruik dit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── EXERCISE BLOCK ────────────────────────────────────────────────────────────
function ExerciseBlock({ exercise, onAddSet, onRemoveSet, onRemove, onSwap, lastUsed }) {
  const [weight, setWeight] = useState(
    exercise.plan?.weight_kg?.toString() || lastUsed?.weight_kg?.toString() || ''
  )
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState(7)
  const [showRpe, setShowRpe] = useState(false)
  const [prevData, setPrevData] = useState(null)
  const [prevLoaded, setPrevLoaded] = useState(false)

  // Load previous session data
  if (!prevLoaded) {
    setPrevLoaded(true)
    getExerciseHistory(exercise.name).then(data => {
      if (data.length > 0) {
        // Group by workout, get the most recent workout's sets
        const latest = data[0]
        setPrevData({ weight: latest.weight_kg, reps: latest.reps })
      }
    })
  }

  function handleAdd() {
    const w = parseFloat(weight) || 0
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return
    onAddSet({ weight_kg: w, reps: r, rpe: showRpe ? rpe : null })
    setReps('')
  }

  function adjustWeight(delta) {
    const current = parseFloat(weight) || 0
    setWeight(String(Math.max(0, current + delta)))
  }

  function adjustReps(delta) {
    const current = parseInt(reps, 10) || 0
    setReps(String(Math.max(0, current + delta)))
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">{exercise.name}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onSwap}
            className="flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1.5 text-xs text-gray-400 active:text-orange-400"
            title="Swap exercise"
          >
            <RefreshCw size={13} />
            <span>Swap</span>
          </button>
          <button onClick={onRemove} className="p-2 text-gray-600 active:text-red-400">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* AI plan targets */}
      {exercise.plan && (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-400">
          <Sparkles size={12} />
          <span>
            Doel: {exercise.plan.sets}x{exercise.plan.reps_min || exercise.plan.reps_target}
            {exercise.plan.reps_max && exercise.plan.reps_max !== exercise.plan.reps_min ? `-${exercise.plan.reps_max}` : ''}
            {' '}@ {exercise.plan.weight_kg}kg
            {exercise.plan.rpe_target ? ` RPE ${exercise.plan.rpe_target}` : ''}
          </span>
        </div>
      )}

      {/* Previous session hint */}
      {prevData && (
        <p className="mb-3 text-xs text-gray-500">
          Vorige keer: {prevData.weight}kg x {prevData.reps}
        </p>
      )}

      {/* Set list */}
      {exercise.sets.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem_2rem] gap-1 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-600">
            <span>#</span><span>Kg</span><span>Reps</span><span>RPE</span><span />
          </div>
          {exercise.sets.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[1.5rem_1fr_1fr_3rem_2rem] items-center gap-1 rounded-lg px-1 py-2 text-sm">
              <span className="text-gray-600">{i + 1}</span>
              <span className="font-medium text-white">{s.weight_kg}</span>
              <span className="font-medium text-white">{s.reps}</span>
              <span className="text-gray-400">{s.rpe || '-'}</span>
              <button
                onClick={() => onRemoveSet(s.id)}
                className="p-1 text-gray-700 active:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          {/* Weight with +/- */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Weight (kg)</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="flex h-12 w-10 items-center justify-center rounded-l-xl bg-gray-800 text-gray-400 active:bg-gray-700"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="h-12 w-full bg-gray-800 px-2 text-center text-lg font-bold text-white outline-none"
              />
              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="flex h-12 w-10 items-center justify-center rounded-r-xl bg-gray-800 text-gray-400 active:bg-gray-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Reps with +/- */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Reps</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="flex h-12 w-10 items-center justify-center rounded-l-xl bg-gray-800 text-gray-400 active:bg-gray-700"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                className="h-12 w-full bg-gray-800 px-2 text-center text-lg font-bold text-white outline-none"
              />
              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="flex h-12 w-10 items-center justify-center rounded-r-xl bg-gray-800 text-gray-400 active:bg-gray-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white active:scale-95 transition-transform"
          >
            <Check size={20} strokeWidth={3} />
          </button>
        </div>

        {/* RPE toggle + slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRpe(!showRpe)}
            className={`text-xs font-medium ${showRpe ? 'text-orange-500' : 'text-gray-600'}`}
          >
            RPE {showRpe ? rpe : '(tap to add)'}
          </button>
          {showRpe && (
            <input
              type="range"
              min="6"
              max="10"
              step="0.5"
              value={rpe}
              onChange={(e) => setRpe(parseFloat(e.target.value))}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatVolume(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
