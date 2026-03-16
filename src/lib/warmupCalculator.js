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

export const COMPOUND_EXERCISES = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull']
export const BAR_WEIGHT = 20

/**
 * Check if an exercise is a compound movement
 * @param {string} exerciseName - Name of the exercise
 * @returns {boolean}
 */
export function isCompound(exerciseName) {
  if (!exerciseName) return false
  const lower = exerciseName.toLowerCase()
  return COMPOUND_EXERCISES.some(k => lower.includes(k))
}

/**
 * Round weight to nearest 2.5kg
 * @param {number} weight - Weight in kg
 * @returns {number}
 */
function roundToPlate(weight) {
  return Math.round(weight / 2.5) * 2.5
}

/**
 * Calculate warmup sets for a compound lift
 * @param {number} workingWeight - Target working weight in kg
 * @param {number} workingReps - Target working reps (not used in standard protocol but kept for flexibility)
 * @returns {Array<{ weight_kg: number, reps: number, label: string, isBarOnly: boolean }>}
 */
export function calculateWarmupSets(workingWeight, workingReps = 8) {
  const warmupSets = []
  
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
