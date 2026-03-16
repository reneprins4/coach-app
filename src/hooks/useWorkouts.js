import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useWorkouts(userId) {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkouts = useCallback(async () => {
    // Early return when no userId to prevent fetching all workouts
    if (!userId) {
      setWorkouts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', userId)

      const { data, error: err } = await query

      if (err) throw err

      // Fetch sets for each workout
      const ids = (data || []).map(w => w.id)
      let setsMap = {}
      if (ids.length > 0 && userId) {
        const { data: sets } = await supabase
          .from('sets')
          .select('*')
          .in('workout_id', ids)
          .eq('user_id', userId)
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
  }, [userId])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  const deleteWorkout = useCallback(async (id) => {
    // Snapshot for reliable rollback
    const snapshot = [...workouts]
    // Optimistic delete
    setWorkouts(prev => prev.filter(w => w.id !== id))
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setWorkouts(snapshot) // restore exact previous state
      throw err
    }
  }, [workouts])

  return { workouts, loading, error, refetch: fetchWorkouts, deleteWorkout }
}

export function useWorkoutDetail(id, userId) {
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id || !userId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      
      const { data: w, error: wErr } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      if (wErr || !w) {
        if (!cancelled) {
          setError('Workout niet gevonden')
          setLoading(false)
        }
        return
      }
      
      const { data: sets, error: sErr } = await supabase
        .from('sets')
        .select('*')
        .eq('workout_id', id)
        .eq('user_id', userId)
        .order('created_at')
      
      if (sErr) {
        if (!cancelled) {
          setError('Sets laden mislukt')
          setLoading(false)
        }
        return
      }
      
      if (!cancelled) {
        setWorkout({
          ...w,
          workout_sets: sets || [],
          totalVolume: (sets || []).reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
          exerciseNames: [...new Set((sets || []).map(s => s.exercise))],
        })
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, userId])

  return { workout, loading, error }
}

// Fetch recent history for AI coach
export async function fetchRecentHistory(userId, days = 30) {
  if (!userId) return []
  
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: workouts, error: wErr } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (wErr) {
    console.error('Failed to fetch recent history:', wErr)
    return []
  }

  if (!workouts?.length) return []

  const ids = workouts.map(w => w.id)
  const { data: sets, error: sErr } = await supabase
    .from('sets')
    .select('*')
    .in('workout_id', ids)
    .eq('user_id', userId)

  if (sErr) {
    console.error('Failed to fetch sets for history:', sErr)
    // Return workouts without sets rather than failing completely
  }

  const setsMap = {}
  for (const s of (sets || [])) {
    if (!setsMap[s.workout_id]) setsMap[s.workout_id] = []
    setsMap[s.workout_id].push(s)
  }

  return workouts.map(w => ({ ...w, workout_sets: setsMap[w.id] || [] }))
}

// Get previous session data for an exercise
export async function getExerciseHistory(exerciseName, userId) {
  if (!userId) return []
  
  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, rpe, created_at, workout_id')
    .eq('exercise', exerciseName)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to fetch exercise history:', error)
    return []
  }

  return data || []
}
