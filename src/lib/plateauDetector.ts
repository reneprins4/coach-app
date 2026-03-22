import type { Workout, PlateauResult, PlateauWeekData, PlateauStatus } from '../types'
import { getLocalDateString } from './dateUtils'

export function detectPlateaus(workouts: Workout[]): PlateauResult[] {
  const exerciseData: Record<string, Record<string, number>> = {}

  // Groepeer e1RM per oefening per week
  for (const workout of workouts) {
    const week = getWeekKey(new Date(workout.created_at))
    for (const set of workout.workout_sets || []) {
      if (!set.weight_kg || !set.reps) continue
      if (!exerciseData[set.exercise]) exerciseData[set.exercise] = {}
      const e1rm = set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30)
      const exData = exerciseData[set.exercise]!
      if (!exData[week] || e1rm > exData[week]) {
        exData[week] = e1rm
      }
    }
  }

  const results: PlateauResult[] = []

  for (const [exercise, weekData] of Object.entries(exerciseData)) {
    const weeks = Object.keys(weekData).sort()
    if (weeks.length < 3) continue // niet genoeg data

    // Filter: alleen recente aaneengesloten trainingsblok gebruiken
    // Als er een gap > 2 weken zit, gebruik alleen de weken NA de gap
    const recentWeeks = getRecentTrainingWeeks(weeks, 6)
    if (recentWeeks.length < 3) continue // niet genoeg recente data
    const values = recentWeeks.map(w => weekData[w]!)

    // Bereken progressie rate per week (lineaire regressie slope)
    const slope = linearRegressionSlope(values)
    const avgValue = values.reduce((a: number, b: number) => a + b, 0) / values.length
    const relativeSlope = avgValue > 0 ? slope / avgValue : 0 // normaliseer

    // Vergelijk eerste helft vs tweede helft progressie
    const halfIdx = Math.floor(values.length / 2)
    const firstHalf = values.slice(0, halfIdx)
    const secondHalf = values.slice(halfIdx)
    const firstSlope = linearRegressionSlope(firstHalf)
    const secondSlope = linearRegressionSlope(secondHalf)

    const progressionSlowdown = firstSlope > 0 && secondSlope < firstSlope * 0.3
    const isStagnant = relativeSlope < 0.005 // minder dan 0.5% groei per week

    if (progressionSlowdown || isStagnant) {
      const status: PlateauStatus = isStagnant ? 'plateau' : 'slowing'
      const weeklyData: PlateauWeekData[] = recentWeeks.map((w, i) => ({
        week: formatWeekLabel(w),
        e1rm: Math.round(values[i]! * 10) / 10
      }))

      results.push({
        exercise,
        currentE1rm: Math.round(values[values.length - 1]! * 10) / 10,
        weeksOfData: recentWeeks.length,
        weeklyData,
        status,
        weeklyGrowthPct: (relativeSlope * 100).toFixed(1),
        recommendation: getPlateauRecommendation(exercise, isStagnant)
      })
    }
  }

  return results.sort((a, b) => {
    // Eerst op status (plateau ernstiger dan slowing)
    if (a.status !== b.status) return a.status === 'plateau' ? -1 : 1
    // Dan op aantal weken data (meer data = betrouwbaarder)
    return b.weeksOfData - a.weeksOfData
  })
}

function linearRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const sumX = n * (n - 1) / 2
  const sumX2 = n * (n - 1) * (2 * n - 1) / 6
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((acc, y, x) => acc + x * y, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

/**
 * Selecteer de laatste N weken met trainingsdata, maar knip af bij grote gaps.
 * Als er een gap van meer dan 2 weken tussen datapunten zit (vakantie/break),
 * gebruik alleen de weken na de laatste gap.
 */
function getRecentTrainingWeeks(sortedWeeks: string[], maxWeeks: number): string[] {
  if (sortedWeeks.length <= maxWeeks) {
    // Check for gaps even in small datasets
    return filterByGaps(sortedWeeks)
  }

  const candidate = sortedWeeks.slice(-maxWeeks)
  return filterByGaps(candidate)
}

function filterByGaps(weeks: string[]): string[] {
  if (weeks.length < 2) return weeks

  // Zoek de laatste gap > 2 weken en neem alleen weken erna
  for (let i = weeks.length - 1; i > 0; i--) {
    const curr = new Date(weeks[i]!)
    const prev = new Date(weeks[i - 1]!)
    const diffWeeks = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24 * 7)
    if (diffWeeks > 2) {
      return weeks.slice(i)
    }
  }

  return weeks
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return getLocalDateString(d)
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function getPlateauRecommendation(exercise: string, isFullPlateau: boolean): string {
  const lower = exercise.toLowerCase()

  if (/bench|press/.test(lower)) {
    if (isFullPlateau) {
      return 'Wissel naar incline of dumbbell press voor 2-3 weken.'
    }
    return 'Voeg paused reps toe of verhoog volume met een extra set.'
  }

  if (/squat/.test(lower)) {
    if (isFullPlateau) {
      return 'Probeer front squats of leg press als alternatief.'
    }
    return 'Focus op tempo training of box squats voor techniek.'
  }

  if (/dead/.test(lower)) {
    if (isFullPlateau) {
      return 'Wissel naar RDL of deficit deadlifts voor variatie.'
    }
    return 'Werk aan zwakke punten met accessory oefeningen.'
  }

  if (/row|pull/.test(lower)) {
    if (isFullPlateau) {
      return 'Varieer grip breedte of switch naar cable variant.'
    }
    return 'Focus op mind-muscle connection en lagere RPE.'
  }

  // Generieke aanbeveling
  if (isFullPlateau) {
    return 'Voeg 1-2 sets toe, of wissel naar een variatie voor 2-3 weken.'
  }
  return 'Progressie vertraagt. Overweeg volume verhoging of techniek focus.'
}
