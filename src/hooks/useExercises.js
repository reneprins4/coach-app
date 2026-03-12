import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const FALLBACK = [
  { id: '1', name: 'Bench Press', muscle_group: 'chest', category: 'compound' },
  { id: '2', name: 'Incline Dumbbell Press', muscle_group: 'chest', category: 'compound' },
  { id: '3', name: 'Cable Fly', muscle_group: 'chest', category: 'isolation' },
  { id: '4', name: 'Squat', muscle_group: 'legs', category: 'compound' },
  { id: '5', name: 'Deadlift', muscle_group: 'back', category: 'compound' },
  { id: '6', name: 'Overhead Press', muscle_group: 'shoulders', category: 'compound' },
  { id: '7', name: 'Barbell Row', muscle_group: 'back', category: 'compound' },
  { id: '8', name: 'Pull-up', muscle_group: 'back', category: 'bodyweight' },
  { id: '9', name: 'Lat Pulldown', muscle_group: 'back', category: 'compound' },
  { id: '10', name: 'Dumbbell Curl', muscle_group: 'arms', category: 'isolation' },
  { id: '11', name: 'Tricep Pushdown', muscle_group: 'arms', category: 'isolation' },
  { id: '12', name: 'Leg Press', muscle_group: 'legs', category: 'compound' },
  { id: '13', name: 'Romanian Deadlift', muscle_group: 'legs', category: 'compound' },
  { id: '14', name: 'Lateral Raise', muscle_group: 'shoulders', category: 'isolation' },
  { id: '15', name: 'Face Pull', muscle_group: 'shoulders', category: 'isolation' },
  { id: '16', name: 'Plank', muscle_group: 'core', category: 'bodyweight' },
  { id: '17', name: 'Leg Curl', muscle_group: 'legs', category: 'isolation' },
  { id: '18', name: 'Leg Extension', muscle_group: 'legs', category: 'isolation' },
  { id: '19', name: 'Calf Raise', muscle_group: 'legs', category: 'isolation' },
  { id: '20', name: 'Dumbbell Row', muscle_group: 'back', category: 'compound' },
  { id: '21', name: 'Chest Dip', muscle_group: 'chest', category: 'bodyweight' },
  { id: '22', name: 'Hammer Curl', muscle_group: 'arms', category: 'isolation' },
  { id: '23', name: 'Skull Crusher', muscle_group: 'arms', category: 'isolation' },
  { id: '24', name: 'Hip Thrust', muscle_group: 'legs', category: 'compound' },
]

export function useExercises() {
  const [exercises, setExercises] = useState(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase.from('exercises').select('*').order('name')
        if (!error && data?.length > 0 && !cancelled) setExercises(data)
      } catch { /* keep fallback */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { exercises, loading }
}

export function useFilteredExercises(exercises, query, muscleFilter) {
  return useMemo(() => {
    let result = exercises
    if (muscleFilter) {
      result = result.filter(e => e.muscle_group === muscleFilter)
    }
    if (query.trim()) {
      const lower = query.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(lower) ||
        e.muscle_group.toLowerCase().includes(lower)
      )
    }
    return result
  }, [exercises, query, muscleFilter])
}
