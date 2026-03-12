import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// Fallback exercises when Supabase isn't configured
const FALLBACK_EXERCISES = [
  { id: '1', name: 'Bench Press', muscle_group: 'chest', category: 'compound' },
  { id: '2', name: 'Squat', muscle_group: 'legs', category: 'compound' },
  { id: '3', name: 'Deadlift', muscle_group: 'back', category: 'compound' },
  { id: '4', name: 'Overhead Press', muscle_group: 'shoulders', category: 'compound' },
  { id: '5', name: 'Barbell Row', muscle_group: 'back', category: 'compound' },
  { id: '6', name: 'Pull-up', muscle_group: 'back', category: 'bodyweight' },
  { id: '7', name: 'Dumbbell Curl', muscle_group: 'arms', category: 'isolation' },
  { id: '8', name: 'Tricep Pushdown', muscle_group: 'arms', category: 'isolation' },
  { id: '9', name: 'Leg Press', muscle_group: 'legs', category: 'compound' },
  { id: '10', name: 'Romanian Deadlift', muscle_group: 'legs', category: 'compound' },
  { id: '11', name: 'Lateral Raise', muscle_group: 'shoulders', category: 'isolation' },
  { id: '12', name: 'Plank', muscle_group: 'core', category: 'bodyweight' },
]

export function useExercises() {
  const [exercises, setExercises] = useState(FALLBACK_EXERCISES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name')

        if (!error && data && data.length > 0) {
          setExercises(data)
        }
      } catch {
        // Keep fallback
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { exercises, loading }
}

export function useExerciseSearch(exercises, query) {
  return useMemo(() => {
    if (!query.trim()) return exercises
    const lower = query.toLowerCase()
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.muscle_group.toLowerCase().includes(lower) ||
        e.category.toLowerCase().includes(lower)
    )
  }, [exercises, query])
}
