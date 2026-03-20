/**
 * Calendar heatmap utilities.
 * Provides volume intensity calculation, split detection, split colors,
 * and heatmap data generation for the GitHub-style calendar view.
 */

import { classifyExercise } from './training-analysis'
import type { Workout, MuscleGroup } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VolumeIntensity = 0 | 1 | 2 | 3 // none, light, medium, heavy

export interface HeatmapDay {
  date: string // YYYY-MM-DD
  volume: number
  intensity: VolumeIntensity
  split: string | null
  splitColor: string
  workoutCount: number
}

// ---------------------------------------------------------------------------
// Volume intensity (relative to user's own average)
// ---------------------------------------------------------------------------

export function getVolumeIntensity(volume: number, avgVolume: number): VolumeIntensity {
  if (volume === 0) return 0
  if (volume < avgVolume * 0.7) return 1
  if (volume < avgVolume * 1.3) return 2
  return 3
}

// ---------------------------------------------------------------------------
// Split detection
// ---------------------------------------------------------------------------

const SPLIT_MUSCLE_SETS: Record<string, MuscleGroup[]> = {
  Push: ['chest', 'shoulders', 'triceps'],
  Pull: ['back', 'biceps'],
  Legs: ['quads', 'hamstrings', 'glutes'],
}

/**
 * Detect the training split from a list of exercise names.
 * Matches the primary muscle of each exercise against known split patterns.
 */
export function detectSplit(exerciseNames: string[]): string | null {
  if (exerciseNames.length === 0) return null

  // Count how many exercises hit each muscle group
  const muscleCounts: Partial<Record<MuscleGroup, number>> = {}
  for (const name of exerciseNames) {
    const muscle = classifyExercise(name)
    if (muscle) {
      muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1
    }
  }

  const muscles = Object.keys(muscleCounts) as MuscleGroup[]
  if (muscles.length === 0) return null

  // Check if muscles belong primarily to a specific split
  const upperMuscles: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
  const lowerMuscles: MuscleGroup[] = ['quads', 'hamstrings', 'glutes']

  const upperCount = muscles.filter(m => upperMuscles.includes(m)).length
  const lowerCount = muscles.filter(m => lowerMuscles.includes(m)).length
  const hasUpper = upperCount > 0
  const hasLower = lowerCount > 0

  // Full Body: significant mix of upper and lower
  if (hasUpper && hasLower && upperCount >= 2 && lowerCount >= 1) {
    return 'Full Body'
  }

  // Score each basic split (Push/Pull/Legs)
  let bestSplit = ''
  let bestScore = 0

  for (const [splitName, splitMuscles] of Object.entries(SPLIT_MUSCLE_SETS)) {
    let score = 0
    for (const muscle of muscles) {
      if (splitMuscles.includes(muscle)) {
        score += muscleCounts[muscle] || 0
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestSplit = splitName
    }
  }

  // If the best basic split covers most exercises, use it
  const totalExercises = Object.values(muscleCounts).reduce((a, b) => a + b, 0)
  if (bestScore >= totalExercises * 0.6) {
    return bestSplit
  }

  // Mixed upper body
  if (hasUpper && !hasLower && upperCount >= 2) {
    return 'Upper'
  }

  // Lower body
  if (hasLower && !hasUpper) {
    return 'Lower'
  }

  // Fallback to best scoring split
  return bestSplit || null
}

// ---------------------------------------------------------------------------
// Split colors
// ---------------------------------------------------------------------------

const SPLIT_COLORS: Record<string, string> = {
  Push: '#06b6d4',       // cyan
  Pull: '#a855f7',       // purple
  Legs: '#22c55e',       // green
  Upper: '#3b82f6',      // blue
  Lower: '#f97316',      // orange
  'Full Body': '#ffffff', // white
}

export function getSplitColor(split: string | null): string {
  return SPLIT_COLORS[split || ''] || '#6b7280' // gray fallback
}

// ---------------------------------------------------------------------------
// Heatmap data builder
// ---------------------------------------------------------------------------

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildHeatmapData(workouts: Workout[], days: number = 365): HeatmapDay[] {
  // Group workouts by date
  const workoutsByDate: Record<string, Workout[]> = {}
  for (const w of workouts) {
    const d = new Date(w.created_at)
    const key = formatDateKey(d)
    if (!workoutsByDate[key]) workoutsByDate[key] = []
    workoutsByDate[key].push(w)
  }

  // Calculate average volume across workout days for relative intensity
  const dailyVolumes: number[] = []
  for (const dateWorkouts of Object.values(workoutsByDate)) {
    const vol = dateWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0)
    if (vol > 0) dailyVolumes.push(vol)
  }
  const avgVolume = dailyVolumes.length > 0
    ? dailyVolumes.reduce((a, b) => a + b, 0) / dailyVolumes.length
    : 1

  // Build array of days going back from today
  const result: HeatmapDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = formatDateKey(date)
    const dateWorkouts = workoutsByDate[key] || []

    const volume = dateWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0)
    const allExercises = dateWorkouts.flatMap(w => w.exerciseNames || [])
    const split = detectSplit(allExercises)

    result.push({
      date: key,
      volume,
      intensity: getVolumeIntensity(volume, avgVolume),
      split,
      splitColor: getSplitColor(split),
      workoutCount: dateWorkouts.length,
    })
  }

  return result
}
