import { useReducer, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  StartFlowState,
  ActiveExercise,
  MuscleGroup,
  MuscleStatusMap,
  SplitScore,
  UserSettings,
  AIWorkoutResponse,
} from '../types'
import { fetchRecentHistory } from './useWorkouts'
import { analyzeTraining, scoreSplits, getRecentSplits, detectSplit } from '../lib/training-analysis'
import { generateScientificWorkout } from '../lib/ai'
import { getSettings, saveSettings, parseFrequency } from '../lib/settings'
import { loadBlock } from '../lib/periodization'
import { buildWorkoutPreferences } from '../lib/workoutPreferences'
import { getCachedWorkout, cacheWorkout, buildContextHash } from '../lib/workoutCache'
import { loadInjuries } from '../lib/injuryRecovery'

// ---- Session Cache ----

const SESSION_CACHE_PREFIX = '__kravex_start_flow_cache_'

function getSessionCacheKey(userId: string | undefined): string {
  return `${SESSION_CACHE_PREFIX}${userId || 'anonymous'}__`
}

// ---- Reducer Actions ----

type StartFlowAction =
  | { type: 'LOAD_CACHE'; payload: Partial<StartFlowState> }
  | { type: 'ANALYSIS_COMPLETE'; payload: {
      muscleStatus: MuscleStatusMap
      splits: SplitScore[]
      recommendedSplit: string
      recoveredMuscles: string[]
    }}
  | { type: 'GENERATION_START'; payload?: { selectedSplit?: string; availableTime?: number } }
  | { type: 'GENERATION_COMPLETE'; payload: {
      generatedWorkout: ActiveExercise[]
      estimatedDuration: number
      exerciseCount: number
      aiResponse: AIWorkoutResponse
    }}
  | { type: 'GENERATION_ERROR'; payload: { error: string } }
  | { type: 'SET_TIME'; payload: { availableTime: number } }
  | { type: 'SET_SPLIT'; payload: { selectedSplit: string } }
  | { type: 'TOGGLE_SPLIT_PICKER'; payload: { show: boolean } }
  | { type: 'STOP_LOADING' }
  | { type: 'CLEAR_WORKOUT' }
  | { type: 'SET_ENERGY'; payload: { energy: 'low' | 'medium' | 'high' } }
  | { type: 'SET_FOCUSED_MUSCLES'; payload: { focusedMuscles: MuscleGroup[] } }

const initialState: StartFlowState = {
  loading: true,
  generating: false,
  error: null,
  retryCount: 0,
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
  availableTime: null,
  aiResponse: null,
  energy: 'medium',
  focusedMuscles: [],
}

function startFlowReducer(state: StartFlowState, action: StartFlowAction): StartFlowState {
  switch (action.type) {
    case 'LOAD_CACHE':
      return { ...state, ...action.payload, loading: false, generating: false, showSplitPicker: false }

    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        loading: false,
        error: null,
        muscleStatus: action.payload.muscleStatus,
        splits: action.payload.splits,
        recommendedSplit: action.payload.recommendedSplit,
        selectedSplit: action.payload.recommendedSplit,
        recoveredMuscles: action.payload.recoveredMuscles,
      }

    case 'GENERATION_START':
      return {
        ...state,
        generating: true,
        generatedWorkout: null,
        error: null,
        showSplitPicker: false,
        ...(action.payload?.selectedSplit != null && { selectedSplit: action.payload.selectedSplit }),
        ...(action.payload?.availableTime != null && { availableTime: action.payload.availableTime }),
      }

    case 'GENERATION_COMPLETE':
      return {
        ...state,
        generating: false,
        generatedWorkout: action.payload.generatedWorkout,
        estimatedDuration: action.payload.estimatedDuration,
        exerciseCount: action.payload.exerciseCount,
        aiResponse: action.payload.aiResponse,
        cachedAt: Date.now(),
      }

    case 'GENERATION_ERROR':
      return {
        ...state,
        generating: false,
        error: action.payload.error,
        retryCount: state.retryCount + 1,
      }

    case 'SET_TIME':
      return {
        ...state,
        availableTime: action.payload.availableTime,
        generatedWorkout: null,
        exerciseCount: null,
        estimatedDuration: null,
        error: null,
        loading: false,
      }

    case 'SET_SPLIT':
      return { ...state, selectedSplit: action.payload.selectedSplit }

    case 'TOGGLE_SPLIT_PICKER':
      return { ...state, showSplitPicker: action.payload.show }

    case 'STOP_LOADING':
      return { ...state, loading: false, generating: false }

    case 'CLEAR_WORKOUT':
      return {
        ...state,
        generatedWorkout: null,
        exerciseCount: null,
        estimatedDuration: null,
        aiResponse: null,
        error: null,
      }

    case 'SET_ENERGY':
      return { ...state, energy: action.payload.energy }

    case 'SET_FOCUSED_MUSCLES':
      return { ...state, focusedMuscles: action.payload.focusedMuscles }

    default:
      return state
  }
}

// ---- Transform AI response to workout format ----

function transformAIResult(exercises: Array<{
  name: string
  muscle_group: string
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
}>): ActiveExercise[] {
  return exercises.map(ex => ({
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
}

// ---- Save to session storage ----

function saveToSessionCache(
  userId: string,
  state: StartFlowState,
  muscleStatus: MuscleStatusMap,
  splits: SplitScore[],
  recommendedSplit: string,
  selectedSplit: string,
  recoveredMuscles: string[],
  extra: Partial<StartFlowState> = {}
): void {
  try {
    const cacheData = {
      loading: false,
      generating: false,
      error: null,
      showSplitPicker: false,
      muscleStatus,
      splits,
      recommendedSplit,
      selectedSplit,
      recoveredMuscles,
      availableTime: state.availableTime,
      userId,
      ...extra,
    }
    sessionStorage.setItem(getSessionCacheKey(userId), JSON.stringify(cacheData))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Failed to save session cache:', e)
  }
}

// ---- Hook ----

interface UseStartFlowOptions {
  userId: string | undefined
  isActive: boolean
}

export function useStartFlow({ userId, isActive }: UseStartFlowOptions) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(startFlowReducer, initialState)

  const generationIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasWorkoutRef = useRef(false)
  const availableTimeRef = useRef<number | null>(null)

  // Sync refs with state for useEffect guards
  hasWorkoutRef.current = !!state.generatedWorkout && !state.error
  availableTimeRef.current = state.availableTime

  // Load session cache when user becomes available
  useEffect(() => {
    if (!userId) return
    try {
      const cacheKey = getSessionCacheKey(userId)
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw) as StartFlowState & { userId?: string }
        if (
          cached.generatedWorkout &&
          cached.cachedAt &&
          cached.userId === userId &&
          Date.now() - cached.cachedAt < 30 * 60 * 1000
        ) {
          dispatch({ type: 'LOAD_CACHE', payload: cached })
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [userId])

  // Background analysis and workout generation on mount.
  // Note: this runs with initial state (energy='medium', focusedMuscles=[]).
  // This is intentional — the auto-generation uses defaults because the user
  // hasn't had a chance to change energy/focus yet. If the user later changes
  // energy or focus, generateForSplit() is called with the updated state.
  useEffect(() => {
    if (isActive || !userId) return
    if (hasWorkoutRef.current) return

    let cancelled = false

    async function analyzeAndGenerate() {
      try {
        const history = await fetchRecentHistory(userId!, 20)
        if (cancelled) return

        const settings = getSettings() as UserSettings
        const muscleStatus = analyzeTraining(history, settings.trainingGoal || 'hypertrophy') as MuscleStatusMap
        const lastWorkout = history[0]
        const lastWorkoutInfo = lastWorkout
          ? {
              split: lastWorkout.split || detectSplit(lastWorkout) || '',
              hoursSince: (Date.now() - new Date(lastWorkout.created_at).getTime()) / 3600000,
            }
          : null
        const recentSplits = getRecentSplits(history)
        const splits = scoreSplits(
          muscleStatus,
          lastWorkoutInfo,
          settings.experienceLevel || 'intermediate',
          parseFrequency(settings.frequency),
          recentSplits,
        ) as SplitScore[]
        const recommendedSplit = splits[0]?.name || 'Full Body'

        const recoveredMuscles = Object.entries(muscleStatus)
          .filter(([, status]) => status.status === 'ready')
          .map(([muscle]) => muscle)
          .slice(0, 3)

        if (cancelled) return

        dispatch({
          type: 'ANALYSIS_COMPLETE',
          payload: { muscleStatus, splits, recommendedSplit, recoveredMuscles },
        })

        // Only generate if user has already selected a time
        const currentTime = availableTimeRef.current
        if (currentTime === null || currentTime === undefined) {
          dispatch({ type: 'STOP_LOADING' })
          return
        }

        dispatch({ type: 'GENERATION_START' })

        // Check localStorage workout cache first (shared with Dashboard)
        const injuries = loadInjuries().filter(i => i.status !== 'resolved')
        const block = await loadBlock(userId ?? null)
        const cacheHash = buildContextHash({
          split: recommendedSplit,
          date: new Date().toISOString().slice(0, 10),
          workoutCount: history.length,
          injuryCount: injuries.length,
          equipment: settings.equipment || 'full_gym',
          trainingGoal: settings.trainingGoal || 'hypertrophy',
          experienceLevel: settings.experienceLevel || 'intermediate',
          time: currentTime,
          trainingPhase: block?.phase || null,
          blockWeek: block?.currentWeek || null,
          energy: state.energy || 'medium',
          focusedMuscles: state.focusedMuscles || [],
          frequency: parseFrequency(settings.frequency),
        })
        const cachedResult = getCachedWorkout(cacheHash)

        let result: AIWorkoutResponse

        if (cachedResult) {
          if (import.meta.env.DEV) console.log('[useStartFlow] Cache HIT')
          result = cachedResult
        } else {
          const recentHistory = history.slice(0, 5).map(w => ({
            date: w.created_at,
            sets: (w.workout_sets || []).map(s => ({
              exercise: s.exercise,
              weight_kg: s.weight_kg ?? null,
              reps: s.reps ?? 0,
              duration_seconds: s.duration_seconds ?? null,
              rpe: s.rpe ?? null,
            })),
          }))
          const preferences = buildWorkoutPreferences(settings, block, { time: currentTime, energy: state.energy, focusedMuscles: state.focusedMuscles })

          result = await (generateScientificWorkout as CallableFunction)({
            muscleStatus,
            recommendedSplit,
            recentHistory,
            preferences,
            userId: userId ?? null,
          }) as AIWorkoutResponse

          // Write to shared cache
          cacheWorkout(cacheHash, result)
        }

        if (cancelled) return

        const workoutExercises = transformAIResult(result.exercises)

        dispatch({
          type: 'GENERATION_COMPLETE',
          payload: {
            generatedWorkout: workoutExercises,
            estimatedDuration: result.estimated_duration_min,
            exerciseCount: result.exercises.length,
            aiResponse: result,
          },
        })

        saveToSessionCache(
          userId!,
          { ...initialState, availableTime: currentTime },
          muscleStatus,
          splits,
          recommendedSplit,
          recommendedSplit,
          recoveredMuscles,
          {
            generatedWorkout: workoutExercises,
            estimatedDuration: result.estimated_duration_min,
            exerciseCount: result.exercises.length,
            cachedAt: Date.now(),
          }
        )
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error
          ? (err.name === 'AbortError' ? '' : err.message)
          : String(err ?? 'Unknown error')
        if (import.meta.env.DEV) console.error('Workout generation failed:', err)
        dispatch({
          type: 'GENERATION_ERROR',
          payload: { error: message },
        })
      }
    }

    analyzeAndGenerate()
    return () => { cancelled = true }
  }, [userId, isActive])

  // Generate workout for a specific split
  const generateForSplit = useCallback(async (splitName: string, overrideTime?: number) => {
    if (!userId || !state.muscleStatus) {
      dispatch({ type: 'GENERATION_ERROR', payload: { error: t('logger.analysis_required') } })
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const myGenerationId = ++generationIdRef.current
    const timeToUse = overrideTime ?? state.availableTime ?? (getSettings() as UserSettings).time ?? 60

    dispatch({
      type: 'GENERATION_START',
      payload: { selectedSplit: splitName, availableTime: timeToUse },
    })

    try {
      const history = await fetchRecentHistory(userId, 20)
      if (generationIdRef.current !== myGenerationId) return

      const settings = getSettings() as UserSettings

      // Check localStorage workout cache first (shared with Dashboard)
      const injuries = loadInjuries().filter(i => i.status !== 'resolved')
      const block = await loadBlock(userId ?? null)
      const cacheHash = buildContextHash({
        split: splitName,
        date: new Date().toISOString().slice(0, 10),
        workoutCount: history.length,
        injuryCount: injuries.length,
        equipment: settings.equipment || 'full_gym',
        trainingGoal: settings.trainingGoal || 'hypertrophy',
        experienceLevel: settings.experienceLevel || 'intermediate',
        time: timeToUse,
        trainingPhase: block?.phase || null,
        blockWeek: block?.currentWeek || null,
        energy: state.energy || 'medium',
        focusedMuscles: state.focusedMuscles || [],
        frequency: parseInt(settings.frequency) || 4,
      })
      const cachedResult = getCachedWorkout(cacheHash)

      let result: AIWorkoutResponse

      if (cachedResult) {
        if (import.meta.env.DEV) console.log('[useStartFlow] Cache HIT for split:', splitName)
        result = cachedResult
      } else {
        const recentHistory = history.slice(0, 5).map(w => ({
          date: w.created_at,
          sets: (w.workout_sets || []).map(s => ({
            exercise: s.exercise,
            weight_kg: s.weight_kg ?? null,
            reps: s.reps ?? 0,
            duration_seconds: s.duration_seconds ?? null,
            rpe: s.rpe ?? null,
          })),
        }))
        const preferences = buildWorkoutPreferences(settings, block, { time: timeToUse, energy: state.energy, focusedMuscles: state.focusedMuscles })

        result = await (generateScientificWorkout as CallableFunction)({
          muscleStatus: state.muscleStatus,
          recommendedSplit: splitName,
          recentHistory,
          preferences,
          userId: userId ?? null,
          signal: controller.signal,
        }) as AIWorkoutResponse

        // Write to shared cache
        cacheWorkout(cacheHash, result)
      }

      if (generationIdRef.current !== myGenerationId) return

      const workoutExercises = transformAIResult(result.exercises)

      dispatch({
        type: 'GENERATION_COMPLETE',
        payload: {
          generatedWorkout: workoutExercises,
          estimatedDuration: result.estimated_duration_min,
          exerciseCount: result.exercises.length,
          aiResponse: result,
        },
      })

      saveToSessionCache(
        userId!,
        { ...state, availableTime: timeToUse },
        state.muscleStatus,
        state.splits,
        state.recommendedSplit!,
        splitName,
        state.recoveredMuscles,
        {
          generatedWorkout: workoutExercises,
          estimatedDuration: result.estimated_duration_min,
          exerciseCount: result.exercises.length,
          cachedAt: Date.now(),
        }
      )
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof Error && err.name === 'AbortError') return
      if (import.meta.env.DEV) console.error('Workout generation failed:', err)
      const message = err instanceof Error
        ? (err.message === 'SESSION_EXPIRED'
            ? t('auth.session_expired', 'Je sessie is verlopen, log opnieuw in')
            : err.message)
        : String(err ?? 'Unknown error')
      dispatch({ type: 'GENERATION_ERROR', payload: { error: message } })
    }
  }, [userId, state.muscleStatus, state.splits, state.recommendedSplit, state.recoveredMuscles, state.availableTime, state.energy, state.focusedMuscles, t])

  // Handle time change
  const handleTimeChange = useCallback((newTime: number) => {
    const current = getSettings() as UserSettings
    saveSettings({ ...current, time: newTime })
    dispatch({ type: 'SET_TIME', payload: { availableTime: newTime } })

    // Clear sessionStorage cache
    try {
      sessionStorage.removeItem(getSessionCacheKey(userId))
    } catch {
      // ignore
    }

    // Only generate if analysis has completed (muscleStatus is set)
    // If still loading, analyzeAndGenerate will pick up the time via availableTimeRef
    if (state.muscleStatus) {
      generateForSplit(state.selectedSplit || 'Full Body', newTime)
    }
  }, [state.selectedSplit, state.muscleStatus, generateForSplit, userId])

  // Clear session cache (called when starting a workout)
  const clearSessionCache = useCallback(() => {
    if (userId) {
      try {
        sessionStorage.removeItem(getSessionCacheKey(userId))
      } catch {
        // ignore
      }
    }
  }, [userId])

  return {
    state,
    dispatch,
    generateForSplit,
    handleTimeChange,
    clearSessionCache,
  }
}
