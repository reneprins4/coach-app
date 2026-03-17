import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, Timer, Check, Sparkles, RefreshCw, Loader2, Dumbbell, CalendarDays, ChevronRight, Calculator, BookOpen, MoreVertical, X, ChevronDown, Trophy } from 'lucide-react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'
import { useExercises } from '../hooks/useExercises'
import { useRestTimer } from '../hooks/useRestTimer'
import { useTemplates } from '../hooks/useTemplates'
import { getExerciseHistory, fetchRecentHistory } from '../hooks/useWorkouts'
import { getExerciseSubstitute, generateScientificWorkout } from '../lib/anthropic'
import { getSubstituteOptions } from '../lib/exerciseSubstitutes'
import { getSettings, saveSettings } from '../lib/settings'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { detectJunkVolume } from '../lib/junkVolumeDetector'
import { calculateMomentum } from '../lib/momentumCalculator'
import { detectPR } from '../lib/prDetector'
import { isCompound, calculateWarmupSets } from '../lib/warmupCalculator'
import { analyzeTraining, scoreSplits, getRelevantHistory } from '../lib/training-analysis'
import { useAuthContext } from '../App'
import { supabase } from '../lib/supabase'
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

// Session cache key - will be combined with userId for isolation
const SESSION_CACHE_PREFIX = '__kravex_start_flow_cache_'

// Locale map for date formatting
const LOCALE_MAP = { nl: 'nl-NL', en: 'en-GB' }

// Get user-specific cache key
function getSessionCacheKey(userId) {
  return `${SESSION_CACHE_PREFIX}${userId || 'anonymous'}__`
}

export default function Logger() {
  const { t, i18n } = useTranslation()
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
  const [lastWorkout, setLastWorkout] = useState(null)
  const [supersetMode, setSupersetMode] = useState(null) // { supersets: [...], active: true }
  const [junkWarning, setJunkWarning] = useState(null) // { exercise, message, severity, ... }
  const [trainingIntent, setTrainingIntent] = useState(null) // 'strength' | 'volume' | 'technique' | 'recovery'

  // Bereken momentum real-time op basis van alle sets in de sessie
  const momentum = useMemo(() => calculateMomentum(aw.workout), [aw.workout])
  
  // Check if any sets have been logged
  const hasLoggedSets = aw.workout?.exercises?.some(e => e.sets.length > 0) || false

  useEffect(() => {
    const raw = localStorage.getItem('coach-pending-workout')
    if (raw && !aw.isActive) {
      try {
        const plan = JSON.parse(raw)
        aw.startWorkout(plan)
      } catch {}
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
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        const rawSets = data?.sets || data?.workout_sets || []
        if (rawSets.length > 0) {
          const exercises = [...new Set(rawSets.map(s => s.exercise))]
          const preview = exercises.slice(0, 3).join(', ') + (exercises.length > 3 ? ` +${exercises.length - 3}` : '')
          setLastWorkout({
            preview,
            exercises: exercises.map(name => ({ name, sets: [], plan: null }))
          })
        }
      } catch {}
    }
    loadLastWorkout()
  }, [user?.id, aw.isActive])

  const handleRepeatLastWorkout = useCallback(() => {
    if (!lastWorkout?.exercises) return
    aw.startWorkout(lastWorkout.exercises)
  }, [lastWorkout, aw])

  function handleFinishClick() {
    setShowConfirmFinish(true)
  }

  async function handleFinish() {
    setShowConfirmFinish(false)
    const result = await aw.finishWorkout()
    if (result) {
      // Include training intent in finish data
      setFinishResult({ ...result, trainingIntent })
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

  // ── New Workout Start Flow State ─────────────────────────────────────────────
  // Module-level session cache: persists across navigations within the same browser session
  // Prevents re-calling Gemini every time the user navigates back to the Logger tab
  // Key: userId — cache is per-user and cleared when user changes

  const [startFlowState, setStartFlowState] = useState(() => {
    // Initial state - cache will be loaded once user is available via useEffect
    return {
      loading: true,
      generating: false,
      error: null,
      retryCount: 0, // Track failed retry attempts
      muscleStatus: null,
      splits: [],
      recommendedSplit: null,
      selectedSplit: null,
      generatedWorkout: null,
      recoveredMuscles: [],
      showSplitPicker: false,
      estimatedDuration: null,
      exerciseCount: null,
      cachedAt: null,
      availableTime: null, // null = user hasn't selected a time yet; generation blocked until set
    }
  })
  
  // Load session cache when user becomes available
  useEffect(() => {
    if (!user?.id) return
    try {
      const cacheKey = getSessionCacheKey(user.id)
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw)
        // Only use cache if it has a generated workout, matches userId, and isn't stale (< 30 min)
        if (cached.generatedWorkout && cached.cachedAt && cached.userId === user.id && Date.now() - cached.cachedAt < 30 * 60 * 1000) {
          setStartFlowState({ ...cached, loading: false, generating: false, showSplitPicker: false })
        }
      }
    } catch {}
  }, [user?.id])
  const generationIdRef = useRef(0)
  const abortControllerRef = useRef(null)
  const hasWorkoutRef = useRef(false)
  const availableTimeRef = useRef(null)
  
  // Sync ref with state for useEffect guard
  hasWorkoutRef.current = !!startFlowState.generatedWorkout && !startFlowState.error
  availableTimeRef.current = startFlowState.availableTime

  // Background analysis and workout generation on mount
  useEffect(() => {
    if (aw.isActive || !user?.id) return
    // Skip if we already have a valid session-cached workout (use ref for fresh value)
    if (hasWorkoutRef.current) return
    
    let cancelled = false
    
    async function analyzeAndGenerate() {
      try {
        // Step 1: Fetch workout history
        const history = await fetchRecentHistory(user.id, 20)
        
        if (cancelled) return
        
        // Step 2: Analyze training status
        const muscleStatus = analyzeTraining(history)
        const splits = scoreSplits(muscleStatus)
        const recommendedSplit = splits[0]?.name || 'Full Body'
        
        // Find recovered muscles for display
        const recoveredMuscles = Object.entries(muscleStatus)
          .filter(([_, status]) => status.status === 'ready')
          .map(([muscle]) => muscle)
          .slice(0, 3)
        
        if (cancelled) return
        
        setStartFlowState(prev => ({
          ...prev,
          loading: false,
          generating: true,
          muscleStatus,
          splits,
          recommendedSplit,
          selectedSplit: recommendedSplit,
          recoveredMuscles,
        }))
        
        // Step 3: Only generate if user has already selected a time (not null)
        // If no time selected yet, stop here — generation fires when user taps a time chip
        const currentTime = availableTimeRef.current
        if (currentTime === null || currentTime === undefined) {
          setStartFlowState(prev => ({ ...prev, loading: false, generating: false }))
          return
        }
        
        const settings = getSettings()
        const block = getCurrentBlock()
        const recentHistory = getRelevantHistory(history, recommendedSplit)
        
        const preferences = {
          name: settings.name,
          gender: settings.gender,
          bodyweight: settings.bodyweight,
          experienceLevel: settings.experienceLevel,
          equipment: settings.equipment,
          goal: settings.goal,
          frequency: settings.frequency,
          time: settings.time || 60,
          energy: 'medium',
          benchMax: settings.benchMax,
          squatMax: settings.squatMax,
          deadliftMax: settings.deadliftMax,
          focusedMuscles: settings.focusedMuscles,
          priorityMuscles: settings.priorityMuscles,
          trainingGoal: settings.trainingGoal,
          trainingPhase: block?.phase,
          blockWeek: block?.currentWeek,
          blockTotalWeeks: block ? PHASES[block.phase]?.weeks : null,
          isDeload: block?.phase === 'deload',
          targetRPE: block ? getCurrentWeekTarget(block)?.rpe : null,
          targetRepRange: block ? getCurrentWeekTarget(block)?.reps : null,
        }
        
        const result = await generateScientificWorkout({
          muscleStatus,
          recommendedSplit,
          recentHistory,
          preferences,
          userId: user.id,
        })
        
        if (cancelled) return
        
        // Transform AI result to workout format
        const workoutExercises = result.exercises.map(ex => ({
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
        
        const newState = {
          generating: false,
          generatedWorkout: workoutExercises,
          estimatedDuration: result.estimated_duration_min,
          exerciseCount: result.exercises.length,
          cachedAt: Date.now(),
        }
        setStartFlowState(prev => ({ ...prev, ...newState }))
        // Save to sessionStorage so navigating back doesn't re-generate
        // Build cacheData from local variables to avoid stale closure issue
        try {
          const cacheData = {
            loading: false,
            generating: false,
            error: null,
            showSplitPicker: false,
            muscleStatus,
            splits,
            recommendedSplit,
            selectedSplit: recommendedSplit,
            recoveredMuscles,
            userId: user.id, // Store userId for cache isolation
            ...newState,
          }
          sessionStorage.setItem(getSessionCacheKey(user.id), JSON.stringify(cacheData))
        } catch (e) {
          if (import.meta.env.DEV) console.warn('Failed to save session cache:', e)
        }
        
      } catch (err) {
        if (cancelled) return
        if (import.meta.env.DEV) console.error('Workout generation failed:', err)
        setStartFlowState(prev => ({
          ...prev,
          loading: false,
          generating: false,
          error: err.name === 'AbortError' ? null : err.message,
        }))
      }
    }
    
    analyzeAndGenerate()
    
    return () => { cancelled = true }
  }, [user?.id, aw.isActive])

  // Generate workout for a different split
  const generateForSplit = useCallback(async (splitName, overrideTime = null) => {
    if (!user?.id || !startFlowState.muscleStatus) {
      setStartFlowState(prev => ({ ...prev, error: t('logger.analysis_required') }))
      return
    }
    
    // Abort any previous in-flight Gemini request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Increment generation ID to track this specific generation
    const myGenerationId = ++generationIdRef.current
    
    const timeToUse = overrideTime ?? startFlowState.availableTime ?? getSettings().time ?? 60
    
    setStartFlowState(prev => ({
      ...prev,
      selectedSplit: splitName,
      availableTime: timeToUse,
      generating: true,
      generatedWorkout: null,
      error: null,
      showSplitPicker: false,
    }))
    
    try {
      const history = await fetchRecentHistory(user.id, 20)
      
      // Check if a newer generation was started
      if (generationIdRef.current !== myGenerationId) return
      const settings = getSettings()
      const block = getCurrentBlock()
      const recentHistory = getRelevantHistory(history, splitName)
      
      const preferences = {
        name: settings.name,
        gender: settings.gender,
        bodyweight: settings.bodyweight,
        experienceLevel: settings.experienceLevel,
        equipment: settings.equipment,
        goal: settings.goal,
        frequency: settings.frequency,
        time: timeToUse,
        energy: 'medium',
        benchMax: settings.benchMax,
        squatMax: settings.squatMax,
        deadliftMax: settings.deadliftMax,
        focusedMuscles: settings.focusedMuscles,
        priorityMuscles: settings.priorityMuscles,
        trainingGoal: settings.trainingGoal,
        trainingPhase: block?.phase,
        blockWeek: block?.currentWeek,
        blockTotalWeeks: block ? PHASES[block.phase]?.weeks : null,
        isDeload: block?.phase === 'deload',
        targetRPE: block ? getCurrentWeekTarget(block)?.rpe : null,
        targetRepRange: block ? getCurrentWeekTarget(block)?.reps : null,
      }
      
      const result = await generateScientificWorkout({
        muscleStatus: startFlowState.muscleStatus,
        recommendedSplit: splitName,
        recentHistory,
        preferences,
        userId: user.id,
        signal: controller.signal,
      })
      
      // Check if a newer generation was started
      if (generationIdRef.current !== myGenerationId) return
      
      const workoutExercises = result.exercises.map(ex => ({
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
      
      const newState = {
        generating: false,
        generatedWorkout: workoutExercises,
        estimatedDuration: result.estimated_duration_min,
        exerciseCount: result.exercises.length,
        cachedAt: Date.now(),
      }
      
      setStartFlowState(prev => ({ ...prev, ...newState }))
      
      // Save to sessionStorage so split choice persists across navigations
      try {
        const cacheData = {
          loading: false,
          generating: false,
          error: null,
          showSplitPicker: false,
          muscleStatus: startFlowState.muscleStatus,
          splits: startFlowState.splits,
          recommendedSplit: startFlowState.recommendedSplit,
          selectedSplit: splitName,
          recoveredMuscles: startFlowState.recoveredMuscles,
          availableTime: timeToUse,
          userId: user.id, // Store userId for cache isolation
          ...newState,
        }
        sessionStorage.setItem(getSessionCacheKey(user.id), JSON.stringify(cacheData))
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Failed to save session cache:', e)
      }
      
    } catch (err) {
      if (err.name === 'AbortError') return // New request started, silently ignore this one
      if (import.meta.env.DEV) console.error('Workout generation failed:', err)
      const message = err.message === 'SESSION_EXPIRED'
        ? t('auth.session_expired', 'Je sessie is verlopen, log opnieuw in')
        : err.message
      setStartFlowState(prev => ({
        ...prev,
        generating: false,
        error: message,
        retryCount: (prev.retryCount || 0) + 1,
      }))
    }
  }, [user?.id, startFlowState.muscleStatus, startFlowState.splits, startFlowState.recommendedSplit, startFlowState.recoveredMuscles, startFlowState.availableTime, t])

  // Handle time change
  const handleTimeChange = useCallback((newTime) => {
    // Save to settings
    const current = getSettings()
    saveSettings({ ...current, time: newTime })
    // Update state + clear cache (time change = new workout needed)
    setStartFlowState(prev => ({
      ...prev,
      availableTime: newTime,
      generatedWorkout: null,
      exerciseCount: null,
      estimatedDuration: null,
      error: null,
      loading: false,
    }))
    // Clear sessionStorage cache so next generation uses new time
    try {
      const cacheKey = getSessionCacheKey(user?.id)
      sessionStorage.removeItem(cacheKey)
    } catch {}
    // Re-trigger generation with new time
    generateForSplit(startFlowState.selectedSplit || 'Full Body', newTime)
  }, [startFlowState.selectedSplit, generateForSplit, user?.id])

  // Start the AI-generated workout
  const handleStartAIWorkout = useCallback(() => {
    if (!startFlowState.generatedWorkout) return
    // Clear session cache so returning after workout completion triggers fresh generation
    if (user?.id) {
      sessionStorage.removeItem(getSessionCacheKey(user.id))
    }
    try {
      localStorage.setItem('coach-pending-workout', JSON.stringify(startFlowState.generatedWorkout))
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Failed to save pending workout to localStorage:', e)
    }
    // Trigger the existing useEffect that handles coach-pending-workout
    const plan = startFlowState.generatedWorkout
    aw.startWorkout(plan)
    localStorage.removeItem('coach-pending-workout')
  }, [startFlowState.generatedWorkout, aw, user?.id])

  // FinishModal MOET voor de isActive check staan — finishWorkout() zet workout op null
  // waardoor isActive false wordt VOORDAT showFinish gezet is.
  if (showFinish && finishResult) {
    return (
      <FinishModal
        result={finishResult}
        onClose={handleFinishClose}
        onSaveTemplate={async (name) => {
          await templates.saveTemplate(name, finishResult.exercises)
        }}
      />
    )
  }

  if (!aw.isActive) {
    const block = getCurrentBlock()
    const phase = block ? PHASES[block.phase] : null
    const today = new Date()
    const dateStr = today.toLocaleDateString(LOCALE_MAP[i18n.language] || 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

    // Muscle name translations - use i18n
    const getMuscleLabel = (muscle) => t(`muscles.${muscle}`)

    const { loading, generating, error, selectedSplit, generatedWorkout, recoveredMuscles, showSplitPicker, estimatedDuration, exerciseCount, availableTime } = startFlowState
    const timeSelected = availableTime !== null
    const isReady = timeSelected && !loading && !generating && generatedWorkout && !error
    const splitOptions = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Lower Body', 'Full Body']

    // If user is not logged in, show simple start screen
    if (!user) {
      return (
        <div className="min-h-[80vh] px-5 py-10">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">{formattedDate}</p>
          <h1 className="mb-10 text-4xl font-black tracking-tight text-white">{t('logger.train')}</h1>
          
          <button
            onClick={() => aw.startWorkout()}
            className="w-full rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 text-left active:scale-[0.97] transition-transform"
          >
            <p className="text-2xl font-black text-white">{t('logger.start_empty')}</p>
            <p className="mt-1 text-sm font-medium text-white/70">{t('logger.free_training_sub')}</p>
          </button>

          {templates.templates.length > 0 && (
            <button
              onClick={() => setShowTemplates(true)}
              className="mt-4 w-full rounded-2xl bg-gray-900 p-4 text-center text-sm font-medium text-gray-400 ring-1 ring-gray-800 active:bg-gray-800"
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

    return (
      <div className="min-h-[80vh] px-5 py-10">
        {/* Header */}
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">{formattedDate}</p>
        <h1 className="mb-8 text-4xl font-black tracking-tight text-white">
          {loading ? t('dashboard.title') : (selectedSplit || t('dashboard.title'))}
        </h1>

        {/* Primary AI Workout Card */}
        <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6">
          {/* Split name + status badge */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-black text-white">{selectedSplit || 'Workout'}</p>
            {loading && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                <Loader2 size={12} className="animate-spin" />
                {t('logger.analyzing')}
              </span>
            )}
            {generating && !loading && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                <Loader2 size={12} className="animate-spin" />
                {t('logger.ai_generating')}
              </span>
            )}
            {isReady && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/30 px-2.5 py-1 text-xs font-bold text-white">
                <Check size={12} />
                {t('logger.ready')}
              </span>
            )}
            {error && (
              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                {t('common.retry')}
              </span>
            )}
          </div>

          {/* Duration picker */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">{t('logger.available_time')}</p>
            <div className="flex gap-2">
              {[30, 45, 60, 75, 90].map(min => (
                <button
                  key={min}
                  onClick={() => handleTimeChange(min)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-all active:scale-[0.97] ${
                    startFlowState.availableTime === min
                      ? 'bg-white text-cyan-600'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>

          {/* Recovery context */}
          {recoveredMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {recoveredMuscles.map(muscle => (
                <span
                  key={muscle}
                  className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-medium text-white"
                >
                  {getMuscleLabel(muscle)} {t('logger.recovered')}
                </span>
              ))}
            </div>
          )}

          {/* Block context if active */}
          {block && phase && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              {phase.label} · Week {block.currentWeek}/{phase.weeks}
            </p>
          )}

          {/* Main action button */}
          <button
            onClick={handleStartAIWorkout}
            disabled={!isReady}
            className={`w-full rounded-xl py-4 text-base font-black transition-all active:scale-[0.97] ${
              isReady
                ? 'bg-white text-cyan-600'
                : 'bg-white/30 text-white/70 cursor-not-allowed'
            }`}
          >
            {!timeSelected ? (
              t('logger.select_time_first')
            ) : loading || generating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {t('logger.loading_workout')}
              </span>
            ) : error ? (
              t('logger.generation_failed')
            ) : (
              `Start ${selectedSplit}`
            )}
          </button>

          {/* Exercise count + duration when ready */}
          {isReady && (
            <p className="mt-2 text-center text-sm font-medium text-white/70">
              {exerciseCount} {t('common.exercises')} · ~{estimatedDuration} min
            </p>
          )}

          {/* Error state with fallback */}
          {error && (
            <div className="mt-3">
              {startFlowState.retryCount >= 2 && (
                <p className="mb-2 text-center text-sm font-medium text-white/70">
                  {t('logger.try_later')}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => generateForSplit(selectedSplit || 'Full Body')}
                  className="flex-1 rounded-xl bg-white/20 py-2.5 text-sm font-semibold text-white active:bg-white/30"
                >
                  <RefreshCw size={14} className="inline mr-1.5" />
                  {t('common.retry')}
                </button>
                <button
                  onClick={() => nav('/coach')}
                  className="flex-1 rounded-xl bg-white/20 py-2.5 text-sm font-semibold text-white active:bg-white/30"
                >
                  {t('logger.choose_exercises')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Secondary action buttons */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => aw.startWorkout()}
            className="rounded-2xl bg-gray-900 p-4 text-left ring-1 ring-gray-800 active:scale-[0.97] transition-transform"
          >
            <Dumbbell size={20} className="mb-2 text-gray-500" />
            <p className="text-sm font-bold text-white">{t('logger.empty_training')}</p>
            <p className="text-xs text-gray-500">{t('logger.choose_exercises')}</p>
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="rounded-2xl bg-gray-900 p-4 text-left ring-1 ring-gray-800 active:scale-[0.97] transition-transform"
          >
            <BookOpen size={20} className="mb-2 text-gray-500" />
            <p className="text-sm font-bold text-white">{t('logger.template')}</p>
            <p className="text-xs text-gray-500">{t('logger.templates_saved', { count: templates.templates.length })}</p>
          </button>
        </div>

        {/* Repeat last workout button */}
        {lastWorkout && (
          <button
            onClick={handleRepeatLastWorkout}
            className="w-full rounded-2xl bg-gray-900 p-4 text-left ring-1 ring-white/10 active:bg-gray-800 active:scale-[0.97] transition-transform mt-3"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">{t('logger.repeat_last')}</p>
            <p className="text-sm font-bold text-white truncate">{lastWorkout.preview}</p>
          </button>
        )}

        {/* Split switcher */}
        <div className="mt-6">
          {!showSplitPicker ? (
            <button
              onClick={() => setStartFlowState(prev => ({ ...prev, showSplitPicker: true }))}
              className="w-full text-center text-sm text-gray-500 active:text-gray-400"
            >
              {t('logger.change_split')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center label-caps">{t('logger.choose_split')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {splitOptions.map(split => (
                  <button
                    key={split}
                    onClick={() => generateForSplit(split)}
                    disabled={generating}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedSplit === split
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-900 text-gray-400 ring-1 ring-gray-700 active:bg-gray-800'
                    } ${generating ? 'opacity-50' : ''}`}
                  >
                    {split}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStartFlowState(prev => ({ ...prev, showSplitPicker: false }))}
                className="w-full text-center text-xs text-gray-600 active:text-gray-500"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>

        {/* Advanced link to full AICoach */}
        <button
          onClick={() => nav('/coach')}
          className="mt-6 w-full text-center text-xs text-gray-600 active:text-gray-500"
        >
          {t('logger.advanced_options')}
        </button>

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
        {/* Training Intent Picker - show when no sets logged yet */}
        {!hasLoggedSets && !trainingIntent && (
          <div className="px-4 pb-3">
            <p className="label-caps mb-2">{t('session_intent.title')}</p>
            <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
              {[
                { value: 'strength', label: t('session_intent.strength') },
                { value: 'volume', label: t('session_intent.volume') },
                { value: 'technique', label: t('session_intent.technique') },
                { value: 'recovery', label: t('session_intent.recovery') },
              ].map(intent => (
                <button
                  key={intent.value}
                  onClick={() => setTrainingIntent(intent.value)}
                  className="flex-1 rounded-lg py-2 text-xs font-bold text-gray-500 active:text-gray-300 active:bg-gray-800"
                >
                  {intent.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Show intent badge once selected */}
        {trainingIntent && (
          <div className="px-4 pb-3">
            <span className="inline-flex items-center rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-bold text-cyan-400">
              {t(`session_intent.${trainingIntent}`)}
            </span>
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
// Helper function for progressive overload suggestion
function suggestNextWeight(kg) {
  if (!kg || kg <= 0) return null
  const next = kg + 2.5
  return Math.round(next * 2) / 2 // Nearest 0.5
}

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
  
  // PR Banner state
  const [prBanner, setPrBanner] = useState(null)
  const [historicalSets, setHistoricalSets] = useState([])
  
  // Warmup state
  const [showWarmup, setShowWarmup] = useState(false)
  const [warmupDone, setWarmupDone] = useState([])
  
  // Check if this is a compound exercise
  const isCompoundExercise = isCompound(exercise.name)
  const workingWeight = parseFloat(exercise.plan?.weight_kg) || parseFloat(weight) || 0
  const warmupSets = useMemo(() => {
    if (!isCompoundExercise || exercise.sets.length > 0) return []
    return calculateWarmupSets(workingWeight)
  }, [isCompoundExercise, workingWeight, exercise.sets.length])

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

  // Load previous session data and historical sets for PR detection
  useEffect(() => {
    let cancelled = false
    if (userId && exercise.name) {
      getExerciseHistory(exercise.name, userId).then(data => {
        if (!cancelled && data.length > 0) {
          // Store historical sets for PR detection (convert to expected format)
          setHistoricalSets(data.map(s => ({
            exercise: exercise.name,
            weight_kg: s.weight_kg,
            reps: s.reps
          })))
          
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
  
  // Auto-dismiss PR banner after 4 seconds
  useEffect(() => {
    if (prBanner) {
      const timer = setTimeout(() => setPrBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [prBanner])

  function handleAdd() {
    const w = parseFloat(weight) || 0
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return
    
    // Check for PR before adding the set
    if (historicalSets.length > 0) {
      const pr = detectPR(exercise.name, w, r, historicalSets)
      if (pr && pr.isPR) {
        setPrBanner({
          weight: w,
          reps: r,
          improvement: pr.improvement,
          type: pr.type
        })
      }
    }
    
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

      {/* Warmup section for compound exercises */}
      {isCompoundExercise && exercise.sets.length === 0 && warmupSets.length > 0 && (
        <div className="border-b border-gray-800 px-4 py-3">
          <button
            onClick={() => setShowWarmup(!showWarmup)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-800/50 px-3 py-2.5 text-left active:bg-gray-700/50"
          >
            <span className="text-sm font-semibold text-gray-400">
              {showWarmup ? t('warmup.title') : t('warmup.calculate')}
            </span>
            <ChevronDown 
              size={16} 
              className={`text-gray-500 transition-transform ${showWarmup ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {showWarmup && (
            <div className="mt-2 space-y-1.5">
              {warmupSets.map((ws, idx) => {
                const isDone = warmupDone.includes(idx)
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      isDone ? 'bg-green-500/10' : 'bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="label-caps w-8 text-right">{idx + 1}</span>
                      <span className="text-sm font-bold text-white tabular-nums">
                        {ws.isBarOnly ? (
                          <span className="text-gray-400">{t('warmup.bar_only')}</span>
                        ) : (
                          <>{ws.weight_kg}<span className="text-xs font-normal text-gray-500">kg</span></>
                        )}
                        <span className="mx-1.5 text-gray-600">x</span>
                        {ws.reps}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (isDone) {
                          setWarmupDone(prev => prev.filter(i => i !== idx))
                        } else {
                          const newDone = [...warmupDone, idx]
                          setWarmupDone(newDone)
                          // Auto-collapse when all warmup sets done
                          if (newDone.length === warmupSets.length) {
                            setTimeout(() => setShowWarmup(false), 300)
                          }
                        }
                      }}
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                        isDone 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-800 text-gray-400 active:bg-gray-700'
                      }`}
                    >
                      {isDone ? <Check size={14} /> : t('warmup.done_btn')}
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => setShowWarmup(false)}
                className="mt-2 w-full py-1 text-center text-xs text-gray-600 active:text-gray-400"
              >
                {t('warmup.hide')}
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* PR Banner */}
      {prBanner && (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-cyan-400 shrink-0" />
            <span className="text-sm font-bold text-cyan-400">
              {t('pr.new_record')}: {prBanner.weight}kg · {prBanner.reps} reps
              {prBanner.improvement > 0 && (
                <span className="ml-2 text-cyan-300">+{prBanner.improvement}kg</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setPrBanner(null)}
            className="p-1 text-cyan-500 active:text-cyan-300"
          >
            <X size={14} />
          </button>
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

        {/* Previous session hint with progressive overload suggestion */}
        {prevData && (
          <p className="text-center label-caps">
            {t('logger.last_session')}: <span className="text-gray-400">{prevData.weight}kg × {prevData.reps}</span>
            {suggestNextWeight(prevData.weight) && (
              <span className="text-cyan-400 font-medium"> — {t('logger.try')}: {suggestNextWeight(prevData.weight)}kg</span>
            )}
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
        {showRpe && (
          <p className="mt-0.5 text-[10px] text-gray-600 text-center">
            {t('logger.rpe_scale_hint')}
          </p>
        )}

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
