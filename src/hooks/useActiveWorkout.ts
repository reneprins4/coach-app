import { useState, useCallback, useEffect, useRef } from 'react'
import type { ActiveWorkout, ActiveExercise, ActiveWorkoutSet } from '../types'
import { supabase } from '../lib/supabase'
import { trimWorkout } from '../lib/workoutTrimmer'
import { invalidateWorkoutCache } from '../lib/workoutCache'

const STORAGE_KEY = 'coach-active-workout'
const BACKUP_KEY = 'coach-workout-backup'
const LAST_USED_KEY = 'coach-last-used'

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000   // 2 hours
const ABANDONED_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6 hours
const BACKUP_MAX_AGE_MS = 12 * 60 * 60 * 1000     // 12 hours
const BACKUP_INTERVAL_MS = 30 * 1000               // 30 seconds

interface LastUsedData {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
}

type LastUsedStore = Record<string, LastUsedData>

interface SetInput {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
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
    weight_kg: number | null
    reps: number | null
    duration_seconds: number | null
    rpe: number | null
    workout_id: string
  }>
  totalVolume: number
  exerciseNames: string[]
  duration: number
  exercises: ActiveExercise[]
}

export type StaleStatus = 'fresh' | 'stale' | 'abandoned'

interface UseActiveWorkoutReturn {
  workout: ActiveWorkout | null
  saving: boolean
  error: string | null
  elapsed: number
  totalSets: number
  totalVolume: number
  staleStatus: StaleStatus
  hasBackup: boolean
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
  recoverFromBackup: () => void
  dismissBackup: () => void
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

export function getStaleStatus(workout: ActiveWorkout | null): StaleStatus {
  if (!workout?.lastActivityAt) return 'fresh'
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0)
  if (totalSets === 0) return 'fresh'
  const age = Date.now() - new Date(workout.lastActivityAt).getTime()
  if (age >= ABANDONED_THRESHOLD_MS) return 'abandoned'
  if (age >= STALE_THRESHOLD_MS) return 'stale'
  return 'fresh'
}

export { STALE_THRESHOLD_MS, ABANDONED_THRESHOLD_MS, BACKUP_MAX_AGE_MS }

export function useActiveWorkout(userId: string | undefined): UseActiveWorkoutReturn {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(() => load<ActiveWorkout>(STORAGE_KEY))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [hasBackup, setHasBackup] = useState(false)
  const lastBackupRef = useRef<string | null>(null)

  // Check for recoverable backup on mount (only when no active workout)
  useEffect(() => {
    if (workout) { setHasBackup(false); return }
    try {
      const raw = localStorage.getItem(BACKUP_KEY)
      if (!raw) { setHasBackup(false); return }
      const backup = JSON.parse(raw) as ActiveWorkout
      if (!backup?.startedAt) { setHasBackup(false); return }
      const backupAge = Date.now() - new Date(backup.lastActivityAt || backup.startedAt).getTime()
      setHasBackup(backupAge < BACKUP_MAX_AGE_MS)
    } catch { setHasBackup(false) }
  }, [workout])

  // Periodic backup every 30 seconds
  useEffect(() => {
    if (!workout) return
    const doBackup = (): void => {
      const serialized = JSON.stringify(workout)
      if (serialized !== lastBackupRef.current) {
        save(BACKUP_KEY, workout)
        lastBackupRef.current = serialized
      }
    }
    doBackup() // immediate backup
    const id = setInterval(doBackup, BACKUP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [workout])

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
      const now = new Date().toISOString()
      return {
        tempId: crypto.randomUUID(),
        startedAt: now,
        lastActivityAt: now,
        exercises: preloadedExercises || [],
        notes: '',
      }
    })
    setError(null)
  }, [])

  const addExercise = useCallback((exercise: NewExerciseInput): void => {
    setWorkout(prev => {
      if (!prev || prev.exercises.some(e => e.name === exercise.name)) return prev
      return { ...prev, lastActivityAt: new Date().toISOString(), exercises: [...prev.exercises, { ...exercise, sets: [] }] }
    })
  }, [])

  const removeExercise = useCallback((name: string): void => {
    setWorkout(prev => prev ? { ...prev, lastActivityAt: new Date().toISOString(), exercises: prev.exercises.filter(e => e.name !== name) } : prev)
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
    store[exerciseName] = { weight_kg: setData.weight_kg, reps: setData.reps, duration_seconds: setData.duration_seconds }
    save(LAST_USED_KEY, store)

    setWorkout(prev => {
      if (!prev) return prev
      const now = new Date().toISOString()
      return {
        ...prev,
        lastActivityAt: now,
        exercises: prev.exercises.map(e => {
          if (e.name !== exerciseName) return e
          const newSet: ActiveWorkoutSet = {
            id: crypto.randomUUID(),
            weight_kg: setData.weight_kg,
            reps: setData.reps,
            duration_seconds: setData.duration_seconds,
            rpe: setData.rpe || null,
            created_at: now,
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
        lastActivityAt: new Date().toISOString(),
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
    setWorkout(prev => prev ? { ...prev, notes, lastActivityAt: new Date().toISOString() } : prev)
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
        duration_seconds: s.duration_seconds,
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
      try { localStorage.removeItem(BACKUP_KEY) } catch { /* ignore */ }
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

  const discardWorkout = useCallback((): void => {
    setWorkout(null)
    try { localStorage.removeItem(BACKUP_KEY) } catch { /* ignore */ }
  }, [])

  const recoverFromBackup = useCallback((): void => {
    try {
      const raw = localStorage.getItem(BACKUP_KEY)
      if (!raw) return
      const backup = JSON.parse(raw) as ActiveWorkout
      if (backup?.startedAt) {
        setWorkout(backup)
      }
    } catch { /* ignore */ }
  }, [])

  const dismissBackup = useCallback((): void => {
    try { localStorage.removeItem(BACKUP_KEY) } catch { /* ignore */ }
    setHasBackup(false)
  }, [])

  const getLastUsed = useCallback((name: string): LastUsedData | null => {
    const store = load<LastUsedStore>(LAST_USED_KEY) || {}
    return store[name] || null
  }, [])

  const totalSets = workout ? workout.exercises.reduce((s, e) => s + e.sets.length, 0) : 0
  const totalVolume = workout
    ? workout.exercises.reduce((s, e) => s + e.sets.reduce((ss, set) => ss + (set.weight_kg || 0) * (set.reps || 0), 0), 0)
    : 0

  const staleStatus = getStaleStatus(workout)

  return {
    workout, saving, error, elapsed, totalSets, totalVolume,
    staleStatus, hasBackup,
    startWorkout, addExercise, removeExercise, replaceExercise, addSet, removeSet,
    trimExercises, updateNotes, finishWorkout, discardWorkout,
    recoverFromBackup, dismissBackup, getLastUsed,
    isActive: !!workout,
  }
}
