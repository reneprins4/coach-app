import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, Timer, Check, Sparkles, RefreshCw, Loader2, Dumbbell, CalendarDays, ChevronRight, Calculator, BookOpen, MoreVertical, X } from 'lucide-react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { useExercises } from '../hooks/useExercises'
import { useRestTimer } from '../hooks/useRestTimer'
import { useTemplates } from '../hooks/useTemplates'
import { getExerciseHistory } from '../hooks/useWorkouts'
import { getExerciseSubstitute } from '../lib/anthropic'
import { getSubstituteOptions } from '../lib/exerciseSubstitutes'
import { getSettings } from '../lib/settings'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { detectJunkVolume } from '../lib/junkVolumeDetector'
import { calculateMomentum } from '../lib/momentumCalculator'
import { useAuthContext } from '../App'
import ExercisePicker from '../components/ExercisePicker'
import RestTimerBar from '../components/RestTimerBar'
import FinishModal from '../components/FinishModal'
import ExerciseGuide from '../components/ExerciseGuide'
import Toast from '../components/Toast'
import PlateCalculator from '../components/PlateCalculator'
import TemplateLibrary from '../components/TemplateLibrary'
import SupersetModal from '../components/SupersetModal'
import JunkVolumeAlert from '../components/JunkVolumeAlert'
import MomentumIndicator from '../components/MomentumIndicator'

export default function Logger() {
  const { t } = useTranslation()
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
  const [showSupersetModal, setShowSupersetModal] = useState(false)
  const [supersetMode, setSupersetMode] = useState(null) // { supersets: [...], active: true }
  const [junkWarning, setJunkWarning] = useState(null) // { exercise, message, severity, ... }

  // Bereken momentum real-time op basis van alle sets in de sessie
  const momentum = useMemo(() => calculateMomentum(aw.workout), [aw.workout])

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
      message: t('logger.set_removed'),
      action: t('logger.undo'),
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
    setToast({ message: `${t('logger.template_loaded')}: "${template.name}"` })
  }

  async function handleDeleteTemplate(id) {
    try {
      await templates.deleteTemplate(id)
      setToast({ message: t('logger.template_deleted') })
    } catch (err) {
      setToast({ message: t('logger.template_delete_error') })
    }
  }

  function handleApplySupersets(reorderedExercises, supersets) {
    // Update workout exercises in superset order
    // Note: We'll track superset groups visually, not reorder the actual state
    setSupersetMode({ supersets, active: true })
    setShowSupersetModal(false)
    setToast({ message: t('logger.superset_mode_active') })
  }

  function handleExitSupersetMode() {
    setSupersetMode(null)
    setToast({ message: t('logger.superset_exit') })
  }

  // Bereken adaptieve rusttijd op basis van RPE, oefening type en vermoeidheid
  // Als planRestSeconds is meegegeven (AI-gegenereerd), gebruik dat als basis
  function calcAdaptiveRest(exerciseName, data, planRestSeconds = null) {
    const base = planRestSeconds || getSettings().restTime || 90
    let duration = base
    const rpe = data.rpe || 7

    // RPE-gebaseerde aanpassing
    if (rpe >= 9)      duration = Math.max(base, 180) // zware set: min 3 min
    else if (rpe >= 8) duration = Math.max(base, 150) // RPE 8: min 2.5 min
    else if (rpe <= 6) duration = Math.min(base, 75)  // lichte set: max 75s

    // Compound oefeningen hebben meer rust nodig
    const compound = /squat|deadlift|press|row|pull.up|chin.up|bench|overhead/i.test(exerciseName)
    if (compound && rpe >= 8) duration = Math.max(duration, 180)

    // Cap RPE-override at plan value × 1.5 if plan was provided
    if (planRestSeconds && duration > planRestSeconds * 1.5) {
      duration = Math.round(planRestSeconds * 1.5)
    }

    return duration
  }

  // Wrapper voor addSet die ook junk volume detecteert
  function handleAddSet(exerciseName, data) {
    aw.addSet(exerciseName, data)
    // Use AI plan rest_seconds as base if available
    const exercise = aw.workout?.exercises.find(e => e.name === exerciseName)
    const planRest = exercise?.plan?.rest_seconds || null
    const adaptiveRest = calcAdaptiveRest(exerciseName, data, planRest)
    rest.start(adaptiveRest)

    // Check junk volume na het toevoegen van de set
    // We moeten de nieuwe set meenemen in de check
    if (exercise) {
      const updatedSets = [...exercise.sets, { ...data, id: 'temp' }]
      const warning = detectJunkVolume(exerciseName, updatedSets)
      if (warning) {
        setJunkWarning(warning)
      }
    }
  }

  // Clear junk warning wanneer exercise wisselt
  function handleClearJunkWarning() {
    setJunkWarning(null)
  }

  // ── Quick Setup state (vrije training configurator) ─────────────────────────
  const [quickSetup, setQuickSetup] = useState({ show: false, muscles: [], duration: 45 })

  const MUSCLE_LABELS = {
    chest: 'Borst', back: 'Rug', shoulders: 'Schouders',
    legs: 'Benen', arms: 'Armen', core: 'Core',
  }
  const ALL_MUSCLES = Object.keys(MUSCLE_LABELS)
  const DURATIONS = [30, 45, 60, 90]

  function toggleMuscle(m) {
    setQuickSetup(prev => ({
      ...prev,
      muscles: prev.muscles.includes(m) ? prev.muscles.filter(x => x !== m) : [...prev.muscles, m],
    }))
  }

  function buildQuickWorkout(selectedMuscles, durationMin) {
    const exPerMuscle   = durationMin <= 30 ? 1 : durationMin <= 60 ? 2 : 3
    const setsPerEx     = durationMin <= 30 ? 3 : durationMin <= 60 ? 3 : 4
    const targetMuscles = selectedMuscles.length > 0 ? selectedMuscles : ALL_MUSCLES.slice(0, 2)
    const result = []

    for (const muscle of targetMuscles) {
      const pool = exercises.filter(e => e.muscle_group === muscle)
      const compounds  = pool.filter(e => e.category === 'compound')
      const isolations = pool.filter(e => e.category === 'isolation')
      const picked = [...compounds.slice(0, Math.ceil(exPerMuscle / 2)), ...isolations.slice(0, Math.floor(exPerMuscle / 2))]
        .slice(0, exPerMuscle)

      for (const ex of picked) {
        result.push({
          name: ex.name,
          muscle_group: ex.muscle_group,
          sets: [],
          plan: { sets: setsPerEx, reps_min: 8, reps_max: 12, weight_kg: null },
        })
      }
    }
    return result
  }

  if (!aw.isActive) {
    const block = getCurrentBlock()
    const phase = block ? PHASES[block.phase] : null
    const today = new Date()
    const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

    return (
      <div className="min-h-[80vh] px-5 py-10">
        {/* Header */}
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">{formattedDate}</p>
        <h1 className="mb-10 text-4xl font-black tracking-tight text-white">{t('logger.train')}</h1>

        {/* Cards */}
        <div className="space-y-3">
          {/* Coach Training - Primary Card */}
          <button
            onClick={() => nav('/coach')}
            className="w-full rounded-2xl bg-cyan-500 p-6 text-left active:scale-[0.98] transition-transform"
          >
            {block && phase && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-900/70">
                {phase.label} · Week {block.currentWeek} van {phase.weeks}
              </p>
            )}
            <p className="text-2xl font-black text-white">{t('logger.coach_training')}</p>
            <p className="mt-1 text-sm font-medium text-cyan-900/70">{t('logger.coach_training_sub')}</p>
          </button>

          {/* Vrije Training Card */}
          <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            {/* Card header — altijd zichtbaar */}
            <button
              onClick={() => setQuickSetup(prev => ({ ...prev, show: !prev.show, muscles: [], duration: 45 }))}
              className="w-full p-6 text-left flex items-center justify-between active:bg-gray-800/80 transition-colors"
            >
              <div>
                <p className="text-xl font-bold text-white">{t('logger.free_training')}</p>
                <p className="mt-1 text-sm text-gray-500">{t('logger.free_training_sub')}</p>
              </div>
              <ChevronRight
                size={18}
                className={`text-gray-600 transition-transform duration-200 ${quickSetup.show ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Expanded quick setup */}
            {quickSetup.show && (
              <div className="border-t border-gray-700/50 px-5 pb-5 pt-4 space-y-5">
                {/* Duration */}
                <div>
                  <p className="label-caps mb-2.5">{t('logger.available_time')}</p>
                  <div className="flex gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setQuickSetup(prev => ({ ...prev, duration: d }))}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                          quickSetup.duration === d
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-900 text-gray-400 ring-1 ring-gray-700'
                        }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Muscle groups */}
                <div>
                  <p className="label-caps mb-2.5">{t('logger.muscle_groups')} <span className="text-gray-600 font-normal normal-case">(optioneel)</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_MUSCLES.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleMuscle(m)}
                        className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                          quickSetup.muscles.includes(m)
                            ? 'bg-cyan-500/20 ring-1 ring-cyan-500 text-cyan-400'
                            : 'bg-gray-900 text-gray-400 ring-1 ring-gray-700'
                        }`}
                      >
                        {MUSCLE_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => aw.startWorkout()}
                    className="flex-1 rounded-xl py-3 text-sm font-medium text-gray-400 ring-1 ring-gray-700 active:bg-gray-800"
                  >
                    {t('logger.start_empty')}
                  </button>
                  <button
                    onClick={() => aw.startWorkout(buildQuickWorkout(quickSetup.muscles, quickSetup.duration))}
                    className="flex-[2] rounded-xl bg-white py-3 text-sm font-bold text-black active:bg-gray-100"
                  >
                    {quickSetup.muscles.length > 0
                      ? `Start ${quickSetup.muscles.map(m => MUSCLE_LABELS[m]).join(' + ')}`
                      : t('logger.start_training')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Templates link - compact */}
        {templates.templates.length > 0 && (
          <button
            onClick={() => setShowTemplates(true)}
            className="mt-6 w-full text-center text-sm text-gray-500 active:text-gray-400"
          >
            {t('logger.choose_template')}
          </button>
        )}

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
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black tracking-tight text-white">{workoutType}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="label-caps tabular text-cyan-500">{formatTime(aw.elapsed)}</span>
                <span className="label-caps text-gray-700">·</span>
                <span className="label-caps">{aw.totalSets} sets</span>
                <span className="label-caps text-gray-700">·</span>
                <span className="label-caps">{formatVolume(aw.totalVolume)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {supersetMode && (
                <button
                  onClick={handleExitSupersetMode}
                  className="h-8 rounded-lg bg-cyan-500/20 px-2.5 text-xs font-semibold text-cyan-400 ring-1 ring-cyan-500/40"
                >
                  {t('logger.superset_active')}
                </button>
              )}
              <WorkoutMenu
                canSuperset={aw.workout.exercises.length >= 2 && !supersetMode}
                onSuperset={() => setShowSupersetModal(true)}
                onStop={() => setShowDiscard(true)}
              />
              <button
                onClick={handleFinishClick}
                disabled={aw.saving || aw.totalSets === 0}
                className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.97] transition-transform"
              >
                {aw.saving ? t('logger.saving') : t('logger.finish')}
              </button>
            </div>
          </div>
        </div>
        {aw.error && (
          <p className="mx-4 mb-3 rounded-lg bg-cyan-900/30 px-3 py-2 text-sm text-cyan-400">{aw.error}</p>
        )}
        {momentum && (
          <div className="px-4 pb-3">
            <MomentumIndicator momentum={momentum} />
          </div>
        )}
      </header>

      {/* Rest timer */}
      {rest.active && <RestTimerBar remaining={rest.remaining} total={rest.total} onStop={rest.stop} />}

      {/* Exercise list */}
      <div className="flex-1 space-y-4 px-4 py-4">
        {supersetMode ? (
          // Render exercises grouped by superset
          supersetMode.supersets.map((group, groupIdx) => (
            <SupersetGroupBlock
              key={groupIdx}
              group={group}
              groupIndex={groupIdx}
              allExercises={aw.workout.exercises}
              userId={user?.id}
              onAddSet={(exerciseName, data) => handleAddSet(exerciseName, data)}
              onRemoveSet={(exerciseName, id, setData) => handleRemoveSet(exerciseName, id, setData)}
              onRemove={(exerciseName) => {
                aw.removeExercise(exerciseName)
                if (junkWarning?.exercise === exerciseName) setJunkWarning(null)
              }}
              onSwap={(exercise) => setSwapTarget(exercise)}
              onOpenPlateCalc={(weight) => setPlateCalcWeight(weight)}
              getLastUsed={aw.getLastUsed}
              junkWarning={junkWarning}
              onClearJunkWarning={handleClearJunkWarning}
            />
          ))
        ) : (
          // Normal rendering
          aw.workout.exercises.map(exercise => (
            <div key={exercise.name}>
              <ExerciseBlock
                exercise={exercise}
                userId={user?.id}
                onAddSet={(data) => handleAddSet(exercise.name, data)}
                onRemoveSet={(id, setData) => handleRemoveSet(exercise.name, id, setData)}
                onRemove={() => {
                  aw.removeExercise(exercise.name)
                  if (junkWarning?.exercise === exercise.name) setJunkWarning(null)
                }}
                onSwap={() => setSwapTarget(exercise)}
                onOpenPlateCalc={(weight) => setPlateCalcWeight(weight)}
                lastUsed={aw.getLastUsed(exercise.name)}
              />
              {/* Junk Volume Alert voor deze oefening */}
              {junkWarning && junkWarning.exercise === exercise.name && (
                <div className="mt-2">
                  <JunkVolumeAlert
                    warning={junkWarning}
                    onDismiss={handleClearJunkWarning}
                  />
                </div>
              )}
            </div>
          ))
        )}

        {aw.workout.exercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Dumbbell size={48} className="mb-4 text-gray-700" />
            <p className="text-gray-500">{t('logger.add_exercise_hint')}</p>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <label className="mb-2 block label-caps">{t('logger.notes')}</label>
          <textarea
            value={aw.workout.notes}
            onChange={(e) => aw.updateNotes(e.target.value)}
            placeholder={t('logger.notes_placeholder')}
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
        </div>
      </div>

      {/* Add exercise button */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-4 pt-3 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
        <button
          onClick={() => setShowPicker(true)}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 font-semibold text-white ring-1 ring-gray-700 active:bg-gray-800"
        >
          <Plus size={18} strokeWidth={2.5} />
          {t('logger.add_exercise')}
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">{t('logger.stop_confirm')}</h3>
            <p className="mb-6 text-sm text-gray-400">{t('logger.stop_confirm_sub')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { aw.discardWorkout(); setShowDiscard(false) }}
                className="h-12 flex-1 rounded-xl bg-cyan-600 font-semibold text-white active:bg-cyan-700"
              >
                {t('logger.stop')}
              </button>
            </div>
          </div>
        </div>
      )}

      {swapTarget && (
        <SwapModal
          exercise={swapTarget}
          settings={settings}
          currentExerciseNames={aw.workout.exercises.map(e => e.name)}
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">{t('logger.confirm_finish')}</h3>
            <p className="mb-6 text-sm text-gray-400">{t('logger.confirm_finish_sub')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleFinish}
                className="h-12 flex-1 rounded-xl bg-cyan-500 font-semibold text-white active:bg-cyan-600"
              >
                {t('logger.finish')}
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

      {showSupersetModal && (
        <SupersetModal
          exercises={aw.workout.exercises}
          onApply={handleApplySupersets}
          onClose={() => setShowSupersetModal(false)}
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
function SwapModal({ exercise, settings, currentExerciseNames = [], onAccept, onClose }) {
  const { t } = useTranslation()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Instant suggestions from static DB — no API call, filtered for duplicates
  const options = useMemo(() =>
    getSubstituteOptions({
      exercise,
      equipment: settings.equipment || 'full_gym',
      excludeNames: currentExerciseNames,
      max: 4,
    }),
    [exercise, settings.equipment, currentExerciseNames]
  )

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiError(null)
    try {
      const sub = await getExerciseSubstitute({
        exercise,
        reason: 'want_variety',
        equipment: settings.equipment,
        experienceLevel: settings.experienceLevel,
        bodyweight: settings.bodyweight,
        excludeNames: currentExerciseNames,
      })
      // Check if AI returned something already in the workout
      if (currentExerciseNames.map(n => n.toLowerCase()).includes(sub.name.toLowerCase())) {
        setAiError(t('logger.swap_already_in_workout'))
      } else {
        onAccept(sub)
      }
    } catch (e) {
      setAiError(t('logger.swap_ai_failed'))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label-caps mb-0.5">{t('logger.replacing')}</p>
            <h3 className="text-lg font-black tracking-tight text-white">{exercise.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-500 active:bg-gray-800"><X size={20} /></button>
        </div>

        {options.length > 0 ? (
          <div className="mb-4 space-y-2">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onAccept(opt)}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div>
                  <p className="font-black tracking-tight text-white">{opt.name}</p>
                  <p className="text-xs capitalize text-gray-500">{opt.equipment} · {opt.muscle_group}</p>
                </div>
                {opt.weight_kg > 0 && (
                  <span className="ml-2 shrink-0 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-sm font-bold tabular-nums text-cyan-400">
                    {opt.weight_kg}kg
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">{t('logger.swap_no_options')}</p>
        )}

        <button
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-gray-400 ring-1 ring-gray-700 disabled:opacity-50 active:bg-gray-800"
        >
          {aiLoading
            ? <><Loader2 size={15} className="animate-spin" /> {t('logger.finding_alternative')}</>
            : <><Sparkles size={15} /> {t('logger.ai_suggest')}</>}
        </button>
        {aiError && <p className="mt-2 text-center text-xs text-red-400">{aiError}</p>}

      </div>
    </div>
  )
}

// ── WORKOUT MENU ─────────────────────────────────────────────────────────────
function WorkoutMenu({ canSuperset, onSuperset, onStop }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 ring-1 ring-gray-700 active:bg-gray-900"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
          {canSuperset && (
            <button
              onClick={() => { onSuperset(); setOpen(false) }}
              className="flex w-full flex-col px-4 py-3 text-left active:bg-gray-800"
            >
              <span className="text-sm font-semibold text-white">{t('logger.superset_mode')}</span>
              <span className="text-xs text-gray-500">{t('logger.superset_link')}</span>
            </button>
          )}
          <button
            onClick={() => { onStop(); setOpen(false) }}
            className="flex w-full px-4 py-3 text-left text-sm font-medium text-cyan-400 active:bg-gray-800"
          >
            {t('logger.stop_workout')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── EXERCISE BLOCK (REDESIGNED) ──────────────────────────────────────────────
function ExerciseBlock({ exercise, userId, onAddSet, onRemoveSet, onRemove, onSwap, onOpenPlateCalc, lastUsed, compact }) {
  const { t } = useTranslation()
  const [weight, setWeight] = useState(
    exercise.plan?.weight_kg?.toString() || lastUsed?.weight_kg?.toString() || ''
  )
  const [reps, setReps] = useState(
    exercise.plan?.reps_min?.toString() || lastUsed?.reps?.toString() || ''
  )
  const [rpe, setRpe] = useState(7)
  const [showRpe, setShowRpe] = useState(false)
  const [prevData, setPrevData] = useState(null)
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
  useEffect(() => {
    let cancelled = false
    if (userId && exercise.name) {
      getExerciseHistory(exercise.name, userId).then(data => {
        if (!cancelled && data.length > 0) {
          const latest = data[0]
          setPrevData({ weight: latest.weight_kg, reps: latest.reps })
          // Pre-fill reps van vorige sessie als er nog geen plan-default is
          if (!exercise.plan?.reps_min) {
            setReps(prev => prev || latest.reps?.toString() || '')
          }
          // Pre-fill gewicht ook als dat nog leeg is
          if (!exercise.plan?.weight_kg) {
            setWeight(prev => prev || latest.weight_kg?.toString() || '')
          }
        }
      })
    }
    return () => { cancelled = true }
  }, [exercise.name, userId])

  function handleAdd() {
    const w = parseFloat(weight) || 0
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return
    onAddSet({ weight_kg: w, reps: r, rpe: showRpe ? rpe : null })
    // reps bewaren zodat volgende set direct gelogd kan worden
  }

  function adjustWeight(delta) {
    const current = parseFloat(weight) || 0
    setWeight(String(Math.max(0, current + delta)))
  }

  function adjustReps(delta) {
    const current = parseInt(reps, 10) || 0
    setReps(String(Math.max(0, current + delta)))
  }

  // Build AI target string (including RPE target if available)
  const aiTarget = exercise.plan ? (
    `${exercise.plan.sets}x${exercise.plan.reps_min || exercise.plan.reps_target}${exercise.plan.reps_max && exercise.plan.reps_max !== exercise.plan.reps_min ? `-${exercise.plan.reps_max}` : ''} @ ${exercise.plan.weight_kg}kg${exercise.plan.rpe_target ? ` · RPE ${exercise.plan.rpe_target}` : ''}`
  ) : null

  const plannedSets = exercise.plan?.sets ?? null
  const loggedSets = exercise.sets?.length ?? 0
  const isDone = plannedSets !== null && loggedSets >= plannedSets

  return (
    <div className={`rounded-2xl border min-w-0 w-full transition-colors ${
      isDone
        ? (compact ? 'border-green-500/30 bg-gray-800/50' : 'border-green-500/25 bg-gray-900')
        : (compact ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900')
    }`}>
      {/* Header */}
      <div className={`border-b border-gray-800 px-4 ${compact ? 'py-3' : 'py-4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-black tracking-tight text-white truncate ${compact ? 'text-base' : 'text-xl'}`}>{exercise.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              {exercise.muscle_group && (
                <span className="label-caps">{exercise.muscle_group}</span>
              )}
              {aiTarget && (
                <span className="label-caps text-cyan-500">{aiTarget}</span>
              )}
              {plannedSets !== null && (
                <span className={`label-caps font-bold ${isDone ? 'text-green-400' : 'text-gray-500'}`}>
                  {isDone ? `✓ ${loggedSets}/${plannedSets} sets` : `${loggedSets}/${plannedSets} sets`}
                </span>
              )}
            </div>
          </div>
          
          {/* 3-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 active:text-gray-400"
            >
              <MoreVertical size={18} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900 shadow-2xl">
                <button
                  onClick={() => { setShowGuide(true); setShowMenu(false) }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-gray-800"
                >
                  {t('logger.explain')}
                </button>
                <button
                  onClick={() => { onSwap(); setShowMenu(false) }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-gray-800"
                >
                  {t('logger.swap_exercise')}
                </button>
                <div className="mx-4 border-t border-gray-800" />
                <button
                  onClick={() => { onRemove(); setShowMenu(false) }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-red-400 active:bg-gray-800"
                >
                  {t('logger.remove')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGuide && <ExerciseGuide exercise={exercise} onClose={() => setShowGuide(false)} />}

      {/* Logged sets */}
      {exercise.sets.length > 0 && (
        <div className="border-b border-gray-800 px-4 py-3 space-y-1.5">
          {exercise.sets.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onRemoveSet(s.id, { weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe })}
              className="flex w-full items-center justify-between rounded-xl bg-gray-800/70 px-4 py-2.5 active:bg-gray-700/80"
            >
              <div className="flex items-center gap-3">
                <span className="label-caps w-8 text-right">{i + 1}</span>
                <span className="text-base font-bold tracking-tight text-white tabular">
                  {s.weight_kg}<span className="text-sm font-normal text-gray-500">kg</span>
                  <span className="mx-1.5 text-gray-600">×</span>
                  {s.reps}<span className="text-sm font-normal text-gray-500"> reps</span>
                </span>
                {s.rpe && <span className="label-caps">RPE {s.rpe}</span>}
              </div>
              <Check size={14} className="text-green-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Input section */}
      <div className="px-4 py-4 space-y-4">
        {/* Weight + Reps side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weight */}
          <div>
            <div className="mb-2 flex h-5 items-center justify-between">
              <span className="label-caps">{t('logger.weight')}</span>
              <button
                type="button"
                onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)}
                className="label-caps text-cyan-500 active:text-cyan-400"
              >
                {t('logger.plates')}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700"
              >
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="—"
                className="h-11 min-w-0 flex-1 rounded-xl bg-gray-800 px-2 text-center text-lg font-black tracking-tight text-white tabular outline-none placeholder-gray-700"
              />
              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps */}
          <div>
            <div className="mb-2 flex h-5 items-center">
              <span className="label-caps">{t('logger.reps_label')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="—"
                className="h-11 min-w-0 flex-1 rounded-xl bg-gray-800 px-2 text-center text-lg font-black tracking-tight text-white tabular outline-none placeholder-gray-700"
              />
              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Previous session hint */}
        {prevData && (
          <p className="text-center label-caps">
            {t('logger.previous')}: <span className="text-gray-400">{prevData.weight}kg × {prevData.reps}</span>
          </p>
        )}

        {/* RPE hint for junk volume analysis */}
        {exercise.sets.length >= 3 && !exercise.sets.some(s => s.rpe) && (
          <p className="text-center text-[10px] text-gray-700">{t('logger.rpe_hint')}</p>
        )}

        {/* RPE toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowRpe(!showRpe)}
            className={`label-caps transition-colors ${showRpe ? 'text-cyan-400' : 'text-gray-700 active:text-gray-500'}`}
          >
            {showRpe ? `RPE  ${rpe}` : t('logger.add_rpe')}
          </button>
          {showRpe && (
            <input
              type="range"
              min="6"
              max="10"
              step="0.5"
              value={rpe}
              onChange={(e) => setRpe(parseFloat(e.target.value))}
              className="w-28"
            />
          )}
        </div>

        {/* Done state banner */}
        {isDone ? (
          <div className="flex items-center justify-between rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Check size={15} className="text-green-400 shrink-0" />
              <span className="text-sm font-semibold text-green-400">{t('logger.exercise_done')}</span>
            </div>
            <button
              onClick={handleAdd}
              className="text-xs font-medium text-gray-500 active:text-gray-300"
            >
              {t('logger.extra_set')}
            </button>
          </div>
        ) : (
          <>
            {/* Add set button */}
            <button
              onClick={handleAdd}
              className="btn-primary"
            >
              {t('logger.log_set')}
            </button>

            {/* Skip */}
            <button
              onClick={onRemove}
              className="w-full py-1 text-xs font-medium text-gray-600 active:text-gray-400"
            >
              {t('common.skip')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── SUPERSET GROUP BLOCK ─────────────────────────────────────────────────────
function SupersetGroupBlock({ group, groupIndex, allExercises, userId, onAddSet, onRemoveSet, onRemove, onSwap, onOpenPlateCalc, getLastUsed, junkWarning, onClearJunkWarning }) {
  const { t } = useTranslation()
  // Find actual exercise data from workout
  const exerciseData = group.exercises.map(ex => 
    allExercises.find(e => e.name === ex.name) || ex
  )

  // Check if any exercise in this group has a junk warning
  const hasWarning = (exerciseName) => junkWarning && junkWarning.exercise === exerciseName

  if (group.type === 'superset') {
    return (
      <div className="rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5 p-3">
        {/* Superset header */}
        <div className="mb-3 flex items-center gap-2 px-1">
          <Sparkles size={14} className="text-cyan-500" />
          <span className="label-caps text-cyan-400">
            {t('logger.superset_active')} {groupIndex + 1}
          </span>
          <span className="text-xs text-gray-500">- {group.pairReason}</span>
        </div>
        
        {/* Exercise A */}
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">A</span>
            <span className="text-xs text-gray-400">{t('logger.no_rest')}</span>
          </div>
          <ExerciseBlock
            exercise={exerciseData[0]}
            userId={userId}
            onAddSet={(data) => onAddSet(exerciseData[0].name, data)}
            onRemoveSet={(id, setData) => onRemoveSet(exerciseData[0].name, id, setData)}
            onRemove={() => onRemove(exerciseData[0].name)}
            onSwap={() => onSwap(exerciseData[0])}
            onOpenPlateCalc={onOpenPlateCalc}
            lastUsed={getLastUsed(exerciseData[0].name)}
            compact
          />
          {hasWarning(exerciseData[0].name) && (
            <div className="mt-2">
              <JunkVolumeAlert warning={junkWarning} onDismiss={onClearJunkWarning} />
            </div>
          )}
        </div>
        
        {/* Arrow connector */}
        <div className="my-2 flex items-center justify-center">
          <div className="h-6 w-px bg-cyan-500/30"></div>
        </div>
        
        {/* Exercise B */}
        <div>
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">B</span>
            <span className="text-xs text-gray-400">{group.restAfter}s {t('logger.rest_after')}</span>
          </div>
          <ExerciseBlock
            exercise={exerciseData[1]}
            userId={userId}
            onAddSet={(data) => onAddSet(exerciseData[1].name, data)}
            onRemoveSet={(id, setData) => onRemoveSet(exerciseData[1].name, id, setData)}
            onRemove={() => onRemove(exerciseData[1].name)}
            onSwap={() => onSwap(exerciseData[1])}
            onOpenPlateCalc={onOpenPlateCalc}
            lastUsed={getLastUsed(exerciseData[1].name)}
            compact
          />
          {hasWarning(exerciseData[1].name) && (
            <div className="mt-2">
              <JunkVolumeAlert warning={junkWarning} onDismiss={onClearJunkWarning} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Single exercise (not in superset)
  return (
    <div>
      <ExerciseBlock
        exercise={exerciseData[0]}
        userId={userId}
        onAddSet={(data) => onAddSet(exerciseData[0].name, data)}
        onRemoveSet={(id, setData) => onRemoveSet(exerciseData[0].name, id, setData)}
        onRemove={() => onRemove(exerciseData[0].name)}
        onSwap={() => onSwap(exerciseData[0])}
        onOpenPlateCalc={onOpenPlateCalc}
        lastUsed={getLastUsed(exerciseData[0].name)}
      />
      {hasWarning(exerciseData[0].name) && (
        <div className="mt-2">
          <JunkVolumeAlert warning={junkWarning} onDismiss={onClearJunkWarning} />
        </div>
      )}
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
