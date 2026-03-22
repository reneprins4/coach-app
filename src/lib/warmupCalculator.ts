/**
 * Warmup Sets Calculator
 *
 * Generates progressive warmup sets for compound lifts.
 * All weights rounded to nearest 2.5kg.
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
 * - Light (21-30kg): 1 set at bar weight (the only meaningful warmup).
 * - Medium (31-60kg): bar + ~70%.
 * - Heavy (>60kg): bar, ~50%, ~70%, ~85% with reps 10, 6, 4, 2.
 *
 * All weights rounded to nearest 2.5kg.
 */
export function generateWarmupSets(exercise: string, workingWeight: number): WarmupSet[] {
  if (!isCompound(exercise)) return []
  if (!workingWeight || workingWeight <= BAR_WEIGHT) return []

  const sets: WarmupSet[] = []

  if (workingWeight <= 30) {
    // Light: only a bar-weight warmup is meaningful
    // (50% of 21-30kg = 10.5-15kg, which rounds below bar weight)
    sets.push({ weight_kg: BAR_WEIGHT, reps: 10, label: 'Warmup', isBarOnly: true, isWarmup: true })
  } else if (workingWeight <= 60) {
    // Medium: bar + ~70%
    // 70% of 31-60kg = 21.7-42kg, always above bar weight
    sets.push({ weight_kg: BAR_WEIGHT, reps: 10, label: 'Warmup', isBarOnly: true, isWarmup: true })
    const w70 = roundToPlate(workingWeight * 0.7)
    sets.push({ weight_kg: w70, reps: 6, label: 'Warmup', isBarOnly: false, isWarmup: true })
  } else {
    // Heavy (>60kg): bar, ~50%, ~70%, ~85%
    // All percentages of 61kg+ produce weights well above bar weight
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
 * Calculate warmup sets using percentage-based progression.
 * Bar → 40% → 60% → 80% → 90% (90% only for >80kg working weight).
 */
export function calculateWarmupSets(workingWeight: number, _workingReps: number = 8): WarmupSet[] {
  if (!workingWeight || workingWeight <= BAR_WEIGHT) return []

  const warmupSets: WarmupSet[] = []

  // Set 1: Bar only x 10
  warmupSets.push({ weight_kg: BAR_WEIGHT, reps: 10, label: 'Warmup', isBarOnly: true })

  // Set 2: 40% x 8 (only if > bar weight)
  const set2Weight = roundToPlate(workingWeight * 0.4)
  if (set2Weight > BAR_WEIGHT) {
    warmupSets.push({ weight_kg: set2Weight, reps: 8, label: 'Warmup', isBarOnly: false })
  }

  // Set 3: 60% x 5 (only if above previous set)
  const set3Weight = roundToPlate(workingWeight * 0.6)
  const prevWeight2 = set2Weight > BAR_WEIGHT ? set2Weight : BAR_WEIGHT
  if (set3Weight > prevWeight2) {
    warmupSets.push({ weight_kg: set3Weight, reps: 5, label: 'Warmup', isBarOnly: false })
  }

  // Set 4: 80% x 3 (only if above previous set)
  const set4Weight = roundToPlate(workingWeight * 0.8)
  const prevWeight3 = set3Weight > prevWeight2 ? set3Weight : prevWeight2
  if (set4Weight > prevWeight3) {
    warmupSets.push({ weight_kg: set4Weight, reps: 3, label: 'Warmup', isBarOnly: false })
  }

  // Set 5: 90% x 1 (only for heavy working weights >80kg)
  if (workingWeight > 80) {
    const set5Weight = roundToPlate(workingWeight * 0.9)
    const prevWeight4 = set4Weight > prevWeight3 ? set4Weight : prevWeight3
    if (set5Weight > prevWeight4) {
      warmupSets.push({ weight_kg: set5Weight, reps: 1, label: 'Warmup', isBarOnly: false })
    }
  }

  return warmupSets
}
