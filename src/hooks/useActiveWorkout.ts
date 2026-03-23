import { useState, useCallback, useEffect } from 'react'
import type { ActiveWorkout, ActiveExercise, ActiveWorkoutSet } from '../types'
import { supabase } from '../lib/supabase'
import { trimWorkout } from '../lib/workoutTrimmer'
import { invalidateWorkoutCache } from '../lib/workoutCache'

const STORAGE_KEY = 'coach-active-workout'
const LAST_USED_KEY = 'coach-last-used'

interface LastUsedData {
  weight_kg: number
  reps: number
}

type LastUsedStore = Record<string, LastUsedData>

interface SetInput {
  weight_kg: number
  reps: number
  rpe?: number | null
}

interface NewExerciseInput {
  name: string
  muscle_group?: string
  category?: string
  plan?: ActiveExercise['plan']
  image_url_0?: string | null
  image_url_1?: string | null
}

interface FinishedWorkoutResult {
  id: string
  user_id: string
  notes: string | null
  created_at: string
  workout_sets: Array<{
    user_id: string
    exercise: string
    weight_kg: number
    reps: number
    rpe: number | null
    workout_id: string
  }>
  totalVolume: number
  exerciseNames: string[]
  duration: number
  exercises: ActiveExercise[]
}

interface UseActiveWorkoutReturn {
  workout: ActiveWorkout | null
  saving: boolean
  error: string | null
  elapsed: number
  totalSets: number
  totalVolume: number
  startWorkout: (preloadedExercises?: ActiveExercise[]) => void
  addExercise: (exercise: NewExerciseInput) => void
  removeExercise: (name: string) => void
  replaceExercise: (oldName: string, newExercise: NewExerciseInput) => void
  addSet: (exerciseName: string, setData: SetInput) => void
  removeSet: (exerciseName: string, setId: string) => void
  trimExercises: (targetCount: number) => void
  updateNotes: (notes: string) => void
  finishWorkout: () => Promise<FinishedWorkoutResult | null>
  discardWorkout: () => void
  getLastUsed: (name: string) => LastUsedData | null
  isActive: boolean
}

function load<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key)!) as T } catch { return null }
}

function save(key: string, val: unknown): void {
  try {
    if (val) localStorage.setItem(key, JSON.stringify(val))
    else localStorage.removeItem(key)
  } catch (e: unknown) {
    const err = e as DOMException
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data...')
      // Try to clear less important caches first
      try {
        localStorage.removeItem('coach-last-used')
        if (val) localStorage.setItem(key, JSON.stringify(val))
      } catch {
        console.error('Failed to save even after clearing cache')
      }
    } else {
      console.warn('localStorage unavailable:', e)
    }
  }
}

export function useActiveWorkout(userId: string | undefined): UseActiveWorkoutReturn {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(() => load<ActiveWorkout>(STORAGE_KEY))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Persist on change
  useEffect(() => { save(STORAGE_KEY, workout) }, [workout])

  // Warn user before leaving page with active workout
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (workout) {
        e.preventDefault()
        e.returnValue = '' // Shows browser's default "Leave page?" dialog
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workout])

  // Elapsed timer
  useEffect(() => {
    if (!workout?.startedAt) { setElapsed(0); return }
    const tick = (): void => setElapsed(Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [workout?.startedAt])

  const startWorkout = useCallback((preloadedExercises?: ActiveExercise[]): void => {
    setWorkout(prev => {
      // Guard: don't overwrite an active workout
      if (prev) return prev
      return {
        tempId: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        exercises: preloadedExercises || [],
        notes: '',
      }
    })
    setError(null)
  }, [])

  const addExercise = useCallback((exercise: NewExerciseInput): void => {
    setWorkout(prev => {
      if (!prev || prev.exercises.some(e => e.name === exercise.name)) return prev
      return { ...prev, exercises: [...prev.exercises, { ...exercise, sets: [] }] }
    })
  }, [])

  const removeExercise = useCallback((name: string): void => {
    setWorkout(prev => prev ? { ...prev, exercises: prev.exercises.filter(e => e.name !== name) } : prev)
  }, [])

  const replaceExercise = useCallback((oldName: string, newExercise: NewExerciseInput): void => {
    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(e =>
          e.name === oldName ? { ...newExercise, sets: [] } : e
        ),
      }
    })
  }, [])

  const addSet = useCallback((exerciseName: string, setData: SetInput): void => {
    // Save to last-used
    const store = load<LastUsedStore>(LAST_USED_KEY) || {}
    store[exerciseName] = { weight_kg: setData.weight_kg, reps: setData.reps }
    save(LAST_USED_KEY, store)

    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(e => {
          if (e.name !== exerciseName) return e
          const newSet: ActiveWorkoutSet = {
            id: crypto.randomUUID(),
            weight_kg: setData.weight_kg,
            reps: setData.reps,
            rpe: setData.rpe || null,
            created_at: new Date().toISOString(),
          }
          return {
            ...e,
            sets: [...e.sets, newSet],
          }
        }),
      }
    })
  }, [])

  const removeSet = useCallback((exerciseName: string, setId: string): void => {
    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(e => {
          if (e.name !== exerciseName) return e
          return { ...e, sets: e.sets.filter(s => s.id !== setId) }
        }),
      }
    })
  }, [])

  const trimExercises = useCallback((targetCount: number): void => {
    setWorkout(prev => {
      if (!prev) return prev
      const trimmed = trimWorkout(prev.exercises, targetCount)
      if (trimmed.length === prev.exercises.length) return prev
      return { ...prev, exercises: trimmed }
    })
  }, [])

  const updateNotes = useCallback((notes: string): void => {
    setWorkout(prev => prev ? { ...prev, notes } : prev)
  }, [])

  const finishWorkout = useCallback(async (): Promise<FinishedWorkoutResult | null> => {
    if (!workout || !userId) return null
    setSaving(true)
    setError(null)

    // Pre-build sets data so it's available for offline queue on failure
    const pendingSets = workout.exercises.flatMap(ex =>
      ex.sets.map(s => ({
        user_id: userId,
        exercise: ex.name,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe,
      }))
    )

    if (pendingSets.length === 0) {
      setSaving(false)
      setError('Log at least one set before finishing')
      return null
    }

    try {
      const { data: row, error: wErr } = await supabase
        .from('workouts')
        .insert({ user_id: userId, notes: workout.notes || null, created_at: workout.startedAt })
        .select()
        .single()
      if (wErr) throw wErr

      const allSets = pendingSets.map(s => ({ ...s, workout_id: row.id as string }))
      if (allSets.length > 0) {
        const { error: sErr } = await supabase.from('sets').insert(allSets)
        if (sErr) {
          // Cleanup orphan workout row to prevent partial save
          await supabase.from('workouts').delete().eq('id', row.id as string)
          throw sErr
        }
      }

      const result: FinishedWorkoutResult = {
        ...(row as { id: string; user_id: string; notes: string | null; created_at: string }),
        workout_sets: allSets,
        totalVolume: allSets.reduce((s, x) => s + (x.weight_kg || 0) * (x.reps || 0), 0),
        exerciseNames: [...new Set(allSets.map(s => s.exercise))],
        duration: elapsed,
        exercises: workout.exercises, // Include for template saving
      }
      setWorkout(null)
      invalidateWorkoutCache() // New workout logged → recovery changed → regenerate
      return result
    } catch (err: unknown) {
      // Queue workout for later sync when back online
      try {
        const offlineQueue = JSON.parse(localStorage.getItem('coach-offline-queue') || '[]') as unknown[]
        offlineQueue.push({
          type: 'workout',
          workout: {
            user_id: userId,
            notes: workout.notes || null,
            created_at: workout.startedAt,
          },
          sets: pendingSets,
          duration: elapsed,
          exercises: workout.exercises,
          timestamp: Date.now(),
        })
        localStorage.setItem('coach-offline-queue', JSON.stringify(offlineQueue))
      } catch { /* ignore */ }
      setError((err as Error).message)
      return null
    } finally {
      setSaving(false)
    }
  }, [workout, elapsed, userId])

  const discardWorkout = useCallback((): void => { setWorkout(null) }, [])

  const getLastUsed = useCallback((name: string): LastUsedData | null => {
    const store = load<LastUsedStore>(LAST_USED_KEY) || {}
    return store[name] || null
  }, [])

  const totalSets = workout ? workout.exercises.reduce((s, e) => s + e.sets.length, 0) : 0
  const totalVolume = workout
    ? workout.exercises.reduce((s, e) => s + e.sets.reduce((ss, set) => ss + (set.weight_kg || 0) * (set.reps || 0), 0), 0)
    : 0

  return {
    workout, saving, error, elapsed, totalSets, totalVolume,
    startWorkout, addExercise, removeExercise, replaceExercise, addSet, removeSet,
    trimExercises, updateNotes, finishWorkout, discardWorkout, getLastUsed,
    isActive: !!workout,
  }
}
