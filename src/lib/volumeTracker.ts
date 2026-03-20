/**
 * Volume tracking utilities for training analysis.
 * Total volume = sum of (weight_kg * reps) for all sets in a workout
 */

import { classifyExercise } from './training-analysis'
import type { Workout, WeeklyVolumeEntry, MonthlyVolumeEntry, VolumeTrend } from '../types'

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the first day of the month containing the given date
 */
function getMonthStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Calculate total volume for a workout
 */
function calcWorkoutVolume(workout: Workout): number {
  const sets = workout.workout_sets || []
  return sets.reduce((sum, s) => sum + ((s.weight_kg || 0) * (s.reps || 0)), 0)
}

/**
 * Group workouts by week (Mon-Sun) and sum volume
 */
export function groupVolumeByWeek(workouts: Workout[], weeksBack: number = 12): WeeklyVolumeEntry[] {
  if (!workouts || workouts.length === 0) return []

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  // Group workouts by week
  const weekMap = new Map<string, { weekStart: Date; totalVolume: number; workoutCount: number }>()

  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    if (workoutDate < cutoff) continue

    const weekStart = getWeekStart(workoutDate)
    const weekKey = weekStart.toISOString()
    const volume = calcWorkoutVolume(w)

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { weekStart, totalVolume: 0, workoutCount: 0 })
    }
    const entry = weekMap.get(weekKey)!
    entry.totalVolume += volume
    entry.workoutCount += 1
  }

  // Convert to array and sort oldest to newest
  const weeks = Array.from(weekMap.values())
    .filter(w => w.workoutCount > 0)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

  // Add labels
  const currentWeekStart = getWeekStart(now)
  return weeks.map(w => {
    const diffWeeks = Math.round((currentWeekStart.getTime() - w.weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    let label: string
    if (diffWeeks === 0) label = 'Nu'
    else if (diffWeeks === 1) label = '-1w'
    else label = `-${diffWeeks}w`

    return {
      label,
      weekStart: w.weekStart,
      totalVolume: Math.round(w.totalVolume),
      workoutCount: w.workoutCount,
    }
  })
}

/**
 * Group workouts by month and sum volume
 */
export function groupVolumeByMonth(workouts: Workout[], monthsBack: number = 6): MonthlyVolumeEntry[] {
  if (!workouts || workouts.length === 0) return []

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - monthsBack)

  // Group workouts by month
  const monthMap = new Map<string, { month: Date; totalVolume: number; workoutCount: number }>()

  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    if (workoutDate < cutoff) continue

    const monthStart = getMonthStart(workoutDate)
    const monthKey = monthStart.toISOString()
    const volume = calcWorkoutVolume(w)

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { month: monthStart, totalVolume: 0, workoutCount: 0 })
    }
    const entry = monthMap.get(monthKey)!
    entry.totalVolume += volume
    entry.workoutCount += 1
  }

  // Convert to array and sort oldest to newest
  const months = Array.from(monthMap.values())
    .filter(m => m.workoutCount > 0)
    .sort((a, b) => a.month.getTime() - b.month.getTime())

  // Add labels (short month names)
  const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  return months.map(m => ({
    label: monthNames[m.month.getMonth()] ?? '',
    month: m.month,
    totalVolume: Math.round(m.totalVolume),
    workoutCount: m.workoutCount,
  }))
}

/**
 * Group volume by muscle group (using sets count, not kg)
 */
export function groupVolumeByMuscle(workouts: Workout[], weeksBack: number = 4): Record<string, number> {
  if (!workouts || workouts.length === 0) return {}

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  const muscleSets: Record<string, number> = {}

  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    if (workoutDate < cutoff) continue

    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (muscle) {
        muscleSets[muscle] = (muscleSets[muscle] || 0) + 1
      }
    }
  }

  return muscleSets
}

/**
 * Calculate trend percentage (last period vs previous period)
 */
export function calcTrend(data: { totalVolume: number }[], periodSize: number = 4): VolumeTrend {
  if (!data || data.length < 2) return { direction: 'flat', pct: 0 }

  // Split into current and previous periods
  const recentStart = Math.max(0, data.length - periodSize)
  const prevEnd = recentStart
  const prevStart = Math.max(0, prevEnd - periodSize)

  if (prevStart === prevEnd) return { direction: 'flat', pct: 0 }

  const recentVol = data.slice(recentStart).reduce((sum, d) => sum + d.totalVolume, 0)
  const prevVol = data.slice(prevStart, prevEnd).reduce((sum, d) => sum + d.totalVolume, 0)

  if (prevVol === 0) return { direction: 'flat', pct: 0 }

  const pct = Math.round(((recentVol - prevVol) / prevVol) * 100)

  if (pct > 5) return { direction: 'up', pct: Math.abs(pct) }
  if (pct < -5) return { direction: 'down', pct: Math.abs(pct) }
  return { direction: 'flat', pct: 0 }
}

/**
 * Calculate average weekly volume
 */
export function calcAvgWeeklyVolume(weeklyData: { totalVolume: number }[]): number {
  if (!weeklyData || weeklyData.length === 0) return 0
  const total = weeklyData.reduce((sum, w) => sum + w.totalVolume, 0)
  return Math.round(total / weeklyData.length)
}

/**
 * Find the best (highest volume) week
 */
export function findBestWeek(weeklyData: { label: string; totalVolume: number }[]): { label: string; totalVolume: number } | null {
  if (!weeklyData || weeklyData.length === 0) return null
  return weeklyData.reduce<{ label: string; totalVolume: number } | null>((best, w) =>
    w.totalVolume > (best?.totalVolume || 0) ? w : best
  , null)
}
