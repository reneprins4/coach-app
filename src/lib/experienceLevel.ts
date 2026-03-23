/**
 * Experience-level awareness for workout generation.
 *
 * Scientifically, beginners should never be pushed to RPE 9.
 * Set counts and overload scaling also vary by training age.
 *
 * RPE caps (Helms et al., 2014):
 *   - complete_beginner / beginner / returning: RPE 7
 *   - intermediate: RPE 8.5
 *   - advanced: RPE 9.5
 *
 * Set counts (Schoenfeld et al., 2017 dose-response):
 *   - complete_beginner / returning: 2 compound, 2 isolation
 *   - beginner: 3 compound, 2 isolation
 *   - intermediate: 4 compound, 3 isolation
 *   - advanced: 4 compound, 3 isolation
 */

import type { ExperienceLevel } from '../types'

// ---- RPE cap per experience level ----

const RPE_CAPS: Record<ExperienceLevel, number> = {
  complete_beginner: 7,
  beginner: 7,
  returning: 7,
  intermediate: 8.5,
  advanced: 9.5,
}

/**
 * Maximum RPE target for a given experience level.
 * Beginners should never exceed RPE 7 — form and motor learning take priority.
 */
export function getRpeCap(experienceLevel: ExperienceLevel): number {
  return RPE_CAPS[experienceLevel]
}

// ---- Set count per experience level ----

/**
 * Returns the appropriate number of sets based on experience level,
 * whether the exercise is compound, and whether it is a deload week.
 */
export function getExperienceSets(
  isCompound: boolean,
  isDeload: boolean,
  level: ExperienceLevel,
): number {
  if (isDeload) return isCompound ? 2 : 1

  switch (level) {
    case 'complete_beginner':
    case 'returning':
      return isCompound ? 2 : 2
    case 'beginner':
      return isCompound ? 3 : 2
    case 'intermediate':
    case 'advanced':
      return isCompound ? 4 : 3
  }
}

// ---- Overload scaling per experience level ----

/**
 * Multiplier applied to the percentage increase range for progressive overload.
 *
 * Beginners can tolerate larger jumps (nervous system adaptation dominates).
 * Advanced lifters need smaller increments (closer to genetic potential).
 *
 * Returns a multiplier applied to the midpoint of the percentage range:
 *   - complete_beginner / beginner: 1.5 (larger jumps)
 *   - returning: 1.25 (slightly faster than intermediate)
 *   - intermediate: 1.0 (baseline)
 *   - advanced: 0.75 (smaller increments)
 */
export function getOverloadMultiplier(level: ExperienceLevel): number {
  switch (level) {
    case 'complete_beginner':
    case 'beginner':
      return 1.5
    case 'returning':
      return 1.25
    case 'intermediate':
      return 1.0
    case 'advanced':
      return 0.75
  }
}
