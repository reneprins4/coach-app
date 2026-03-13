import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, Timer, Check, Sparkles, RefreshCw, Loader2, Dumbbell, CalendarDays, ChevronRight, Calculator, BookOpen, MoreVertical, X } from 'lucide-react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { useExercises } from '../hooks/useExercises'
import { useRestTimer } from '../hooks/useRestTimer'
import { useTemplates } from '../hooks/useTemplates'
import { getExerciseHistory } from '../hooks/useWorkouts'
import { getExerciseSubstitute } from '../lib/anthropic'
import { getSettings } from '../lib/settings'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { useAuthContext } from '../App'
import ExercisePicker from '../components/ExercisePicker'
import RestTimerBar from '../components/RestTimerBar'
import FinishModal from '../components/FinishModal'
import ExerciseGuide from '../components/ExerciseGuide'
import Toast from '../components/Toast'
import PlateCalculator from '../components/PlateCalculator'
import TemplateLibrary from '../components/TemplateLibrary'

export default function Logger() {
  const nav = useNavigate()
  const { user } = useAuthContext()
  const aw = useActiveWorkout(user?.id)
  const { exercises } = useExercises()
  const rest = useRestTimer()
  const templates = useTemplates(user?.id)
  const settings = getSettings()
  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [finishResult, setFinishResult] = useState(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showConfirmFinish, setShowConfirmFinish] = useState(false)
  const [swapTarget, setSwapTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [plateCalcWeight, setPlateCalcWeight] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('coach-pending-workout')
    if (raw && !aw.isActive) {
      try {
        const plan = JSON.parse(raw)
        aw.startWorkout(plan)
      } catch {}
      localStorage.removeItem('coach-pending-workout')
    }
  }, [])

  function handleFinishClick() {
    setShowConfirmFinish(true)
  }

  async function handleFinish() {
    setShowConfirmFinish(false)
    const result = await aw.finishWorkout()
    if (result) {
      setFinishResult(result)
      setShowFinish(true)
    }
  }

  function handleRemoveSet(exerciseName, setId, setData) {
    aw.removeSet(exerciseName, setId)
    setToast({
      message: 'Set verwijderd',
      action: 'Ongedaan maken',
      onAction: () => {
        aw.addSet(exerciseName, setData)
      },
    })
  }

  function handleFinishClose() {
    setShowFinish(false)
    setFinishResult(null)
    nav('/')
  }

  function handleLoadTemplate(template) {
    const exercises = templates.loadTemplate(template)
    aw.startWorkout(exercises)
    setShowTemplates(false)
    setToast({ message: `Template "${template.name}" geladen` })
  }

  async function handleDeleteTemplate(id) {
    try {
      await templates.deleteTemplate(id)
      setToast({ message: 'Template verwijderd' })
    } catch (err) {
      setToast({ message: 'Kon template niet verwijderen' })
    }
  }

  if (!aw.isActive) {
    const block = getCurrentBlock()
    const weekTarget = block ? getCurrentWeekTarget(block) : null
    const phase = block ? PHASES[block.phase] : null

    return (
      <div className="min-h-[80vh] px-5 py-8">
        <h1 className="mb-1 text-2xl font-bold">Trainen</h1>
        <p className="mb-7 text-sm text-gray-400">Kies hoe je wilt beginnen</p>

        <div className="space-y-3">
          <button
            onClick={() => nav('/coach')}
            className="flex w-full items-center gap-4 rounded-2xl bg-red-500 px-5 py-4 text-left active:scale-[0.97] transition-transform"
          >
            <Sparkles size={24} className="text-white shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white">AI workout genereren</p>
              <p className="text-sm text-red-200">Gepersonaliseerd op basis van jouw herstel</p>
            </div>
            <ChevronRight size={18} className="text-red-200 shrink-0" />
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="flex w-full items-center gap-4 rounded-2xl border border-gray-700 bg-gray-900 px-5 py-4 text-left active:scale-[0.97] transition-transform"
          >
            <BookOpen size={24} className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white">Gebruik template</p>
              <p className="text-sm text-gray-500">
                {templates.templates.length > 0 
                  ? `${templates.templates.length} opgeslagen templates`
                  : 'Sla trainingen op voor hergebruik'}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-600 shrink-0" />
          </button>

          {block && phase && weekTarget && (
            <button
              onClick={() => nav('/coach')}
              className="flex w-full items-center gap-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-left active:scale-[0.97] transition-transform"
            >
              <CalendarDays size={24} className="text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-white">Volgende uit programma</p>
                <p className="text-sm text-blue-300">
                  {phase.label} - Week {block.currentWeek}/{phase.weeks} -{' '}
                  {weekTarget.isDeload ? 'Deload' : `RPE ${weekTarget.rpe} - ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} herh.`}
                </p>
              </div>
              <ChevronRight size={18} className="text-blue-400 shrink-0" />
            </button>
          )}

          <button
            onClick={() => aw.startWorkout()}
            className="flex w-full items-center gap-4 rounded-2xl border border-gray-700 bg-gray-900 px-5 py-4 text-left active:scale-[0.97] transition-transform"
          >
            <Dumbbell size={24} className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white">Losse training</p>
              <p className="text-sm text-gray-500">Zelf oefeningen kiezen en loggen</p>
            </div>
            <ChevronRight size={18} className="text-gray-600 shrink-0" />
          </button>
        </div>

        {showTemplates && (
          <TemplateLibrary
            templates={templates.templates}
            onLoad={handleLoadTemplate}
            onDelete={handleDeleteTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            action={toast.action}
            onAction={toast.onAction}
            onDismiss={() => setToast(null)}
          />
        )}
      </div>
    )
  }

  // Get workout type name from exercises
  const workoutType = getWorkoutType(aw.workout.exercises)

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 pb-28">
      {/* Sticky Workout Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">{workoutType}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Timer size={14} className="text-red-500" />
                  <span className="font-mono">{formatTime(aw.elapsed)}</span>
                </div>
                <span>-</span>
                <span>{aw.totalSets} sets</span>
                <span>-</span>
                <span>{formatVolume(aw.totalVolume)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscard(true)}
                className="h-10 rounded-xl px-3 text-sm text-gray-400 ring-1 ring-gray-700 active:bg-gray-900"
              >
                Stop
              </button>
              <button
                onClick={handleFinishClick}
                disabled={aw.saving || aw.totalSets === 0}
                className="h-10 rounded-xl bg-red-500 px-4 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.97] transition-transform"
              >
                {aw.saving ? 'Opslaan...' : 'Afronden'}
              </button>
            </div>
          </div>
        </div>
        {aw.error && (
          <p className="mx-4 mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{aw.error}</p>
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
            userId={user?.id}
            onAddSet={(data) => {
              aw.addSet(exercise.name, data)
              rest.start()
            }}
            onRemoveSet={(id, setData) => handleRemoveSet(exercise.name, id, setData)}
            onRemove={() => aw.removeExercise(exercise.name)}
            onSwap={() => setSwapTarget(exercise)}
            onOpenPlateCalc={(weight) => setPlateCalcWeight(weight)}
            lastUsed={aw.getLastUsed(exercise.name)}
          />
        ))}

        {aw.workout.exercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Dumbbell size={48} className="mb-4 text-gray-700" />
            <p className="text-gray-500">Voeg een oefening toe om te beginnen</p>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Notities</label>
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 font-semibold text-white ring-1 ring-gray-700 active:bg-gray-800"
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
        <FinishModal 
          result={finishResult} 
          onClose={handleFinishClose}
          onSaveTemplate={async (name) => {
            await templates.saveTemplate(name, finishResult.exercises)
          }}
        />
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

      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">Training afronden?</h3>
            <p className="mb-6 text-sm text-gray-400">Weet je zeker dat je deze training wilt opslaan?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                Annuleer
              </button>
              <button
                onClick={handleFinish}
                className="h-12 flex-1 rounded-xl bg-red-500 font-semibold text-white active:bg-red-600"
              >
                Afronden
              </button>
            </div>
          </div>
        </div>
      )}

      {plateCalcWeight !== null && (
        <PlateCalculator
          targetWeight={plateCalcWeight}
          onClose={() => setPlateCalcWeight(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          onAction={toast.onAction}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

// Helper to determine workout type from exercises
function getWorkoutType(exercises) {
  if (!exercises || exercises.length === 0) return 'Workout'
  
  const muscles = exercises.map(e => e.muscle_group?.toLowerCase()).filter(Boolean)
  const uniqueMuscles = [...new Set(muscles)]
  
  if (uniqueMuscles.length === 0) return 'Workout'
  
  // Check for common splits
  const hasChest = uniqueMuscles.some(m => m.includes('chest') || m.includes('borst'))
  const hasBack = uniqueMuscles.some(m => m.includes('back') || m.includes('rug'))
  const hasShoulders = uniqueMuscles.some(m => m.includes('shoulder') || m.includes('schouder'))
  const hasLegs = uniqueMuscles.some(m => m.includes('leg') || m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('been'))
  const hasArms = uniqueMuscles.some(m => m.includes('bicep') || m.includes('tricep') || m.includes('arm'))
  
  if (hasChest && (hasShoulders || hasArms) && !hasBack && !hasLegs) return 'Push Day'
  if (hasBack && !hasChest && !hasLegs) return 'Pull Day'
  if (hasLegs && !hasChest && !hasBack) return 'Leg Day'
  if (hasChest && hasBack) return 'Upper Body'
  if (uniqueMuscles.length === 1) return uniqueMuscles[0].charAt(0).toUpperCase() + uniqueMuscles[0].slice(1)
  
  return 'Full Body'
}

// ── SWAP MODAL ───────────────────────────────────────────────────────────────
const SWAP_REASONS = [
  { value: 'machine_busy', label: 'Machine bezet', desc: 'Apparaat bezet' },
  { value: 'no_equipment', label: 'Geen apparaat', desc: 'Niet beschikbaar' },
  { value: 'want_variety', label: 'Wil variatie', desc: 'Iets anders' },
  { value: 'feels_off', label: 'Voelt niet goed', desc: 'Niet in de stemming' },
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
            <p className="text-xs capitalize text-red-400">{exercise.muscle_group}</p>
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
                      ? 'bg-red-500/20 ring-1 ring-red-500/50'
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 font-bold text-white disabled:opacity-50"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Alternatief zoeken...</> : <><RefreshCw size={18} /> Zoek alternatief</>}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-400">Voorgesteld alternatief</p>
              <p className="text-xl font-black text-white">{suggestion.name}</p>
              <p className="mt-1 text-xs capitalize text-gray-400">{suggestion.muscle_group}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-800 py-2">
                  <p className="font-bold text-white">{suggestion.sets}x{suggestion.reps_min}-{suggestion.reps_max}</p>
                  <p className="text-[10px] text-gray-500">sets x herh.</p>
                </div>
                <div className="rounded-lg bg-red-500/20 py-2">
                  <p className="font-bold text-red-400">{suggestion.weight_kg}kg</p>
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
                <p className="mt-1 text-xs text-red-300">{suggestion.notes}</p>
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
                className="h-12 flex-1 rounded-xl bg-red-500 font-bold text-white active:scale-[0.97] transition-transform"
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

// ── EXERCISE BLOCK (REDESIGNED) ──────────────────────────────────────────────
function ExerciseBlock({ exercise, userId, onAddSet, onRemoveSet, onRemove, onSwap, onOpenPlateCalc, lastUsed }) {
  const [weight, setWeight] = useState(
    exercise.plan?.weight_kg?.toString() || lastUsed?.weight_kg?.toString() || ''
  )
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState(7)
  const [showRpe, setShowRpe] = useState(false)
  const [prevData, setPrevData] = useState(null)
  const [prevLoaded, setPrevLoaded] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Load previous session data
  if (!prevLoaded) {
    setPrevLoaded(true)
    getExerciseHistory(exercise.name, userId).then(data => {
      if (data.length > 0) {
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

  // Build AI target string
  const aiTarget = exercise.plan ? (
    `${exercise.plan.sets}x${exercise.plan.reps_min || exercise.plan.reps_target}${exercise.plan.reps_max && exercise.plan.reps_max !== exercise.plan.reps_min ? `-${exercise.plan.reps_max}` : ''} @ ${exercise.plan.weight_kg}kg`
  ) : null

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 min-w-0 w-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{exercise.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {exercise.muscle_group && (
                <span className="capitalize">{exercise.muscle_group}</span>
              )}
              {aiTarget && (
                <>
                  <span className="text-gray-700">-</span>
                  <span className="text-red-400">Doel: {aiTarget}</span>
                </>
              )}
            </div>
          </div>
          
          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 active:bg-gray-800"
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
                <button
                  onClick={() => { setShowGuide(true); setShowMenu(false) }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white active:bg-gray-700"
                >
                  Uitleg
                </button>
                <button
                  onClick={() => { onSwap(); setShowMenu(false) }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white active:bg-gray-700"
                >
                  Wissel oefening
                </button>
                <button
                  onClick={() => { onRemove(); setShowMenu(false) }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 active:bg-gray-700"
                >
                  Verwijderen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGuide && <ExerciseGuide exercise={exercise} onClose={() => setShowGuide(false)} />}

      {/* Logged sets - compact display */}
      {exercise.sets.length > 0 && (
        <div className="border-b border-gray-800 px-4 py-3">
          <div className="space-y-2">
            {exercise.sets.map((s, i) => (
              <div
                key={s.id}
                onClick={() => onRemoveSet(s.id, { weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe })}
                className="flex items-center justify-between rounded-xl bg-gray-800 px-4 py-3 active:bg-gray-700"
              >
                <div className="flex items-center gap-4">
                  <span className="w-12 text-sm font-medium text-gray-500">Set {i + 1}</span>
                  <span className="text-base font-bold text-white">{s.weight_kg}kg x {s.reps}</span>
                  {s.rpe && (
                    <span className="text-sm text-gray-500">RPE {s.rpe}</span>
                  )}
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                  <Check size={14} className="text-green-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input section */}
      <div className="px-4 py-4">
        {/* Weight input */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Gewicht (kg)</label>
            <button
              type="button"
              onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)}
              className="flex items-center gap-1 text-xs text-red-400 active:text-red-300"
            >
              <Calculator size={12} />
              <span>Plates</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-gray-400 active:bg-gray-700"
            >
              <Minus size={20} />
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="h-12 flex-1 rounded-xl bg-gray-800 px-3 text-center text-xl font-bold text-white outline-none"
            />
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-gray-400 active:bg-gray-700"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Reps input */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Herhalingen</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-gray-400 active:bg-gray-700"
            >
              <Minus size={20} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="0"
              className="h-12 flex-1 rounded-xl bg-gray-800 px-3 text-center text-xl font-bold text-white outline-none"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-gray-400 active:bg-gray-700"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Previous session hint */}
        {prevData && (
          <p className="mb-4 text-center text-sm text-gray-500">
            Vorige keer: {prevData.weight}kg x {prevData.reps}
          </p>
        )}

        {/* RPE toggle */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowRpe(!showRpe)}
            className={`text-sm ${showRpe ? 'font-medium text-red-400' : 'text-gray-600'}`}
          >
            {showRpe ? `RPE ${rpe}` : 'RPE toevoegen'}
          </button>
          {showRpe && (
            <input
              type="range"
              min="6"
              max="10"
              step="0.5"
              value={rpe}
              onChange={(e) => setRpe(parseFloat(e.target.value))}
              className="w-32"
            />
          )}
        </div>

        {/* Add set button */}
        <button
          onClick={handleAdd}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-lg font-bold text-white active:scale-[0.98] transition-transform"
        >
          <Plus size={20} strokeWidth={3} />
          SET LOGGEN
        </button>
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
