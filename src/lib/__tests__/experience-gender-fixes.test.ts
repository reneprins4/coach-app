/**
 * TDD tests for three bugs:
 * BUG 1: complete_beginner volume ceiling (falls through to intermediate 0.85x)
 * BUG 7: Gender-aware weight estimation (female/other not factored in)
 * BUG 8: Returning multiplier lower than beginner (0.55 < 0.6)
 */
import { describe, it, expect } from 'vitest'
import { getVolumeCeiling } from '../training-analysis'
import { generateLocalWorkout, LEVEL_MULTIPLIERS } from '../localWorkoutGenerator'
import { createMuscleStatusMap } from '../../__tests__/helpers'
import type { MuscleGroup, ExperienceLevel } from '../../types'

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    muscleStatus: createMuscleStatusMap(),
    recommendedSplit: 'Push' as string,
    recentHistory: [] as Array<{ date: string; sets: Array<{ exercise: string; weight_kg: number | null; reps: number | null; rpe: number | null }> }>,
    preferences: {
      goal: 'hypertrophy',
      trainingGoal: 'hypertrophy',
      experienceLevel: 'intermediate' as ExperienceLevel,
      bodyweight: '80',
      equipment: 'full_gym',
      energy: 'medium',
      time: 60,
      focusedMuscles: [] as MuscleGroup[],
      isDeload: false,
      targetRPE: null,
      targetRepRange: null,
      gender: 'male' as string,
      ...(overrides.preferences as Record<string, unknown> || {}),
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== 'preferences')),
  }
}

// ============================================================================
// BUG 1: complete_beginner volume ceiling
// ============================================================================

describe('BUG 1: complete_beginner volume ceiling', () => {
  it('complete_beginner gets 0.6x ceiling (same as beginner, not 0.85x)', () => {
    const cbCeiling = getVolumeCeiling('complete_beginner')
    const beginnerCeiling = getVolumeCeiling('beginner')

    // complete_beginner should have same ceiling as beginner (0.6x scale)
    expect(cbCeiling).toEqual(beginnerCeiling)
  })

  it('complete_beginner chest ceiling <= beginner chest ceiling', () => {
    const cbCeiling = getVolumeCeiling('complete_beginner')
    const beginnerCeiling = getVolumeCeiling('beginner')

    expect(cbCeiling['chest']).toBeLessThanOrEqual(beginnerCeiling['chest']!)
  })

  it('all experience levels have a defined ceiling (no fallthrough)', () => {
    const levels: string[] = ['complete_beginner', 'beginner', 'returning', 'intermediate', 'advanced']

    for (const level of levels) {
      const ceiling = getVolumeCeiling(level)
      // Every level should have a chest ceiling defined and > 0
      expect(ceiling['chest']).toBeGreaterThan(0)
    }

    // Verify complete_beginner does NOT get intermediate ceiling (0.85x)
    const cbCeiling = getVolumeCeiling('complete_beginner')
    const intermediateCeiling = getVolumeCeiling('intermediate')
    expect(cbCeiling['chest']).toBeLessThan(intermediateCeiling['chest']!)
  })
})

// ============================================================================
// BUG 7: Gender-aware weight estimation
// ============================================================================

// Helper: find a common weighted exercise across multiple workout results
function findCommonExercise(
  ...workouts: ReturnType<typeof generateLocalWorkout>[]
): { name: string; weights: number[] } | null {
  if (workouts.length < 2) return null
  const firstExNames = workouts[0]!.exercises.filter(e => e.weight_kg > 0).map(e => e.name)
  for (const name of firstExNames) {
    const weights = workouts.map(w => {
      const ex = w.exercises.find(e => e.name === name && e.weight_kg > 0)
      return ex?.weight_kg ?? null
    })
    if (weights.every((w): w is number => w != null)) {
      return { name, weights }
    }
  }
  return null
}

// Helper: retry generation until a common exercise is found across all gender variants
function generateWithCommonExercise(
  genders: (string | undefined)[],
  bodyweight: string,
  maxAttempts = 20,
): { name: string; weights: number[] } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const results = genders.map(gender =>
      generateLocalWorkout(makeInput({
        preferences: {
          experienceLevel: 'intermediate',
          bodyweight,
          gender,
        },
      }))
    )
    const common = findCommonExercise(...results)
    if (common) return common
  }
  return null
}

describe('BUG 7: Gender-aware weight estimation', () => {
  it('female 65kg gets lower bench estimate than male 65kg', () => {
    // Retry until both male and female generate a common weighted exercise
    const common = generateWithCommonExercise(['male', 'female'], '65')
    expect(common).toBeDefined()
    expect(common!.weights[1]).toBeLessThan(common!.weights[0]!)
  })

  it('female multiplier is approximately 0.6-0.7x of male', () => {
    const common = generateWithCommonExercise(['male', 'female'], '80')
    expect(common).toBeDefined()
    const ratio = common!.weights[1]! / common!.weights[0]!
    expect(ratio).toBeGreaterThanOrEqual(0.55)
    expect(ratio).toBeLessThanOrEqual(0.75)
  })

  it('male is the default/baseline (multiplier 1.0)', () => {
    const common = generateWithCommonExercise(['male', undefined], '80')
    expect(common).toBeDefined()
    expect(common!.weights[0]).toBe(common!.weights[1])
  })

  it('gender factor applies to all muscle groups', () => {
    const male = generateLocalWorkout(makeInput({
      recommendedSplit: 'Full Body',
      preferences: {
        experienceLevel: 'intermediate',
        bodyweight: '80',
        gender: 'male',
      },
    }))
    const female = generateLocalWorkout(makeInput({
      recommendedSplit: 'Full Body',
      preferences: {
        experienceLevel: 'intermediate',
        bodyweight: '80',
        gender: 'female',
      },
    }))

    // Every weighted exercise in female workout should be lighter than male equivalent
    for (const fEx of female.exercises) {
      if (fEx.weight_kg > 0) {
        const mEx = male.exercises.find(e => e.name === fEx.name)
        if (mEx && mEx.weight_kg > 0) {
          expect(fEx.weight_kg).toBeLessThanOrEqual(mEx.weight_kg)
        }
      }
    }
  })

  it('"other" gender uses average between male and female', () => {
    const common = generateWithCommonExercise(['male', 'female', 'other'], '80')
    expect(common).toBeDefined()
    const [maleW, femaleW, otherW] = common!.weights

    // "other" weight should be between male and female
    expect(otherW).toBeLessThanOrEqual(maleW!)
    expect(otherW).toBeGreaterThanOrEqual(femaleW!)
  })
})

// ============================================================================
// BUG 8: Returning multiplier vs beginner
// ============================================================================

describe('BUG 8: Returning multiplier vs beginner', () => {
  it('returning multiplier >= beginner multiplier', () => {
    expect(LEVEL_MULTIPLIERS.returning).toBeGreaterThanOrEqual(LEVEL_MULTIPLIERS.beginner)
  })

  it('returning gets 0.6 (same as beginner, not 0.55)', () => {
    expect(LEVEL_MULTIPLIERS.returning).toBe(0.6)
  })

  it('returning athlete starting weights are at least as high as beginner', () => {
    const beginner = generateLocalWorkout(makeInput({
      preferences: {
        experienceLevel: 'beginner',
        bodyweight: '80',
        gender: 'male',
      },
    }))
    const returning = generateLocalWorkout(makeInput({
      preferences: {
        experienceLevel: 'returning',
        bodyweight: '80',
        gender: 'male',
      },
    }))

    // Every exercise that exists in both should have returning >= beginner weight
    for (const rEx of returning.exercises) {
      const bEx = beginner.exercises.find(e => e.name === rEx.name)
      if (bEx && rEx.weight_kg > 0 && bEx.weight_kg > 0) {
        expect(rEx.weight_kg).toBeGreaterThanOrEqual(bEx.weight_kg)
      }
    }
  })
})
