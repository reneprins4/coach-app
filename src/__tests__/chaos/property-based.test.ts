/**
 * Property-based tests using fast-check.
 *
 * Each describe block encodes mathematical invariants that must hold
 * for *all* valid inputs, not just a handful of hand-picked examples.
 * fast-check generates thousands of random inputs per property to
 * surface edge cases that example-based tests miss.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { calculateProgression } from '../../lib/progressiveOverload.js'
import {
  calcMuscleRecovery,
  getVolumeCeiling,
  MUSCLE_GROUPS,
} from '../../lib/training-analysis.js'
import { generateWarmupSets, isCompound } from '../../lib/warmupCalculator.js'
import { getTimeSlot } from '../../lib/optimalHour.js'
import {
  validateMeasurement,
  calculateTrend,
} from '../../lib/measurements.js'
import type { MeasurementType } from '../../lib/measurements.js'
import {
  normalizeExerciseName,
  areExercisesEquivalent,
} from '../../lib/exerciseAliases.js'
import { getLocalDateString } from '../../lib/dateUtils.js'
import { trimWorkout } from '../../lib/workoutTrimmer.js'
import type { ActiveExercise } from '../../types/index.js'

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

const muscleGroupArb = fc.constantFrom(
  'chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core',
) as fc.Arbitrary<'chest' | 'back' | 'shoulders' | 'quads' | 'hamstrings' | 'glutes' | 'biceps' | 'triceps' | 'core'>

/** Weight already rounded to 2.5 kg increments */
const roundedWeightArb = fc.integer({ min: 1, max: 120 }).map(n => n * 2.5)

/**
 * Exercise-name arbitrary that avoids JS prototype-pollution strings
 * like "__proto__", "constructor", "toString" which can break
 * Object.fromEntries / map lookups in non-safety-hardened code.
 */
const safeStringArb = fc.string({ minLength: 0, maxLength: 200 }).filter(
  s => !['__proto__', 'constructor', 'prototype'].includes(s.trim().toLowerCase()),
)

// ============================================================================
// Progressive Overload
// ============================================================================

describe('Property: Progressive Overload', () => {
  it('suggested weight is always rounded to 2.5 kg', () => {
    fc.assert(
      fc.property(
        roundedWeightArb.filter(w => w >= 2.5),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 50, max: 100 }).map(n => n / 10), // RPE 5.0-10.0
        muscleGroupArb,
        (weight, reps, rpe, muscleGroup) => {
          const result = calculateProgression({
            exercise: 'Bench Press',
            previousWeight: weight,
            previousReps: reps,
            previousRpe: rpe,
            targetRepRange: [6, 12] as [number, number],
            muscleGroup,
          })
          return result.suggestedWeight % 2.5 === 0
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('suggested weight is always positive (>= 2.5 kg)', () => {
    fc.assert(
      fc.property(
        roundedWeightArb.filter(w => w >= 2.5),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 50, max: 100 }).map(n => n / 10),
        muscleGroupArb,
        (weight, reps, rpe, muscleGroup) => {
          const result = calculateProgression({
            exercise: 'Squat',
            previousWeight: weight,
            previousReps: reps,
            previousRpe: rpe,
            targetRepRange: [4, 8] as [number, number],
            muscleGroup,
          })
          return result.suggestedWeight >= 2.5
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('deload never increases weight', () => {
    fc.assert(
      fc.property(
        roundedWeightArb.filter(w => w >= 20),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 95, max: 100 }).map(n => n / 10), // RPE 9.5-10.0
        (weight, reps, rpe) => {
          const result = calculateProgression({
            exercise: 'Bench Press',
            previousWeight: weight,
            previousReps: reps,
            previousRpe: rpe,
            targetRepRange: [6, 10] as [number, number],
            muscleGroup: 'chest',
          })
          // RPE >= 9.5 always triggers deload strategy
          return result.strategy === 'deload' && result.suggestedWeight <= weight
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('null previous data always produces estimate strategy', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.integer({ min: 40, max: 150 }),
        (muscleGroup, bw) => {
          const result = calculateProgression({
            exercise: 'Bench Press',
            previousWeight: null,
            previousReps: null,
            previousRpe: null,
            targetRepRange: [6, 12] as [number, number],
            muscleGroup,
            bodyweightKg: bw,
          })
          return result.strategy === 'estimate' && result.suggestedWeight % 2.5 === 0
        },
      ),
      { numRuns: 500 },
    )
  })

  it('weight increase only happens at top of rep range with RPE < 8', () => {
    fc.assert(
      fc.property(
        roundedWeightArb.filter(w => w >= 20),
        fc.integer({ min: 50, max: 79 }).map(n => n / 10), // RPE 5.0-7.9
        muscleGroupArb,
        (weight, rpe, muscleGroup) => {
          // Set reps = repMax (top of range) and RPE < 8
          const result = calculateProgression({
            exercise: 'Bench Press',
            previousWeight: weight,
            previousReps: 12,
            previousRpe: rpe,
            targetRepRange: [6, 12] as [number, number],
            muscleGroup,
          })
          return result.strategy === 'weight_increase' && result.suggestedWeight > weight
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('maintain strategy keeps weight and reps identical', () => {
    fc.assert(
      fc.property(
        roundedWeightArb.filter(w => w >= 20),
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 80, max: 94 }).map(n => n / 10), // RPE 8.0-9.4
        muscleGroupArb,
        (weight, reps, rpe, muscleGroup) => {
          const result = calculateProgression({
            exercise: 'Bench Press',
            previousWeight: weight,
            previousReps: reps,
            previousRpe: rpe,
            targetRepRange: [6, 12] as [number, number],
            muscleGroup,
          })
          return (
            result.strategy === 'maintain' &&
            result.suggestedWeight === weight &&
            result.suggestedReps === reps
          )
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('result always has a non-empty reason string', () => {
    fc.assert(
      fc.property(
        fc.oneof(roundedWeightArb, fc.constant(null as number | null)),
        fc.oneof(fc.integer({ min: 1, max: 20 }), fc.constant(null as number | null)),
        fc.oneof(fc.integer({ min: 50, max: 100 }).map(n => n / 10), fc.constant(null as number | null)),
        muscleGroupArb,
        (weight, reps, rpe, muscleGroup) => {
          const result = calculateProgression({
            exercise: 'Squat',
            previousWeight: weight,
            previousReps: reps,
            previousRpe: rpe,
            targetRepRange: [6, 12] as [number, number],
            muscleGroup,
          })
          return typeof result.reason === 'string' && result.reason.length > 0
        },
      ),
      { numRuns: 500 },
    )
  })
})

// ============================================================================
// Muscle Recovery
// ============================================================================

describe('Property: Muscle Recovery', () => {
  it('recovery is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.float({ min: 0, max: 500, noNaN: true }),
        fc.float({ min: 1, max: 10, noNaN: true }),
        fc.integer({ min: 0, max: 50 }),
        (muscle, hours, rpe, sets) => {
          const recovery = calcMuscleRecovery(muscle, hours, rpe, sets)
          return recovery >= 0 && recovery <= 100
        },
      ),
      { numRuns: 5000 },
    )
  })

  it('more hours always means equal or more recovery (monotonic)', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.integer({ min: 1, max: 30 }),
        fc.float({ min: 5, max: 10, noNaN: true }),
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 0, max: 200, noNaN: true }),
        (muscle, sets, rpe, h1, h2) => {
          const low = Math.min(h1, h2)
          const high = Math.max(h1, h2)
          const rLow = calcMuscleRecovery(muscle, low, rpe, sets)
          const rHigh = calcMuscleRecovery(muscle, high, rpe, sets)
          return rHigh >= rLow
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('null hours always returns 100', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.float({ min: 1, max: 10, noNaN: true }),
        fc.integer({ min: 0, max: 30 }),
        (muscle, rpe, sets) => {
          return calcMuscleRecovery(muscle, null, rpe, sets) === 100
        },
      ),
      { numRuns: 500 },
    )
  })

  it('result is always an integer', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.oneof(fc.float({ min: 0, max: 500, noNaN: true }), fc.constant(null as number | null)),
        fc.oneof(fc.float({ min: 1, max: 10, noNaN: true }), fc.constant(null as number | null)),
        fc.integer({ min: 0, max: 50 }),
        (muscle, hours, rpe, sets) => {
          const result = calcMuscleRecovery(muscle, hours, rpe, sets)
          return Number.isInteger(result)
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('handles NaN and Infinity inputs gracefully', () => {
    fc.assert(
      fc.property(muscleGroupArb, (muscle) => {
        const results = [
          calcMuscleRecovery(muscle, NaN, 7, 5),
          calcMuscleRecovery(muscle, 24, NaN, 5),
          calcMuscleRecovery(muscle, 24, 7, NaN),
          calcMuscleRecovery(muscle, Infinity, 7, 5),
          calcMuscleRecovery(muscle, -Infinity, 7, 5),
        ]
        return results.every(r => Number.isFinite(r) && r >= 0 && r <= 100)
      }),
      { numRuns: 100 },
    )
  })

  it('higher RPE yields equal or lower recovery at same hours/sets', () => {
    fc.assert(
      fc.property(
        muscleGroupArb,
        fc.float({ min: 10, max: 80, noNaN: true }),
        fc.integer({ min: 4, max: 15 }),
        fc.float({ min: 1, max: 6, noNaN: true }),
        fc.float({ min: 8, max: 10, noNaN: true }),
        (muscle, hours, sets, lowRpe, highRpe) => {
          const rLow = calcMuscleRecovery(muscle, hours, lowRpe, sets)
          const rHigh = calcMuscleRecovery(muscle, hours, highRpe, sets)
          return rLow >= rHigh
        },
      ),
      { numRuns: 2000 },
    )
  })
})

// ============================================================================
// Volume Ceiling
// ============================================================================

describe('Property: Volume Ceiling', () => {
  it('advanced ceiling >= intermediate >= beginner for every muscle group', () => {
    for (const m of MUSCLE_GROUPS) {
      const beg = getVolumeCeiling('beginner')[m]!
      const int = getVolumeCeiling('intermediate')[m]!
      const adv = getVolumeCeiling('advanced')[m]!
      expect(adv).toBeGreaterThanOrEqual(int)
      expect(int).toBeGreaterThanOrEqual(beg)
    }
  })

  it('all ceilings are positive integers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('beginner', 'intermediate', 'advanced'),
        (level) => {
          const ceilings = getVolumeCeiling(level)
          return MUSCLE_GROUPS.every(m => {
            const val = ceilings[m]
            return val !== undefined && val > 0 && Number.isInteger(val)
          })
        },
      ),
      { numRuns: 50 },
    )
  })

  it('returning experience level uses beginner scaling', () => {
    const returning = getVolumeCeiling('returning')
    const beginner = getVolumeCeiling('beginner')
    for (const m of MUSCLE_GROUPS) {
      expect(returning[m]).toBe(beginner[m])
    }
  })
})

// ============================================================================
// Time Slot
// ============================================================================

describe('Property: Time Slot', () => {
  const validSlots = ['06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22']

  it('any hour 0-23 maps to a valid time slot', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (hour, minute) => {
          const date = new Date(2026, 0, 1, hour, minute)
          const slot = getTimeSlot(date)
          return validSlots.includes(slot)
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('hours before 6 clamp to 06-08 slot', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (hour) => {
          const date = new Date(2026, 0, 1, hour, 0)
          return getTimeSlot(date) === '06-08'
        },
      ),
      { numRuns: 100 },
    )
  })

  it('hours at or after 22 clamp to 20-22 slot', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 22, max: 23 }),
        (hour) => {
          const date = new Date(2026, 0, 1, hour, 0)
          return getTimeSlot(date) === '20-22'
        },
      ),
      { numRuns: 50 },
    )
  })

  it('adjacent hours within the same 2-hour window return the same slot', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(6, 8, 10, 12, 14, 16, 18, 20),
        (hourStart) => {
          const d1 = new Date(2026, 0, 1, hourStart, 0)
          const d2 = new Date(2026, 0, 1, hourStart + 1, 30)
          return getTimeSlot(d1) === getTimeSlot(d2)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ============================================================================
// Warmup Calculator
// ============================================================================

describe('Property: Warmup Calculator', () => {
  it('warmup weights are always less than working weight', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 25, max: 300, noNaN: true }),
        (weight) => {
          const rounded = Math.round(weight / 2.5) * 2.5
          if (rounded <= 20) return true // no warmups generated for <= bar weight
          const warmups = generateWarmupSets('Barbell Squat', rounded)
          return warmups.every(w => w.weight_kg < rounded)
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('warmup weights are always rounded to 2.5 kg', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 30, max: 200, noNaN: true }),
        (weight) => {
          const rounded = Math.round(weight / 2.5) * 2.5
          if (rounded <= 20) return true
          const warmups = generateWarmupSets('Bench Press', rounded)
          return warmups.every(w => w.weight_kg % 2.5 === 0)
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('warmup set weights are in non-decreasing order', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 40, max: 300, noNaN: true }),
        (weight) => {
          const rounded = Math.round(weight / 2.5) * 2.5
          if (rounded <= 20) return true
          const warmups = generateWarmupSets('Barbell Squat', rounded)
          for (let i = 1; i < warmups.length; i++) {
            if (warmups[i]!.weight_kg < warmups[i - 1]!.weight_kg) return false
          }
          return true
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('isolation exercises never produce warmup sets', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 5, max: 200, noNaN: true }),
        fc.constantFrom('Bicep Curl', 'Lateral Raise', 'Tricep Extension', 'Leg Extension'),
        (weight, exercise) => {
          const warmups = generateWarmupSets(exercise, Math.round(weight / 2.5) * 2.5)
          return warmups.length === 0
        },
      ),
      { numRuns: 500 },
    )
  })

  it('compound detection is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('squat', 'SQUAT', 'Squat', 'bench press', 'BENCH PRESS', 'Deadlift'),
        (exercise) => {
          return isCompound(exercise) === true
        },
      ),
      { numRuns: 50 },
    )
  })

  it('all warmup sets have isWarmup flag set', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 40, max: 200, noNaN: true }),
        (weight) => {
          const rounded = Math.round(weight / 2.5) * 2.5
          if (rounded <= 20) return true
          const warmups = generateWarmupSets('Barbell Row', rounded)
          return warmups.every(w => w.isWarmup === true)
        },
      ),
      { numRuns: 1000 },
    )
  })
})

// ============================================================================
// Exercise Aliases
// ============================================================================

describe('Property: Exercise Aliases', () => {
  it('normalizeExerciseName is idempotent (normalizing twice gives same result)', () => {
    fc.assert(
      fc.property(
        safeStringArb.filter(s => s.length > 0),
        (name: string) => {
          const once = normalizeExerciseName(name)
          const twice = normalizeExerciseName(once)
          return once === twice
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('known aliases normalize to the same canonical form', () => {
    const aliasGroups = [
      ['bench', 'bench press', 'bb bench', 'flat bench', 'barbell bench press'],
      ['squat', 'squats', 'bb squat', 'barbell squat', 'back squats'],
      ['deadlift', 'deadlifts', 'conventional', 'bb deadlift'],
      ['ohp', 'overhead press', 'military press'],
      ['rdl', 'rdls', 'romanian', 'romanian deadlifts'],
    ]
    for (const group of aliasGroups) {
      const canonical = normalizeExerciseName(group[0]!)
      for (const alias of group) {
        expect(normalizeExerciseName(alias)).toBe(canonical)
      }
    }
  })

  it('areExercisesEquivalent is symmetric', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Bench Press', 'Squat', 'Deadlift', 'OHP', 'Row', 'Curl'),
        fc.constantFrom('Bench', 'BB Bench', 'Barbell Bench Press', 'Flat Bench'),
        (a, b) => {
          return areExercisesEquivalent(a, b) === areExercisesEquivalent(b, a)
        },
      ),
      { numRuns: 500 },
    )
  })

  it('areExercisesEquivalent is reflexive for non-empty names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Bench Press', 'Squat', 'Deadlift', 'Lateral Raise', 'Pull-up',
          'Barbell Row', 'Hip Thrust', 'Cable Curl',
        ),
        (name) => {
          return areExercisesEquivalent(name, name) === true
        },
      ),
      { numRuns: 100 },
    )
  })

  it('empty or whitespace-only names normalize to empty string', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t', '\n', '  \t\n  '),
        (name) => {
          return normalizeExerciseName(name) === ''
        },
      ),
      { numRuns: 20 },
    )
  })

  it('normalizeExerciseName never crashes on arbitrary safe strings', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        (name: string) => {
          const result = normalizeExerciseName(name)
          return typeof result === 'string'
        },
      ),
      { numRuns: 3000 },
    )
  })
})

// ============================================================================
// Workout Trimmer
// ============================================================================

describe('Property: Workout Trimmer', () => {
  /** Build a minimal ActiveExercise-like object for testing */
  function makeExercise(name: string, setsCount: number): ActiveExercise {
    const sets = Array.from({ length: setsCount }, () => ({
      id: 'set-1',
      weight_kg: 50,
      reps: 10,
      rpe: null,
      completed: false,
    }))
    return { name, sets, muscle_group: 'chest' } as unknown as ActiveExercise
  }

  it('trimmed length never exceeds original length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 }),
        fc.integer({ min: 1, max: 8 }),
        (total, target) => {
          const exercises = Array.from({ length: total }, (_, i) =>
            makeExercise(`Ex ${i}`, 0),
          )
          const trimmed = trimWorkout(exercises, target)
          return trimmed.length <= exercises.length
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('started exercises beyond the window are always preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 3 }),
        (total, target) => {
          // All exercises have sets (started), so all should be kept
          const exercises = Array.from({ length: total }, (_, i) =>
            makeExercise(`Ex ${i}`, 3),
          )
          const trimmed = trimWorkout(exercises, target)
          return trimmed.length === total
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('unstarted exercises beyond the window are removed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 12 }),
        fc.integer({ min: 1, max: 3 }),
        (total, target) => {
          // No exercises have sets (unstarted)
          const exercises = Array.from({ length: total }, (_, i) =>
            makeExercise(`Ex ${i}`, 0),
          )
          const trimmed = trimWorkout(exercises, target)
          return trimmed.length === Math.min(target, total)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('empty input returns empty output', () => {
    expect(trimWorkout([], 5)).toEqual([])
  })

  it('original exercise order is preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (total, target) => {
          const exercises = Array.from({ length: total }, (_, i) =>
            makeExercise(`Ex ${i}`, i % 2 === 0 ? 2 : 0),
          )
          const trimmed = trimWorkout(exercises, target)
          for (let i = 1; i < trimmed.length; i++) {
            const prevIdx = exercises.indexOf(trimmed[i - 1]!)
            const currIdx = exercises.indexOf(trimmed[i]!)
            if (currIdx <= prevIdx) return false
          }
          return true
        },
      ),
      { numRuns: 1000 },
    )
  })
})

// ============================================================================
// Date Utils
// ============================================================================

describe('Property: Date Utils', () => {
  // Use integer-based date generation to avoid fc.date edge cases with 32-bit float boundaries
  const dateArb = fc.integer({
    min: new Date(2020, 0, 1).getTime(),
    max: new Date(2030, 11, 31).getTime(),
  }).map(ts => new Date(ts))

  it('getLocalDateString always returns YYYY-MM-DD format', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const str = getLocalDateString(date)
        return /^\d{4}-\d{2}-\d{2}$/.test(str)
      }),
      { numRuns: 5000 },
    )
  })

  it('year-month-day components match the input date (local time)', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const str = getLocalDateString(date)
        const [y, m, d] = str.split('-').map(Number) as [number, number, number]
        return (
          y === date.getFullYear() &&
          m === date.getMonth() + 1 &&
          d === date.getDate()
        )
      }),
      { numRuns: 3000 },
    )
  })

  it('month is always 01-12 and day is always 01-31', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const str = getLocalDateString(date)
        const parts = str.split('-')
        const month = Number(parts[1])
        const day = Number(parts[2])
        return month >= 1 && month <= 12 && day >= 1 && day <= 31
      }),
      { numRuns: 2000 },
    )
  })
})

// ============================================================================
// Measurements
// ============================================================================

describe('Property: Measurements', () => {
  const measurementTypeArb = fc.constantFrom(
    'weight', 'waist', 'chest', 'arms', 'hips', 'thighs',
  ) as fc.Arbitrary<MeasurementType>

  it('validateMeasurement rejects all negative values', () => {
    fc.assert(
      fc.property(
        measurementTypeArb,
        fc.integer({ min: -10000, max: -1 }).map(n => n / 10), // -1000.0 to -0.1
        (type, value) => {
          const error = validateMeasurement(type, value)
          return error !== null
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('validateMeasurement rejects zero', () => {
    fc.assert(
      fc.property(measurementTypeArb, (type) => {
        return validateMeasurement(type, 0) !== null
      }),
      { numRuns: 50 },
    )
  })

  it('validateMeasurement rejects values above 500', () => {
    fc.assert(
      fc.property(
        measurementTypeArb,
        fc.integer({ min: 5001, max: 100000 }).map(n => n / 10), // 500.1 to 10000.0
        (type, value) => {
          return validateMeasurement(type, value) !== null
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('validateMeasurement accepts values in valid range per type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 3000 }).map(n => n / 10), // 20.0 to 300.0
        (value) => {
          // Weight range: 20-300 kg
          return validateMeasurement('weight', value) === null
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('validateMeasurement always returns string or null', () => {
    fc.assert(
      fc.property(
        measurementTypeArb,
        fc.integer({ min: -10000, max: 10000 }).map(n => n / 10),
        (type, value) => {
          const result = validateMeasurement(type, value)
          return result === null || typeof result === 'string'
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('calculateTrend with identical values is always "stable"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }).map(n => n / 10), // 0.1 to 200.0
        fc.integer({ min: 2, max: 20 }),
        (value, count) => {
          const values = Array(count).fill(value) as number[]
          const trend = calculateTrend(values)
          return trend === 'stable'
        },
      ),
      { numRuns: 2000 },
    )
  })

  it('calculateTrend returns null for fewer than 2 values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 2000 }).map(n => n / 10),
        (value) => {
          return calculateTrend([value]) === null && calculateTrend([]) === null
        },
      ),
      { numRuns: 200 },
    )
  })

  it('calculateTrend with strictly increasing values is "up"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }).map(n => n / 10),
        fc.integer({ min: 20, max: 500 }).map(n => n / 10),
        fc.integer({ min: 2, max: 10 }),
        (start, step, count) => {
          // Build a series where last > first by more than 1%
          const values = Array.from({ length: count }, (_, i) =>
            Math.round((start + i * step) * 10) / 10,
          )
          const first = values[0]!
          const last = values[values.length - 1]!
          const changePct = ((last - first) / first) * 100
          if (changePct <= 1) return true // skip cases where change is too small
          return calculateTrend(values) === 'up'
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('calculateTrend with strictly decreasing values is "down"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 2000 }).map(n => n / 10),
        fc.integer({ min: 20, max: 300 }).map(n => n / 10),
        fc.integer({ min: 2, max: 10 }),
        (start, step, count) => {
          const values = Array.from({ length: count }, (_, i) =>
            Math.round((start - i * step) * 10) / 10,
          )
          const first = values[0]!
          const last = values[values.length - 1]!
          if (first === 0) return true // avoid division by zero edge case
          const changePct = ((last - first) / first) * 100
          if (changePct >= -1) return true // skip cases where change is too small
          return calculateTrend(values) === 'down'
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('calculateTrend always returns one of the valid values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: 2000 }).map(n => n / 10), { minLength: 0, maxLength: 20 }),
        (values) => {
          const trend = calculateTrend(values)
          return trend === null || trend === 'up' || trend === 'down' || trend === 'stable'
        },
      ),
      { numRuns: 2000 },
    )
  })
})
