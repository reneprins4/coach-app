// ---------------------------------------------------------------------------
// Beginner Mode utilities
// Simplifies the app experience for users new to strength training.
// ---------------------------------------------------------------------------

export type SimpleRpe = 'easy' | 'medium' | 'hard'

/**
 * Determines whether the user should see the simplified beginner UI
 * based on their experience level setting.
 */
export function isBeginnerMode(experienceLevel: string): boolean {
  return experienceLevel === 'complete_beginner' || experienceLevel === 'beginner' || experienceLevel === 'returning'
}

/**
 * Maps a simple RPE label (Easy/Medium/Hard) to a numeric RPE value
 * that the rest of the app can work with.
 */
export function mapSimpleRpeToNumeric(simpleRpe: SimpleRpe): number {
  const map: Record<SimpleRpe, number> = { easy: 6, medium: 7.5, hard: 9 }
  return map[simpleRpe]
}

/**
 * Converts a numeric RPE value back to the simple label for display
 * in beginner mode.
 */
export function getSimpleRpeLabel(rpe: number): SimpleRpe {
  if (rpe <= 6.5) return 'easy'
  if (rpe <= 8) return 'medium'
  return 'hard'
}
