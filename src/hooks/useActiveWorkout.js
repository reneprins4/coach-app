import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'coach-active-workout'
const LAST_USED_KEY = 'coach-last-used'

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function save(key, val) {
  try {
    if (val) localStorage.setItem(key, JSON.stringify(val))
    else localStorage.removeItem(key)
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
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

export function useActiveWorkout(userId) {
  const [workout, setWorkout] = useState(() => load(STORAGE_KEY))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  // Persist on change
  useEffect(() => { save(STORAGE_KEY, workout) }, [workout])

  // Warn user before leaving page with active workout
  useEffect(() => {
    const handleBeforeUnload = (e) => {
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
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [workout?.startedAt])

  const startWorkout = useCallback((preloadedExercises) => {
    const w = {
      tempId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      exercises: preloadedExercises || [],
      notes: '',
    }
    setWorkout(w)
    setError(null)
  }, [])

  const addExercise = useCallback((exercise) => {
    setWorkout(prev => {
      if (!prev || prev.exercises.some(e => e.name === exercise.name)) return prev
      return { ...prev, exercises: [...prev.exercises, { ...exercise, sets: [] }] }
    })
  }, [])

  const removeExercise = useCallback((name) => {
    setWorkout(prev => prev ? { ...prev, exercises: prev.exercises.filter(e => e.name !== name) } : prev)
  }, [])

  const replaceExercise = useCallback((oldName, newExercise) => {
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

  const addSet = useCallback((exerciseName, setData) => {
    // Save to last-used
    const store = load(LAST_USED_KEY) || {}
    store[exerciseName] = { weight_kg: setData.weight_kg, reps: setData.reps }
    save(LAST_USED_KEY, store)

    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(e => {
          if (e.name !== exerciseName) return e
          return {
            ...e,
            sets: [...e.sets, {
              id: crypto.randomUUID(),
              weight_kg: setData.weight_kg,
              reps: setData.reps,
              rpe: setData.rpe || null,
              created_at: new Date().toISOString(),
            }],
          }
        }),
      }
    })
  }, [])

  const removeSet = useCallback((exerciseName, setId) => {
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

  const updateNotes = useCallback((notes) => {
    setWorkout(prev => prev ? { ...prev, notes } : prev)
  }, [])

  const finishWorkout = useCallback(async () => {
    if (!workout || !userId) return null
    setSaving(true)
    setError(null)
    try {
      const { data: row, error: wErr } = await supabase
        .from('workouts')
        .insert({ user_id: userId, notes: workout.notes || null, created_at: workout.startedAt })
        .select()
        .single()
      if (wErr) throw wErr

      const allSets = workout.exercises.flatMap(ex =>
        ex.sets.map(s => ({
          workout_id: row.id,
          user_id: userId,
          exercise: ex.name,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
        }))
      )
      if (allSets.length > 0) {
        const { error: sErr } = await supabase.from('sets').insert(allSets)
        if (sErr) {
          // Cleanup orphan workout row to prevent partial save
          await supabase.from('workouts').delete().eq('id', row.id)
          throw sErr
        }
      }

      const result = {
        ...row,
        workout_sets: allSets,
        totalVolume: allSets.reduce((s, x) => s + (x.weight_kg || 0) * (x.reps || 0), 0),
        exerciseNames: [...new Set(allSets.map(s => s.exercise))],
        duration: elapsed,
        exercises: workout.exercises, // Include for template saving
      }
      setWorkout(null)
      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [workout, elapsed, userId])

  const discardWorkout = useCallback(() => { setWorkout(null) }, [])

  const getLastUsed = useCallback((name) => {
    const store = load(LAST_USED_KEY) || {}
    return store[name] || null
  }, [])

  const totalSets = workout ? workout.exercises.reduce((s, e) => s + e.sets.length, 0) : 0
  const totalVolume = workout
    ? workout.exercises.reduce((s, e) => s + e.sets.reduce((ss, set) => ss + (set.weight_kg || 0) * (set.reps || 0), 0), 0)
    : 0

  return {
    workout, saving, error, elapsed, totalSets, totalVolume,
    startWorkout, addExercise, removeExercise, replaceExercise, addSet, removeSet,
    updateNotes, finishWorkout, discardWorkout, getLastUsed,
    isActive: !!workout,
  }
}
