import type { ActiveExercise } from '../types'

/**
 * Trim a workout to a target number of exercises.
 *
 * Rules:
 * 1. Keep the first `targetCount` exercises (regardless of started/unstarted).
 * 2. Beyond that position, keep any exercise that already has logged sets.
 * 3. Remove unstarted exercises beyond the target window (isolations are typically last).
 * 4. Original exercise order is preserved.
 */
export function trimWorkout(
  exercises: ActiveExercise[],
  targetCount: number,
): ActiveExercise[] {
  if (exercises.length === 0) return []

  return exercises.filter((exercise, index) => {
    // Always keep exercises within the target window
    if (index < targetCount) return true

    // Beyond the window, only keep exercises that have logged sets
    return exercise.sets.length > 0
  })
}
