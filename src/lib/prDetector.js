/**
 * Personal Record (PR) Detection
 * 
 * A PR is either:
 * - A new highest weight for a given exercise at a specific rep count (1RM, 3RM, 5RM, 10RM)
 * - A new highest estimated 1RM (e1RM = weight * (1 + reps/30))
 */

/**
 * Calculate estimated 1RM using Brzycki-style formula
 */
export function calculateE1RM(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * Detect if a new set is a Personal Record
 * @param {string} exerciseName - Name of the exercise
 * @param {number} weight - Weight lifted in kg
 * @param {number} reps - Number of reps performed
 * @param {Array} historicalSets - Array of { exercise, weight_kg, reps } from past workouts (not current)
 * @returns {{ isPR: boolean, type: 'weight' | 'e1rm', previousBest: number, newBest: number, improvement: number } | null}
 */
export function detectPR(exerciseName, weight, reps, historicalSets) {
  if (!weight || weight <= 0 || !reps || reps <= 0) return null
  if (!historicalSets || historicalSets.length === 0) return null

  // Filter to only this exercise
  const exerciseSets = historicalSets.filter(s => 
    s.exercise?.toLowerCase() === exerciseName.toLowerCase()
  )
  
  if (exerciseSets.length === 0) return null

  const newE1RM = calculateE1RM(weight, reps)
  
  // Find best historical e1RM
  let bestHistoricalE1RM = 0
  for (const set of exerciseSets) {
    const e1rm = calculateE1RM(set.weight_kg || 0, set.reps || 0)
    if (e1rm > bestHistoricalE1RM) {
      bestHistoricalE1RM = e1rm
    }
  }

  // Check for e1RM PR (most common type)
  if (newE1RM > bestHistoricalE1RM) {
    return {
      isPR: true,
      type: 'e1rm',
      previousBest: Math.round(bestHistoricalE1RM * 10) / 10,
      newBest: Math.round(newE1RM * 10) / 10,
      improvement: Math.round((newE1RM - bestHistoricalE1RM) * 10) / 10
    }
  }

  // Check for weight PR at same rep range (within ±1 rep)
  const sameRepSets = exerciseSets.filter(s => Math.abs((s.reps || 0) - reps) <= 1)
  if (sameRepSets.length > 0) {
    const bestWeightAtReps = Math.max(...sameRepSets.map(s => s.weight_kg || 0))
    if (weight > bestWeightAtReps) {
      return {
        isPR: true,
        type: 'weight',
        previousBest: bestWeightAtReps,
        newBest: weight,
        improvement: Math.round((weight - bestWeightAtReps) * 10) / 10
      }
    }
  }

  return null
}

/**
 * Format PR badge text
 * @param {{ type: string, improvement: number }} pr - PR detection result
 * @returns {string} Display string like "+5kg" or "Nieuw record"
 */
export function formatPRBadge(pr) {
  if (!pr) return ''
  if (pr.improvement > 0) {
    return `+${pr.improvement}kg`
  }
  return ''
}

/**
 * Compute all-time PRs from workout history
 * @param {Array} workouts - Array of workouts with workout_sets
 * @returns {Map<string, { bestWeight: number, bestReps: number, bestE1RM: number, date: string, muscleGroup: string }>}
 */
export function computeAllPRs(workouts) {
  const prs = new Map()
  
  if (!workouts || workouts.length === 0) return prs

  // Sort workouts by date ascending so we track progression
  const sortedWorkouts = [...workouts].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  )

  for (const workout of sortedWorkouts) {
    const sets = workout.workout_sets || []
    const workoutDate = workout.created_at

    for (const set of sets) {
      if (!set.exercise || !set.weight_kg || !set.reps) continue
      
      const exerciseName = set.exercise
      const weight = set.weight_kg
      const reps = set.reps
      const e1rm = calculateE1RM(weight, reps)
      
      const existing = prs.get(exerciseName)
      
      if (!existing) {
        prs.set(exerciseName, {
          bestWeight: weight,
          bestReps: reps,
          bestE1RM: Math.round(e1rm * 10) / 10,
          date: workoutDate,
          muscleGroup: getMuscleGroup(exerciseName)
        })
      } else {
        // Update if this is a new e1RM PR
        if (e1rm > existing.bestE1RM) {
          prs.set(exerciseName, {
            bestWeight: weight,
            bestReps: reps,
            bestE1RM: Math.round(e1rm * 10) / 10,
            date: workoutDate,
            muscleGroup: getMuscleGroup(exerciseName)
          })
        }
      }
    }
  }

  return prs
}

/**
 * Get muscle group from exercise name
 */
function getMuscleGroup(name) {
  const l = name.toLowerCase()
  if (/bench|chest|fly|dip|push.?up/.test(l)) return 'chest'
  if (/squat|leg|lunge|hip|calf|extension|curl(?!.*(bicep|hammer|dumbbell))/.test(l)) return 'legs'
  if (/dead|row|pull|lat|back/.test(l)) return 'back'
  if (/press(?!.*bench)|shoulder|lateral|raise|face|shrug/.test(l)) return 'shoulders'
  if (/curl|bicep|tricep|hammer|skull|pushdown/.test(l)) return 'arms'
  if (/plank|ab|crunch|core/.test(l)) return 'core'
  return 'other'
}

/**
 * Convert PRs map to sorted array for display
 * @param {Map} prsMap - Map from computeAllPRs
 * @returns {Array} Sorted array of PR records, most recent first
 */
export function sortPRsForDisplay(prsMap) {
  const records = []
  
  for (const [exercise, data] of prsMap) {
    records.push({
      exercise,
      ...data
    })
  }

  // Sort by date descending (most recent PR first)
  return records.sort((a, b) => new Date(b.date) - new Date(a.date))
}
