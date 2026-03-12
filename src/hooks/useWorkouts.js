import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err

      // Fetch sets for each workout
      const ids = (data || []).map(w => w.id)
      let setsMap = {}
      if (ids.length > 0) {
        const { data: sets } = await supabase
          .from('sets')
          .select('*')
          .in('workout_id', ids)
          .order('created_at', { ascending: true })

        for (const s of (sets || [])) {
          if (!setsMap[s.workout_id]) setsMap[s.workout_id] = []
          setsMap[s.workout_id].push(s)
        }
      }

      const enriched = (data || []).map(w => ({
        ...w,
        workout_sets: setsMap[w.id] || [],
        totalVolume: (setsMap[w.id] || []).reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
        exerciseNames: [...new Set((setsMap[w.id] || []).map(s => s.exercise))],
      }))

      setWorkouts(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  const deleteWorkout = useCallback(async (id) => {
    // Optimistic delete
    setWorkouts(prev => prev.filter(w => w.id !== id))
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      fetchWorkouts() // revert
      throw err
    }
  }, [fetchWorkouts])

  return { workouts, loading, error, refetch: fetchWorkouts, deleteWorkout }
}

export function useWorkoutDetail(id) {
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: w } = await supabase.from('workouts').select('*').eq('id', id).single()
      const { data: sets } = await supabase.from('sets').select('*').eq('workout_id', id).order('created_at')
      if (!cancelled && w) {
        setWorkout({
          ...w,
          workout_sets: sets || [],
          totalVolume: (sets || []).reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
          exerciseNames: [...new Set((sets || []).map(s => s.exercise))],
        })
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  return { workout, loading }
}

// Fetch recent history for AI coach
export async function fetchRecentHistory(days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (!workouts?.length) return []

  const ids = workouts.map(w => w.id)
  const { data: sets } = await supabase
    .from('sets')
    .select('*')
    .in('workout_id', ids)

  const setsMap = {}
  for (const s of (sets || [])) {
    if (!setsMap[s.workout_id]) setsMap[s.workout_id] = []
    setsMap[s.workout_id].push(s)
  }

  return workouts.map(w => ({ ...w, workout_sets: setsMap[w.id] || [] }))
}

// Get previous session data for an exercise
export async function getExerciseHistory(exerciseName) {
  const { data } = await supabase
    .from('sets')
    .select('weight_kg, reps, rpe, created_at, workout_id')
    .eq('exercise', exerciseName)
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}
