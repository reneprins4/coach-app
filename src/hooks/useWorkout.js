import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'coach-app-active-workout'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(workout) {
  if (workout) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workout))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useWorkout() {
  const [workout, setWorkout] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Restore active workout from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) {
      setWorkout(stored)
    }
  }, [])

  // Persist workout state to localStorage on every change
  useEffect(() => {
    saveToStorage(workout)
  }, [workout])

  const startWorkout = useCallback(() => {
    const newWorkout = {
      tempId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      exercises: [],
      notes: '',
    }
    setWorkout(newWorkout)
    setError(null)
  }, [])

  const addExercise = useCallback((exercise) => {
    setWorkout((prev) => {
      if (!prev) return prev
      // Don't add duplicate
      if (prev.exercises.some((e) => e.name === exercise.name)) return prev
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            ...exercise,
            sets: [],
          },
        ],
      }
    })
  }, [])

  const removeExercise = useCallback((exerciseName) => {
    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.filter((e) => e.name !== exerciseName),
      }
    })
  }, [])

  const addSet = useCallback((exerciseName, setData) => {
    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.name !== exerciseName) return e
          return {
            ...e,
            sets: [
              ...e.sets,
              {
                id: crypto.randomUUID(),
                weight_kg: setData.weight_kg,
                reps: setData.reps,
                rpe: setData.rpe || null,
                created_at: new Date().toISOString(),
              },
            ],
          }
        }),
      }
    })
  }, [])

  const removeSet = useCallback((exerciseName, setId) => {
    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.name !== exerciseName) return e
          return {
            ...e,
            sets: e.sets.filter((s) => s.id !== setId),
          }
        }),
      }
    })
  }, [])

  const updateNotes = useCallback((notes) => {
    setWorkout((prev) => (prev ? { ...prev, notes } : prev))
  }, [])

  const finishWorkout = useCallback(async (userId) => {
    setError(null)
    setSaving(true)

    try {
      const current = loadFromStorage()
      if (!current) throw new Error('No active workout')

      // Insert workout
      const { data: workoutRow, error: wErr } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          notes: current.notes || null,
          created_at: current.startedAt,
        })
        .select()
        .single()

      if (wErr) throw wErr

      // Flatten all sets
      const allSets = current.exercises.flatMap((ex) =>
        ex.sets.map((s) => ({
          workout_id: workoutRow.id,
          exercise: ex.name,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
        }))
      )

      if (allSets.length > 0) {
        const { error: sErr } = await supabase.from('sets').insert(allSets)
        if (sErr) throw sErr
      }

      // Clear workout
      setWorkout(null)
      return workoutRow
    } catch (err) {
      setError(err.message || 'Failed to save workout')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const discardWorkout = useCallback(() => {
    setWorkout(null)
  }, [])

  return {
    workout,
    saving,
    error,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateNotes,
    finishWorkout,
    discardWorkout,
    isActive: workout !== null,
  }
}
