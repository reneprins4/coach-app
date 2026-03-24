import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Dumbbell, Sparkles } from 'lucide-react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { fetchExerciseHistories, type ExerciseHistorySet } from '../hooks/useWorkouts'
import { useExercises } from '../hooks/useExercises'
import { useRestTimer } from '../hooks/useRestTimer'
import { useTemplates } from '../hooks/useTemplates'
import { useStartFlow } from '../hooks/useStartFlow'
import { getSettings } from '../lib/settings'
import { isBeginnerMode } from '../lib/beginnerMode'
import { generateFirstWorkout } from '../lib/firstWorkout'
import { detectJunkVolume } from '../lib/junkVolumeDetector'
// calculateMomentum removed from compact header; can be re-added to finish modal
// import { calculateMomentum } from '../lib/momentumCalculator'
import { getCurrentBlock } from '../lib/periodization'
import { useAuthContext } from '../App'
import { supabase } from '../lib/supabase'
import { motion } from 'motion/react'
import PageTransition from '../components/PageTransition'
import ExercisePicker from '../components/ExercisePicker'
// RestTimerBar kept as fallback when useFocusMode is false
// import RestTimerBar from '../components/RestTimerBar'
import CompactRestTimer from '../components/CompactRestTimer'
import FocusMode from '../components/workout/FocusMode'
import FinishModal from '../components/FinishModal'
import Toast from '../components/Toast'
import PlateCalculator from '../components/PlateCalculator'
// TemplateLibrary imported via StartFlowView
import SupersetModal from '../components/SupersetModal'
import JunkVolumeAlert from '../components/JunkVolumeAlert'
// MomentumIndicator removed from compact header; can be re-added to finish modal
// import MomentumIndicator from '../components/MomentumIndicator'
import ExerciseBlock from '../components/workout/ExerciseBlock'
import SwapModal from '../components/workout/SwapModal'
import WorkoutMenu from '../components/workout/WorkoutMenu'
import StartFlowView, { formatDateForStartFlow } from '../components/workout/StartFlowView'
import { WorkoutReview } from '../components/workout/WorkoutReview'
import { logError } from '../lib/logger'
import { hapticFeedback } from '../lib/native'
import type {
  ActiveExercise,
  AIExercise,
  FinishModalResult,
  JunkVolumeWarning,
  SupersetModeState,
  SupersetGroup,
  LastWorkoutPreview,
  SubstituteExercise,
  UserSettings,
} from '../types'

// ---- Helpers ----

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// formatVolume removed from compact header; kept for potential future use
// function formatVolume(kg: number): string {
//   if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
//   return `${Math.round(kg)}kg`
// }

function getWorkoutType(exercises: ActiveExercise[]): string {
  if (!exercises || exercises.length === 0) return 'Workout'
  const muscles = exercises.map(e => e.muscle_group?.toLowerCase()).filter(Boolean) as string[]
  const uniqueMuscles = [...new Set(muscles)]
  if (uniqueMuscles.length === 0) return 'Workout'

  const hasChest = uniqueMuscles.some(m => m.includes('chest') || m.includes('borst'))
  const hasBack = uniqueMuscles.some(m => m.includes('back') || m.includes('rug'))
  const hasShoulders = uniqueMuscles.some(m => m.includes('shoulder') || m.includes('schouder'))
  const hasLegs = uniqueMuscles.some(m => m.includes('leg') || m.includes('quad') || m.includes('hamstring') || m.includes('glute') || m.includes('been'))
  const hasArms = uniqueMuscles.some(m => m.includes('bicep') || m.includes('tricep') || m.includes('arm'))

  if (hasChest && (hasShoulders || hasArms) && !hasBack && !hasLegs) return 'Push Day'
  if (hasBack && !hasChest && !hasLegs) return 'Pull Day'
  if (hasLegs && !hasChest && !hasBack) return 'Leg Day'
  if (hasChest && hasBack) return 'Upper Body'
  if (uniqueMuscles.length === 1) return uniqueMuscles[0]!.charAt(0).toUpperCase() + uniqueMuscles[0]!.slice(1)
  return 'Full Body'
}

function calcAdaptiveRest(exerciseName: string, data: { rpe?: number | null }, planRestSeconds: number | null = null): number {
  const base = planRestSeconds || (getSettings() as UserSettings).restTime || 90
  let duration = base
  const rpe = data.rpe || 7
  if (rpe >= 9) duration = Math.max(base, 180)
  else if (rpe >= 8) duration = Math.max(base, 150)
  else if (rpe <= 6) duration = Math.min(base, 75)
  const compound = /squat|deadlift|press|row|pull.up|chin.up|bench|overhead/i.test(exerciseName)
  if (compound && rpe >= 8) duration = Math.max(duration, 180)
  if (planRestSeconds && duration > planRestSeconds * 1.5) {
    duration = Math.round(planRestSeconds * 1.5)
  }
  return duration
}

// ---- SupersetGroupBlock (kept inline since it's tightly coupled) ----

interface SupersetGroupBlockProps {
  group: SupersetGroup
  groupIndex: number
  allExercises: ActiveExercise[]
  userId: string | undefined
  onAddSet: (exerciseName: string, data: { weight_kg: number; reps: number; rpe: number | null }) => void
  onRemoveSet: (exerciseName: string, id: string, setData: { weight_kg: number; reps: number; rpe: number | null }) => void
  onRemove: (exerciseName: string) => void
  onSwap: (exercise: ActiveExercise) => void
  onOpenPlateCalc: (weight: number) => void
  getLastUsed: (name: string) => { weight_kg: number; reps: number } | null
  junkWarning: JunkVolumeWarning | null
  onClearJunkWarning: () => void
  exerciseHistoryMap: Map<string, ExerciseHistorySet[]>
  beginnerMode?: boolean
}

function SupersetGroupBlock({
  group, groupIndex, allExercises, userId, onAddSet, onRemoveSet,
  onRemove, onSwap, onOpenPlateCalc, getLastUsed, junkWarning, onClearJunkWarning,
  exerciseHistoryMap, beginnerMode,
}: SupersetGroupBlockProps) {
  const { t } = useTranslation()
  const exerciseData = group.exercises.map(ex =>
    allExercises.find(e => e.name === ex.name) || (ex as ActiveExercise)
  )
  const hasWarning = (exerciseName: string) => junkWarning && junkWarning.exercise === exerciseName

  if (group.type === 'superset') {
    return (
      <div className="rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5 p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Sparkles size={14} className="text-cyan-500" />
          <span className="label-caps text-cyan-400">
            {t('logger.superset_active')} {groupIndex + 1}
          </span>
          <span className="text-xs text-gray-500">- {group.pairReason}</span>
        </div>

        <div className="mb-2">
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">A</span>
            <span className="text-xs text-gray-400">{t('logger.no_rest')}</span>
          </div>
          <ExerciseBlock
            exercise={exerciseData[0]!}
            userId={userId}
            onAddSet={(data) => onAddSet(exerciseData[0]!.name, data)}
            onRemoveSet={(id, setData) => onRemoveSet(exerciseData[0]!.name, id, setData)}
            onRemove={() => onRemove(exerciseData[0]!.name)}
            onSwap={() => onSwap(exerciseData[0]!)}
            onOpenPlateCalc={onOpenPlateCalc}
            lastUsed={getLastUsed(exerciseData[0]!.name)}
            prefetchedHistory={exerciseHistoryMap.get(exerciseData[0]!.name) || null}
            beginnerMode={beginnerMode}
            compact
          />
          {hasWarning(exerciseData[0]!.name) && (
            <div className="mt-2">
              <JunkVolumeAlert warning={junkWarning!} onDismiss={onClearJunkWarning} />
            </div>
          )}
        </div>

        <div className="my-2 flex items-center justify-center">
          <div className="h-6 w-px bg-cyan-500/30"></div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">B</span>
            <span className="text-xs text-gray-400">{group.restAfter}s {t('logger.rest_after')}</span>
          </div>
          <ExerciseBlock
            exercise={exerciseData[1]!}
            userId={userId}
            onAddSet={(data) => onAddSet(exerciseData[1]!.name, data)}
            onRemoveSet={(id, setData) => onRemoveSet(exerciseData[1]!.name, id, setData)}
            onRemove={() => onRemove(exerciseData[1]!.name)}
            onSwap={() => onSwap(exerciseData[1]!)}
            onOpenPlateCalc={onOpenPlateCalc}
            lastUsed={getLastUsed(exerciseData[1]!.name)}
            prefetchedHistory={exerciseHistoryMap.get(exerciseData[1]!.name) || null}
            beginnerMode={beginnerMode}
            compact
          />
          {hasWarning(exerciseData[1]!.name) && (
            <div className="mt-2">
              <JunkVolumeAlert warning={junkWarning!} onDismiss={onClearJunkWarning} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <ExerciseBlock
        exercise={exerciseData[0]!}
        userId={userId}
        onAddSet={(data) => onAddSet(exerciseData[0]!.name, data)}
        onRemoveSet={(id, setData) => onRemoveSet(exerciseData[0]!.name, id, setData)}
        onRemove={() => onRemove(exerciseData[0]!.name)}
        onSwap={() => onSwap(exerciseData[0]!)}
        onOpenPlateCalc={onOpenPlateCalc}
        lastUsed={getLastUsed(exerciseData[0]!.name)}
        prefetchedHistory={exerciseHistoryMap.get(exerciseData[0]!.name) || null}
        beginnerMode={beginnerMode}
      />
      {hasWarning(exerciseData[0]!.name) && (
        <div className="mt-2">
          <JunkVolumeAlert warning={junkWarning!} onDismiss={onClearJunkWarning} />
        </div>
      )}
    </div>
  )
}

// ---- Main Logger Component ----

export default function Logger() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { user } = useAuthContext()
  const aw = useActiveWorkout(user?.id)
  const { exercises } = useExercises()
  const rest = useRestTimer()
  const templates = useTemplates(user?.id)
  const settings = getSettings() as UserSettings
  const beginnerModeActive = isBeginnerMode(settings.experienceLevel)

  const startFlow = useStartFlow({ userId: user?.id, isActive: aw.isActive })

  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [finishResult, setFinishResult] = useState<FinishModalResult | null>(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showConfirmFinish, setShowConfirmFinish] = useState(false)
  const [swapTarget, setSwapTarget] = useState<ActiveExercise | null>(null)
  const [toast, setToast] = useState<{ message: string; action?: string; onAction?: () => void } | null>(null)
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSupersetModal, setShowSupersetModal] = useState(false)
  const [lastWorkout, setLastWorkout] = useState<LastWorkoutPreview | null>(null)
  const [workoutCount, setWorkoutCount] = useState<number | undefined>(undefined)
  const [supersetMode, setSupersetMode] = useState<SupersetModeState | null>(null)
  const [junkWarning, setJunkWarning] = useState<JunkVolumeWarning | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState<Map<string, ExerciseHistorySet[]>>(new Map())

  // Batch-fetch exercise histories for all exercises in the active workout
  const exerciseNames = useMemo(
    () => (aw.workout?.exercises || []).map((e: ActiveExercise) => e.name),
    [aw.workout?.exercises]
  )
  useEffect(() => {
    if (!user?.id || !aw.isActive || exerciseNames.length === 0) return
    let cancelled = false
    fetchExerciseHistories(exerciseNames, user.id).then((map) => {
      if (!cancelled) setExerciseHistoryMap(map)
    })
    return () => { cancelled = true }
  }, [user?.id, aw.isActive, exerciseNames.join(',')])

  const [loggerBlock, setLoggerBlock] = useState<import('../types').TrainingBlock | null>(getCurrentBlock())
  useEffect(() => {
    let cancelled = false
    import('../lib/periodization').then(({ loadBlock: lb }) => {
      lb(user?.id ?? null).then(b => { if (!cancelled) setLoggerBlock(b) })
    })
    return () => { cancelled = true }
  }, [user?.id])
  // Momentum + isDeload removed from compact header; can be re-added to finish modal
  // const isDeload = useMemo(() => {
  //   const weekTarget = getCurrentWeekTarget(loggerBlock)
  //   return weekTarget?.isDeload ?? false
  // }, [loggerBlock])
  // const momentum = useMemo(() => aw.workout ? calculateMomentum(aw.workout, { isDeload }) : null, [aw.workout, isDeload])

  // Enrich workout exercises with image URLs from exercise library
  const enrichedWorkout = useMemo(() => {
    if (!aw.workout) return null
    const imageMap = new Map(exercises.map(e => [e.name.toLowerCase(), { image_url_0: e.image_url_0, image_url_1: e.image_url_1 }]))
    return {
      ...aw.workout,
      exercises: aw.workout.exercises.map((ex: ActiveExercise) => {
        if (ex.image_url_0) return ex // already has images
        const images = imageMap.get(ex.name.toLowerCase())
        if (images?.image_url_0) return { ...ex, ...images }
        return ex
      })
    }
  }, [aw.workout, exercises])

  // Load pending workout from localStorage (from AICoach accept)
  useEffect(() => {
    const raw = localStorage.getItem('coach-pending-workout')
    if (raw && !aw.isActive) {
      try {
        const plan = JSON.parse(raw)
        aw.startWorkout(plan)
      } catch (err) { logError('Logger.loadPendingWorkout', err) }
      localStorage.removeItem('coach-pending-workout')
    }
  }, [aw.isActive])

  // Load last workout for "repeat" feature
  useEffect(() => {
    if (!user?.id || aw.isActive) return
    async function loadLastWorkout() {
      try {
        const { data } = await supabase
          .from('workouts')
          .select('id, created_at, sets(exercise)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        const rawSets = (data as Record<string, unknown>)?.sets || (data as Record<string, unknown>)?.workout_sets || []
        const setsArray = rawSets as Array<{ exercise: string }>
        if (setsArray.length > 0) {
          const exerciseNames = [...new Set(setsArray.map(s => s.exercise))]
          const preview = exerciseNames.slice(0, 3).join(', ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3}` : '')
          setLastWorkout({
            preview,
            exercises: exerciseNames.map(name => ({ name, sets: [], plan: null })) as ActiveExercise[],
          })
        }
      } catch (err) { logError('Logger.loadLastWorkout', err) }
    }
    async function loadWorkoutCount() {
      try {
        const { count } = await supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
        setWorkoutCount(count ?? 0)
      } catch (err) { logError('Logger.loadWorkoutCount', err) }
    }
    loadLastWorkout()
    loadWorkoutCount()
  }, [user?.id, aw.isActive])

  const handleRepeatLastWorkout = useCallback(() => {
    if (!lastWorkout?.exercises) return
    aw.startWorkout(lastWorkout.exercises)
  }, [lastWorkout, aw])

  const handleStartFirstWorkout = useCallback(() => {
    const workout = generateFirstWorkout(settings)
    const exercises = workout.exercises.map(ex => ({
      name: ex.name,
      sets: [],
      plan: ex,
    })) as ActiveExercise[]
    aw.startWorkout(exercises)
  }, [settings, aw])

  const handleFinishClick = useCallback(() => {
    setShowConfirmFinish(true)
  }, [])

  const handleFinish = useCallback(async () => {
    setShowConfirmFinish(false)
    const result = await aw.finishWorkout()
    if (result) {
      hapticFeedback('medium')
      setFinishResult(result as unknown as FinishModalResult)
      setShowFinish(true)
    }
  }, [aw])

  const handleRemoveSet = useCallback((exerciseName: string, setId: string, setData: { weight_kg: number; reps: number; rpe: number | null }) => {
    aw.removeSet(exerciseName, setId)
    setToast({
      message: t('logger.set_removed'),
      action: t('logger.undo'),
      onAction: () => {
        aw.addSet(exerciseName, setData)
      },
    })
  }, [aw, t])

  const handleFinishClose = useCallback(() => {
    setShowFinish(false)
    setFinishResult(null)
    nav('/')
  }, [nav])

  const handleLoadTemplate = useCallback((template: { id: string; name: string }) => {
    const exerciseList = templates.loadTemplate(template as Parameters<typeof templates.loadTemplate>[0])
    aw.startWorkout(exerciseList)
    setShowTemplates(false)
    setToast({ message: `${t('logger.template_loaded')}: "${template.name}"` })
  }, [templates, aw, t])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    try {
      await templates.deleteTemplate(id)
      setToast({ message: t('logger.template_deleted') })
    } catch {
      setToast({ message: t('logger.template_delete_error') })
    }
  }, [templates, t])

  const handleApplySupersets = useCallback((
    _reorderedExercises: ActiveExercise[],
    supersets: SupersetGroup[]
  ) => {
    setSupersetMode({ supersets, active: true })
    setShowSupersetModal(false)
    setToast({ message: t('logger.superset_mode_active') })
  }, [t])

  const handleExitSupersetMode = useCallback(() => {
    setSupersetMode(null)
    setToast({ message: t('logger.superset_exit') })
  }, [t])

  const handleAddSet = useCallback((exerciseName: string, data: { weight_kg: number; reps: number; rpe: number | null }) => {
    aw.addSet(exerciseName, data)
    const exercise = aw.workout?.exercises.find((e: ActiveExercise) => e.name === exerciseName)
    const planRest = exercise?.plan?.rest_seconds || null
    const adaptiveRest = calcAdaptiveRest(exerciseName, data, planRest)
    rest.start(adaptiveRest)

    if (exercise) {
      const updatedSets = [...exercise.sets, { ...data, id: 'temp' }]
      const warning = detectJunkVolume(exerciseName, updatedSets)
      if (warning) {
        setJunkWarning(warning)
      }
    }
  }, [aw, rest])

  const handleClearJunkWarning = useCallback(() => {
    setJunkWarning(null)
  }, [])

  const handleStartAIWorkout = useCallback(() => {
    if (!startFlow.state.generatedWorkout) return
    // Start immediately (skip review for speed)
    startFlow.clearSessionCache()
    try {
      localStorage.setItem('coach-pending-workout', JSON.stringify(startFlow.state.generatedWorkout))
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Failed to save pending workout:', e)
    }
    aw.startWorkout(startFlow.state.generatedWorkout)
    localStorage.removeItem('coach-pending-workout')
  }, [startFlow, aw])

  const handleShowReview = useCallback(() => {
    if (!startFlow.state.generatedWorkout) return
    setShowReview(true)
  }, [startFlow.state.generatedWorkout])

  const handleReviewStart = useCallback(() => {
    if (!startFlow.state.generatedWorkout) return
    startFlow.clearSessionCache()
    try {
      localStorage.setItem('coach-pending-workout', JSON.stringify(startFlow.state.generatedWorkout))
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Failed to save pending workout:', e)
    }
    const plan = startFlow.state.generatedWorkout
    aw.startWorkout(plan)
    localStorage.removeItem('coach-pending-workout')
    setShowReview(false)
  }, [startFlow, aw])

  const handleReviewBack = useCallback(() => {
    setShowReview(false)
  }, [])

  const handleReviewSwap = useCallback((index: number, newExercise: AIExercise) => {
    if (!startFlow.state.aiResponse) return
    // Update the AI response exercises
    const updatedExercises = [...startFlow.state.aiResponse.exercises]
    updatedExercises[index] = newExercise
    const updatedResponse = { ...startFlow.state.aiResponse, exercises: updatedExercises }
    // Also update the generatedWorkout (ActiveExercise[])
    const updatedPlan = updatedExercises.map(ex => ({
      name: ex.name,
      muscle_group: ex.muscle_group,
      sets: [],
      plan: {
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        weight_kg: ex.weight_kg,
        rpe_target: ex.rpe_target,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      },
    }))
    startFlow.dispatch({
      type: 'GENERATION_COMPLETE',
      payload: {
        generatedWorkout: updatedPlan,
        estimatedDuration: updatedResponse.estimated_duration_min,
        exerciseCount: updatedExercises.length,
        aiResponse: updatedResponse,
      },
    })
  }, [startFlow])

  // FinishModal must render before the isActive check
  if (showFinish && finishResult) {
    return (
      <FinishModal
        result={finishResult}
        onClose={handleFinishClose}
        onSaveTemplate={async (name: string) => {
          await templates.saveTemplate(name, finishResult.exercises as unknown as ActiveExercise[])
        }}
      />
    )
  }

  // ---- Workout Review Screen ----
  if (!aw.isActive && showReview && startFlow.state.aiResponse) {
    return (
      <WorkoutReview
        workout={startFlow.state.aiResponse}
        split={startFlow.state.selectedSplit || startFlow.state.aiResponse.split || 'Workout'}
        estimatedDuration={startFlow.state.estimatedDuration || startFlow.state.aiResponse.estimated_duration_min || 60}
        onStart={handleReviewStart}
        onBack={handleReviewBack}
        onSwapExercise={handleReviewSwap}
      />
    )
  }

  // ---- Pre-workout Start Flow ----
  if (!aw.isActive) {
    const formattedDate = formatDateForStartFlow(i18n.language)

    return (
      <PageTransition>
        <StartFlowView
          state={startFlow.state}
          user={user}
          formattedDate={formattedDate}
          block={loggerBlock}
          lastWorkout={lastWorkout}
          templates={templates}
          showTemplates={showTemplates}
          toast={toast}
          onStartWorkout={() => aw.startWorkout()}
          onStartEmpty={() => aw.startWorkout()}
          onStartAIWorkout={handleStartAIWorkout}
          onRepeatLastWorkout={handleRepeatLastWorkout}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onSetShowTemplates={setShowTemplates}
          onSetToast={setToast}
          onTimeChange={startFlow.handleTimeChange}
          onGenerateForSplit={startFlow.generateForSplit}
          onToggleSplitPicker={(show) => startFlow.dispatch({ type: 'TOGGLE_SPLIT_PICKER', payload: { show } })}
          onEnergyChange={(energy) => startFlow.dispatch({ type: 'SET_ENERGY', payload: { energy } })}
          onFocusedMusclesChange={(muscles) => startFlow.dispatch({ type: 'SET_FOCUSED_MUSCLES', payload: { focusedMuscles: muscles } })}
          onShowReview={startFlow.state.generatedWorkout ? handleShowReview : undefined}
          workoutCount={workoutCount}
          onStartFirstWorkout={handleStartFirstWorkout}
        />
      </PageTransition>
    )
  }

  // ---- Active Workout View ----
  // At this point aw.isActive is true, so workout is always non-null
  const workout = enrichedWorkout || aw.workout!
  const workoutType = getWorkoutType(workout.exercises)

  // Use FocusMode if available, fallback to list view
  const useFocusMode = true // Toggle for gradual rollout

  // Exercise list rendered as children (used by both FocusMode pass-through and fallback)
  const exerciseListContent = (
    <>
      {supersetMode ? (
        supersetMode.supersets.map((group, groupIdx) => (
          <SupersetGroupBlock
            key={groupIdx}
            group={group}
            groupIndex={groupIdx}
            allExercises={workout.exercises}
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
            exerciseHistoryMap={exerciseHistoryMap}
            beginnerMode={beginnerModeActive}
          />
        ))
      ) : (
        workout.exercises.map((exercise: ActiveExercise, index: number) => (
          <motion.div
            key={exercise.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
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
              prefetchedHistory={exerciseHistoryMap.get(exercise.name) || null}
              beginnerMode={beginnerModeActive}
            />
            {junkWarning && junkWarning.exercise === exercise.name && (
              <div className="mt-2">
                <JunkVolumeAlert
                  warning={junkWarning}
                  onDismiss={handleClearJunkWarning}
                />
              </div>
            )}
          </motion.div>
        ))
      )}

      {workout.exercises.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Dumbbell size={48} className="mb-4 text-gray-700" />
          <p className="text-gray-500">{t('logger.add_exercise_hint')}</p>
        </div>
      )}
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 pb-28">
      {/* Compact Sticky Header - single row */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 bg-[var(--bg-base)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)]" data-testid="compact-header">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-black text-white truncate">{workoutType}</h1>
          <span className="label-caps tabular text-cyan-500" aria-live="off" aria-label={`${t('finish_modal.minutes') || 'Duration'}: ${formatTime(aw.elapsed)}`}>{formatTime(aw.elapsed)}</span>
          <span className="text-xs text-[var(--text-3)]">{'\u00B7'}</span>
          <span className="label-caps whitespace-nowrap">{aw.totalSets} sets</span>
        </div>
        <div className="flex items-center gap-2">
          {supersetMode && (
            <button
              onClick={handleExitSupersetMode}
              className="h-7 rounded-lg bg-cyan-500/20 px-2 text-[10px] font-semibold text-cyan-400 border border-cyan-500/30"
            >
              {t('logger.superset_active')}
            </button>
          )}
          <WorkoutMenu
            canSuperset={workout.exercises.length >= 2 && !supersetMode}
            onSuperset={() => setShowSupersetModal(true)}
            onStop={() => setShowDiscard(true)}
            onTrimWorkout={(targetCount) => {
              aw.trimExercises(targetCount)
              setToast({ message: t('logger.trimmed') })
            }}
          />
          <button
            onClick={handleFinishClick}
            disabled={aw.saving || aw.totalSets === 0}
            className="btn-primary h-9 w-auto px-4 text-xs disabled:opacity-40"
            data-testid="finish-btn"
          >
            {aw.saving ? t('logger.saving') : t('logger.finish')}
          </button>
        </div>
      </header>

      {aw.error && (
        <p className="mx-4 mt-2 rounded-xl bg-cyan-500/5 border border-cyan-500/15 px-3 py-2 text-sm text-cyan-400">{aw.error}</p>
      )}

      {/* Compact Rest Timer - slides in below header */}
      {rest.active && (
        <CompactRestTimer
          remaining={rest.remaining}
          total={rest.total}
          onStop={rest.stop}
          onAddTime={rest.addTime}
        />
      )}

      {/* Exercise content */}
      {useFocusMode ? (
        <div className="flex-1">
          <FocusMode
            exercises={workout.exercises}
            userId={user?.id}
            onAddSet={handleAddSet}
            onRemoveSet={handleRemoveSet}
            onRemove={(exerciseName: string) => {
              aw.removeExercise(exerciseName)
              if (junkWarning?.exercise === exerciseName) setJunkWarning(null)
            }}
            onSwap={(exercise: ActiveExercise) => setSwapTarget(exercise)}
            onOpenPlateCalc={(weight: number) => setPlateCalcWeight(weight)}
            getLastUsed={aw.getLastUsed}
            exerciseHistoryMap={exerciseHistoryMap}
            beginnerMode={beginnerModeActive}
            workoutNotes={workout.notes}
            onUpdateNotes={(notes: string) => aw.updateNotes(notes)}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-4 px-4 py-4">
            {exerciseListContent}

            {/* Notes */}
            <div className="card">
              <label className="mb-2 block label-caps">{t('logger.notes')}</label>
              <textarea
                value={workout.notes}
                onChange={(e) => aw.updateNotes(e.target.value)}
                placeholder={t('logger.notes_placeholder')}
                rows={2}
                className="w-full resize-none bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
            </div>
          </div>

          {/* Add exercise button (fallback, non-FocusMode) */}
          <div className="fixed bottom-28 left-0 right-0 z-30 px-4 pb-4 pb-safe pt-3 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
            <button
              onClick={() => setShowPicker(true)}
              className="btn-secondary h-13"
            >
              <Plus size={18} strokeWidth={2.5} />
              {t('logger.add_exercise')}
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          addedNames={workout.exercises.map((e: ActiveExercise) => e.name)}
          onSelect={(ex) => aw.addExercise(ex as ActiveExercise)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showDiscard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5" onKeyDown={(e) => { if (e.key === 'Escape') setShowDiscard(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="discard-dialog-title" className="card w-full max-w-sm text-center">
            <h3 id="discard-dialog-title" className="text-title mb-2">{t('logger.stop_confirm')}</h3>
            <p className="mb-6 text-sm text-gray-500">{t('logger.stop_confirm_sub')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="btn-secondary h-12 flex-1 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { aw.discardWorkout(); setShowDiscard(false) }}
                className="btn-primary h-12 flex-1 text-sm"
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
          currentExerciseNames={workout.exercises.map((e: ActiveExercise) => e.name)}
          onAccept={(sub: SubstituteExercise) => {
            aw.replaceExercise(swapTarget.name, {
              name: sub.name,
              muscle_group: sub.muscle_group,
              category: '',
              plan: {
                sets: sub.sets || 3,
                reps_min: sub.reps_min || 8,
                reps_max: sub.reps_max || 12,
                weight_kg: sub.weight_kg || 0,
                rpe_target: sub.rpe_target || 7,
                rest_seconds: sub.rest_seconds || 90,
                notes: sub.notes || '',
              },
            })
            setSwapTarget(null)
          }}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {showConfirmFinish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5" onKeyDown={(e) => { if (e.key === 'Escape') setShowConfirmFinish(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-finish-title" className="card w-full max-w-sm text-center">
            <h3 id="confirm-finish-title" className="text-title mb-2">{t('logger.confirm_finish')}</h3>
            <p className="mb-6 text-sm text-gray-500">{t('logger.confirm_finish_sub')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmFinish(false)} className="btn-secondary h-12 flex-1 text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleFinish} className="btn-primary h-12 flex-1 text-sm">
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
          exercises={workout.exercises as unknown as import('../types').SupersetExerciseInput[]}
          onApply={handleApplySupersets as unknown as import('../types').SupersetModalProps['onApply']}
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
