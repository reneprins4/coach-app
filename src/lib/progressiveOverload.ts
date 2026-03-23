/**
 * Percentage-based progressive overload system.
 *
 * Replaces the fixed +2.5 kg approach with smarter, exercise-category-aware
 * progression that uses rep-progression-first and RPE-gated decisions.
 *
 * Weight increase tiers (applied when at top of rep range, RPE < 8):
 *   - Lower body compounds (squat, deadlift, hip thrust, leg press): 5-7.5%
 *   - Upper body compounds (bench, row, OHP):                        2.5-5%
 *   - Isolation exercises (curl, extension, fly, raise):              2.5-5%
 *
 * Decision flow:
 *   1. No history           -> estimate from bodyweight multiplier
 *   2. RPE >= 9.5           -> deload (-5%)
 *   3. RPE 8-9              -> maintain weight & reps
 *   4. RPE < 8, not at top  -> rep progression (add 1-2 reps, keep weight)
 *   5. RPE < 8, at top      -> weight increase + reset reps to bottom
 *
 * All weights are rounded to the nearest 2.5 kg.
 */

import type { MuscleGroup, ExperienceLevel } from '../types'
import { getOverloadMultiplier } from './experienceLevel'

// ---- Public types ----

export interface ProgressionInput {
  exercise: string
  previousWeight: number | null
  previousReps: number | null
  previousRpe: number | null
  targetRepRange: [number, number]
  muscleGroup: MuscleGroup
  /** Optional bodyweight in kg for first-time estimates. Default 80 kg. */
  bodyweightKg?: number
  /** Optional experience level for overload scaling. Default intermediate. */
  experienceLevel?: ExperienceLevel
}

export type ProgressionStrategy =
  | 'weight_increase'
  | 'rep_progression'
  | 'maintain'
  | 'deload'
  | 'estimate'

export interface ProgressionResult {
  suggestedWeight: number
  suggestedReps: number
  strategy: ProgressionStrategy
  reason: string
}

// ---- Exercise classification ----

const LOWER_BODY_COMPOUND_PATTERNS = [
  'squat', 'deadlift', 'hip thrust', 'leg press', 'hack squat',
  'lunge', 'split squat', 'romanian deadlift', 'front squat',
  'sumo deadlift', 'good morning',
]

const UPPER_BODY_COMPOUND_PATTERNS = [
  'bench press', 'barbell row', 'overhead press', 'pull-up', 'chin-up',
  'lat pulldown', 'seated row', 'cable row', 'dumbbell row',
  'incline press', 'close grip bench', 'dip', 'military press',
  'pendlay row', 't-bar row',
]

type ExerciseCategory = 'lower_compound' | 'upper_compound' | 'isolation'

function categoriseExercise(name: string, muscleGroup: MuscleGroup): ExerciseCategory {
  const lower = name.toLowerCase()

  if (LOWER_BODY_COMPOUND_PATTERNS.some(p => lower.includes(p))) {
    return 'lower_compound'
  }
  if (UPPER_BODY_COMPOUND_PATTERNS.some(p => lower.includes(p))) {
    return 'upper_compound'
  }

  // Fallback: if the muscle group is a lower-body group and we did not
  // match any isolation pattern, treat as lower compound only when
  // the exercise name includes compound-ish words.
  const lowerBodyGroups: MuscleGroup[] = ['quads', 'hamstrings', 'glutes']
  if (lowerBodyGroups.includes(muscleGroup)) {
    const compoundHints = ['press', 'squat', 'deadlift', 'thrust', 'lunge']
    if (compoundHints.some(h => lower.includes(h))) {
      return 'lower_compound'
    }
  }

  return 'isolation'
}

// ---- Percentage tiers ----

interface PercentageRange {
  min: number
  max: number
}

const INCREASE_TIERS: Record<ExerciseCategory, PercentageRange> = {
  lower_compound: { min: 0.05, max: 0.075 },
  upper_compound: { min: 0.025, max: 0.05 },
  isolation:      { min: 0.025, max: 0.05 },
}

// ---- Helpers ----

/** Round to nearest 2.5 kg, minimum 2.5 kg for non-zero results. */
function roundWeight(kg: number): number {
  const rounded = Math.round(kg / 2.5) * 2.5
  return Math.max(2.5, rounded)
}

/** Default bodyweight multipliers per muscle group for first-time estimates. */
const DEFAULT_BW_MULTIPLIERS: Partial<Record<MuscleGroup, number>> = {
  chest:      0.6,
  back:       0.5,
  shoulders:  0.3,
  quads:      0.8,
  hamstrings: 0.6,
  glutes:     0.8,
  biceps:     0.15,
  triceps:    0.2,
  core:       0.2,
}

// ---- Main function ----

export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const {
    exercise,
    previousWeight,
    previousReps,
    previousRpe,
    targetRepRange,
    muscleGroup,
    bodyweightKg = 80,
    experienceLevel = 'intermediate',
  } = input

  const [repMin, repMax] = targetRepRange

  // 1. No history -> estimate
  if (previousWeight == null || previousReps == null || previousRpe == null) {
    const mult = DEFAULT_BW_MULTIPLIERS[muscleGroup] ?? 0.3
    const estimated = roundWeight(bodyweightKg * mult)
    return {
      suggestedWeight: estimated,
      suggestedReps: repMin,
      strategy: 'estimate',
      reason: `No previous data. Estimated ${estimated}kg from bodyweight (${bodyweightKg}kg x ${mult}).`,
    }
  }

  // 2. RPE >= 9.5 -> deload (-5%)
  if (previousRpe >= 9.5) {
    const reduced = roundWeight(previousWeight * 0.95)
    return {
      suggestedWeight: reduced,
      suggestedReps: previousReps,
      strategy: 'deload',
      reason: `RPE ${previousRpe} too high. Reducing from ${previousWeight}kg to ${reduced}kg (-5%).`,
    }
  }

  // 3. RPE 8-9 -> maintain
  if (previousRpe >= 8) {
    return {
      suggestedWeight: previousWeight,
      suggestedReps: previousReps,
      strategy: 'maintain',
      reason: `RPE ${previousRpe} is in the productive range. Maintaining ${previousWeight}kg x ${previousReps}.`,
    }
  }

  // 4 & 5. RPE < 8 -> progress
  const atTopOfRange = previousReps >= repMax

  if (!atTopOfRange) {
    // 4. Rep progression first
    const addReps = previousRpe < 7 ? 2 : 1
    const newReps = Math.min(previousReps + addReps, repMax)
    return {
      suggestedWeight: previousWeight,
      suggestedReps: newReps,
      strategy: 'rep_progression',
      reason: `RPE ${previousRpe} with room in rep range. Adding ${addReps} rep(s): ${previousWeight}kg x ${newReps}.`,
    }
  }

  // 5. At top of rep range -> weight increase + reset reps
  const category = categoriseExercise(exercise, muscleGroup)
  const tier = INCREASE_TIERS[category]
  // Use the midpoint of the percentage range, scaled by experience level
  const overloadMult = getOverloadMultiplier(experienceLevel)
  const pct = ((tier.min + tier.max) / 2) * overloadMult
  const rawIncrease = previousWeight * pct
  // Ensure at least 2.5 kg increase
  const increase = Math.max(2.5, rawIncrease)
  const newWeight = roundWeight(previousWeight + increase)

  return {
    suggestedWeight: newWeight,
    suggestedReps: repMin,
    strategy: 'weight_increase',
    reason: `At top of rep range (${previousReps}/${repMax}) @RPE ${previousRpe}. Increasing ${previousWeight}kg -> ${newWeight}kg (+${Math.round(pct * 100)}%, ${category.replace('_', ' ')}), reset to ${repMin} reps.`,
  }
}
