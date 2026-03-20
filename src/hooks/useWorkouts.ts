import { useState, useEffect, useCallback } from 'react'
import type { Workout, WorkoutSet } from '../types'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 50

interface UseWorkoutsReturn {
  workouts: Workout[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  refetch: () => void
  loadMore: () => void
  deleteWorkout: (id: string) => Promise<void>
}

export function useWorkouts(userId: string | undefined): UseWorkoutsReturn {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchWorkouts = useCallback(async (pageNum = 0, append = false): Promise<void> => {
    // Early return when no userId to prevent fetching all workouts
    if (!userId) {
      setWorkouts([])
      setLoading(false)
      return
    }

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const from = pageNum * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error: err, count } = await supabase
        .from('workouts')
        .select('*, sets(*)', { count: 'estimated' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (err) throw err

      const enriched: Workout[] = (data || []).map(w => {
        const row = w as Record<string, unknown>
        const id = row.id as string
        const workoutSets = ((row.sets as WorkoutSet[]) || [])
        return {
          id,
          user_id: row.user_id as string,
          split: (row.split as string) || '',
          created_at: row.created_at as string,
          completed_at: (row.completed_at as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          workout_sets: workoutSets,
          totalVolume: workoutSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
          exerciseNames: [...new Set(workoutSets.map(s => s.exercise))],
        }
      })

      if (append) {
        setWorkouts(prev => [...prev, ...enriched])
      } else {
        setWorkouts(enriched)
      }

      // Check if there are more pages
      setHasMore((count ?? 0) > (pageNum + 1) * PAGE_SIZE)
      setPage(pageNum)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  useEffect(() => { fetchWorkouts(0, false) }, [fetchWorkouts])

  const loadMore = useCallback((): void => {
    if (!loadingMore && hasMore) {
      fetchWorkouts(page + 1, true)
    }
  }, [fetchWorkouts, page, loadingMore, hasMore])

  const deleteWorkout = useCallback(async (id: string): Promise<void> => {
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

  return { workouts, loading, loadingMore, error, hasMore, refetch: () => fetchWorkouts(0, false), loadMore, deleteWorkout }
}

interface UseWorkoutDetailReturn {
  workout: Workout | null
  loading: boolean
  error: string | null
}

export function useWorkoutDetail(id: string | undefined, userId: string | undefined): UseWorkoutDetailReturn {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !userId) return
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      setError(null)

      const { data: w, error: wErr } = await supabase
        .from('workouts')
        .select('*, sets(*)')
        .eq('id', id!)
        .eq('user_id', userId!)
        .single()

      if (wErr || !w) {
        if (!cancelled) {
          setError('Workout niet gevonden')
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        const row = w as Record<string, unknown>
        const workoutSets = ((row.sets as WorkoutSet[]) || [])
        setWorkout({
          id: row.id as string,
          user_id: row.user_id as string,
          split: (row.split as string) || '',
          created_at: row.created_at as string,
          completed_at: (row.completed_at as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          workout_sets: workoutSets,
          totalVolume: workoutSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
          exerciseNames: [...new Set(workoutSets.map(s => s.exercise))],
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
export async function fetchRecentHistory(userId: string, days = 30): Promise<Workout[]> {
  if (!userId) return []

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: workouts, error: wErr } = await supabase
    .from('workouts')
    .select('*, sets(*)')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (wErr) {
    if (import.meta.env.DEV) console.error('Failed to fetch recent history:', wErr)
    return []
  }

  if (!workouts?.length) return []

  return workouts.map(w => {
    const row = w as Record<string, unknown>
    const id = row.id as string
    const workoutSets = ((row.sets as WorkoutSet[]) || [])
    return {
      id,
      user_id: row.user_id as string,
      split: (row.split as string) || '',
      created_at: row.created_at as string,
      completed_at: (row.completed_at as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      workout_sets: workoutSets,
      totalVolume: workoutSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
      exerciseNames: [...new Set(workoutSets.map(s => s.exercise))],
    }
  })
}

// ---- Exercise History Set ----

export interface ExerciseHistorySet {
  exercise?: string
  weight_kg: number | null
  reps: number | null
  rpe: number | null
  created_at: string
  workout_id: string
}

// Batch fetch history for multiple exercises in a single query
export async function fetchExerciseHistories(exerciseNames: string[], userId: string): Promise<Map<string, ExerciseHistorySet[]>> {
  const map = new Map<string, ExerciseHistorySet[]>()
  if (!userId || !exerciseNames || exerciseNames.length === 0) return map

  const { data, error } = await supabase
    .from('sets')
    .select('exercise, weight_kg, reps, rpe, created_at, workout_id')
    .eq('user_id', userId)
    .in('exercise', exerciseNames)
    .order('created_at', { ascending: false })
    .limit(50 * exerciseNames.length)

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to batch fetch exercise histories:', error)
    return map
  }

  for (const row of ((data || []) as (ExerciseHistorySet & { exercise: string })[])) {
    if (!map.has(row.exercise)) map.set(row.exercise, [])
    map.get(row.exercise)!.push(row)
  }

  return map
}

// Get previous session data for an exercise
export async function getExerciseHistory(exerciseName: string, userId: string): Promise<ExerciseHistorySet[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, rpe, created_at, workout_id')
    .eq('exercise', exerciseName)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to fetch exercise history:', error)
    return []
  }

  return (data as ExerciseHistorySet[] | null) || []
}
