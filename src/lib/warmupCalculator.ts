/**
 * Warmup Sets Calculator
 *
 * Standard warmup protocol for compound lifts:
 * - Set 1: bar only (20kg) x 10
 * - Set 2: 40% of working weight x 8
 * - Set 3: 60% of working weight x 5
 * - Set 4: 80% of working weight x 3
 * - Set 5: 90% of working weight x 1 (only if working weight > 80kg)
 */

import type { WarmupSet } from '../types'

export const COMPOUND_EXERCISES: string[] = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull']
export const BAR_WEIGHT = 20

/**
 * Check if an exercise is a compound movement
 */
export function isCompound(exerciseName: string): boolean {
  if (!exerciseName) return false
  const lower = exerciseName.toLowerCase()
  return COMPOUND_EXERCISES.some(k => lower.includes(k))
}

/**
 * Round weight to nearest 2.5kg
 */
function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5
}

/**
 * Generate exercise-aware warm-up sets with tiered progression.
 *
 * - Returns empty array for isolation exercises or weight <= bar.
 * - Light (≤30kg): 1 set at 50%.
 * - Medium (30-60kg): bar + ~70%.
 * - Heavy (>60kg): bar, ~50%, ~70%, ~85% with reps 10, 6, 4, 2.
 *
 * All weights rounded to nearest 2.5kg.
 */
export function generateWarmupSets(exercise: string, workingWeight: number): WarmupSet[] {
  if (!isCompound(exercise)) return []
  if (!workingWeight || workingWeight <= BAR_WEIGHT) return []

  const sets: WarmupSet[] = []

  if (workingWeight <= 30) {
    // Light: 1 set at ~50%
    const w = roundToPlate(workingWeight * 0.5)
    if (w >= BAR_WEIGHT) {
      sets.push({ weight_kg: w, reps: 10, label: 'Warmup', isBarOnly: w === BAR_WEIGHT, isWarmup: true })
    }
  } else if (workingWeight <= 60) {
    // Medium: bar + ~70%
    sets.push({ weight_kg: BAR_WEIGHT, reps: 10, label: 'Warmup', isBarOnly: true, isWarmup: true })
    const w70 = roundToPlate(workingWeight * 0.7)
    if (w70 > BAR_WEIGHT) {
      sets.push({ weight_kg: w70, reps: 6, label: 'Warmup', isBarOnly: false, isWarmup: true })
    }
  } else {
    // Heavy (>60kg): bar, ~50%, ~70%, ~85% with reps 10, 6, 4, 2
    const percentages = [0.5, 0.7, 0.85] as const
    const reps = [6, 4, 2] as const

    sets.push({ weight_kg: BAR_WEIGHT, reps: 10, label: 'Warmup', isBarOnly: true, isWarmup: true })

    let lastWeight = BAR_WEIGHT
    for (let i = 0; i < percentages.length; i++) {
      const w = roundToPlate(workingWeight * percentages[i]!)
      if (w > lastWeight && w < workingWeight) {
        sets.push({ weight_kg: w, reps: reps[i]!, label: 'Warmup', isBarOnly: false, isWarmup: true })
        lastWeight = w
      }
    }
  }

  return sets
}

/**
 * Calculate warmup sets for a compound lift
 */
export function calculateWarmupSets(workingWeight: number, _workingReps: number = 8): WarmupSet[] {
  const warmupSets: WarmupSet[] = []

  if (!workingWeight || workingWeight <= BAR_WEIGHT) {
    // If working weight is bar or less, no warmup needed
    return []
  }

  // Set 1: Bar only (20kg) x 10
  warmupSets.push({
    weight_kg: BAR_WEIGHT,
    reps: 10,
    label: 'Warmup',
    isBarOnly: true
  })

  // Set 2: 40% of working weight x 8
  const set2Weight = roundToPlate(workingWeight * 0.4)
  if (set2Weight > BAR_WEIGHT) {
    warmupSets.push({
      weight_kg: set2Weight,
      reps: 8,
      label: 'Warmup',
      isBarOnly: false
    })
  }

  // Set 3: 60% of working weight x 5
  const set3Weight = roundToPlate(workingWeight * 0.6)
  if (set3Weight > BAR_WEIGHT && set3Weight > set2Weight) {
    warmupSets.push({
      weight_kg: set3Weight,
      reps: 5,
      label: 'Warmup',
      isBarOnly: false
    })
  }

  // Set 4: 80% of working weight x 3
  const set4Weight = roundToPlate(workingWeight * 0.8)
  if (set4Weight > BAR_WEIGHT && set4Weight > set3Weight) {
    warmupSets.push({
      weight_kg: set4Weight,
      reps: 3,
      label: 'Warmup',
      isBarOnly: false
    })
  }

  // Set 5: 90% of working weight x 1 (only if working weight > 80kg)
  if (workingWeight > 80) {
    const set5Weight = roundToPlate(workingWeight * 0.9)
    if (set5Weight > set4Weight) {
      warmupSets.push({
        weight_kg: set5Weight,
        reps: 1,
        label: 'Warmup',
        isBarOnly: false
      })
    }
  }

  return warmupSets
}
