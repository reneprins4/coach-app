/**
 * Fatigue detection — analyseert trainingsdata voor vermoeidheidssignalen
 * Detecteert RPE-drift, volume-daling en frequentiedaling
 */

import type { Workout, FatigueResult, FatigueSignal } from '../types'

export function detectFatigue(workouts: Workout[], weeksToCheck: number = 3): FatigueResult {
  // Kijk naar de laatste N weken data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksToCheck * 7)
  const recent = workouts.filter(w => new Date(w.created_at) >= cutoff)

  if (recent.length < 4) return { fatigued: false, score: 0, signals: [] }

  const signals: FatigueSignal[] = []
  let fatigueScore = 0

  // Signal 1: RPE drift — zelfde gewicht maar RPE stijgt over weken
  const rpeByWeek: Record<string, Record<string, number[]>> = {}
  for (const workout of recent) {
    const week = getWeekNumber(new Date(workout.created_at))
    for (const set of workout.workout_sets || []) {
      if (!set.rpe || !set.weight_kg) continue
      if (!rpeByWeek[set.exercise]) rpeByWeek[set.exercise] = {}
      const exWeekData = rpeByWeek[set.exercise]!
      if (!exWeekData[week]) exWeekData[week] = []
      exWeekData[week]!.push(set.rpe)
    }
  }

  for (const [exercise, weekData] of Object.entries(rpeByWeek)) {
    const weeks = Object.keys(weekData).sort()
    if (weeks.length < 2) continue
    const firstWeek = weeks[0]!
    const lastWeek = weeks[weeks.length - 1]!
    const firstAvg = avg(weekData[firstWeek] ?? [])
    const lastAvg = avg(weekData[lastWeek] ?? [])
    if (lastAvg - firstAvg >= 1.5) {
      signals.push({ type: 'rpe_drift', exercise, delta: Math.round((lastAvg - firstAvg) * 10) / 10 })
      fatigueScore += 2
    }
  }

  // Signal 2: Volume drop — gebruiker logt minder sets dan normaal
  const setsPerWorkout = recent.map(w => (w.workout_sets || []).length)
  if (setsPerWorkout.length >= 3) {
    const avgSets = avg(setsPerWorkout)
    const recentAvg = avg(setsPerWorkout.slice(-3))
    if (avgSets > 0 && recentAvg < avgSets * 0.75) {
      signals.push({ type: 'volume_drop', dropPct: Math.round((1 - recentAvg / avgSets) * 100) })
      fatigueScore += 1
    }
  }

  // Signal 3: Workout frequency drop
  const workoutsPerWeek = recent.length / weeksToCheck
  if (workoutsPerWeek < 2 && recent.length > 3) {
    signals.push({ type: 'frequency_drop', perWeek: workoutsPerWeek.toFixed(1) })
    fatigueScore += 1
  }

  return {
    fatigued: fatigueScore >= 2,
    score: fatigueScore,
    signals,
    recommendation: fatigueScore >= 3 ? 'urgent' : fatigueScore >= 2 ? 'suggested' : 'none'
  }
}

function avg(arr: number[]): number {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function getWeekNumber(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0] ?? ''
}
