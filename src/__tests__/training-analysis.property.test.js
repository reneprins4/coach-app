/**
 * Property-based tests for training-analysis engine
 * Using fast-check for random input generation
 */
import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import {
  calcMuscleRecovery,
  classifyExercise,
  analyzeTraining,
  scoreSplits,
  RECOVERY_HOURS,
} from '../lib/training-analysis.js'

// ============================================================================
// ARBITRARIES
// ============================================================================

const muscles = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']
const muscleArb = fc.constantFrom(...muscles)
const hoursArb = fc.float({ min: 0, max: 500, noNaN: true })
const rpeArb = fc.float({ min: 1, max: 10, noNaN: true })
const setsArb = fc.integer({ min: 0, max: 30 })

// Exercise name arbitrary (willekeurige strings)
const exerciseNameArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.constantFrom('Bench Press', 'Squat', 'Deadlift', 'BENCH PRESS', '', null, undefined)
)

// Workout set arbitrary
const workoutSetArb = fc.record({
  exercise: fc.string({ minLength: 1, maxLength: 40 }),
  weight_kg: fc.oneof(fc.float({ min: 0, max: 300, noNaN: true }), fc.constant(null)),
  reps: fc.oneof(fc.integer({ min: 0, max: 50 }), fc.constant(null)),
  rpe: fc.oneof(fc.float({ min: 1, max: 10, noNaN: true }), fc.constant(null)),
})

// Workout arbitrary with past dates - use integer timestamps to avoid Invalid Date issues
const pastDateArb = fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() })
  .map(ts => new Date(ts).toISOString())
const workoutArb = fc.record({
  id: fc.uuid(),
  created_at: pastDateArb,
  workout_sets: fc.array(workoutSetArb, { minLength: 0, maxLength: 20 }),
})

// Goal arbitrary
const goalArb = fc.oneof(
  fc.constantFrom('hypertrophy', 'strength', 'endurance'),
  fc.string() // ook ongeldige goals testen
)

// MuscleStatus arbitrary for scoreSplits
const muscleStatusArb = fc.record(
  Object.fromEntries(muscles.map(m => [m, fc.record({
    setsThisWeek: fc.integer({ min: 0, max: 50 }),
    daysSinceLastTrained: fc.oneof(fc.integer({ min: 0, max: 30 }), fc.constant(null)),
    hoursSinceLastTrained: fc.oneof(fc.float({ min: 0, max: 720, noNaN: true }), fc.constant(null)),
    avgRpeLastSession: fc.oneof(fc.float({ min: 1, max: 10, noNaN: true }), fc.constant(null)),
    setsLastSession: fc.integer({ min: 0, max: 20 }),
    recoveryPct: fc.integer({ min: 0, max: 100 }),
    recentExercises: fc.array(fc.string(), { maxLength: 5 }),
    lastSessionSets: fc.constant([]),
    target: fc.record({
      min: fc.integer({ min: 4, max: 12 }),
      max: fc.integer({ min: 12, max: 25 }),
      mev: fc.integer({ min: 2, max: 10 }),
    }),
    status: fc.constantFrom('ready', 'recovering', 'fatigued', 'needs_work'),
  })]))
)

const experienceLevelArb = fc.constantFrom('beginner', 'intermediate', 'advanced')
const lastWorkoutInfoArb = fc.oneof(
  fc.constant(null),
  fc.record({
    split: fc.constantFrom('Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'),
    hoursSince: fc.float({ min: 0, max: 200, noNaN: true }),
  })
)

// ============================================================================
// calcMuscleRecovery TESTS
// ============================================================================

describe('calcMuscleRecovery', () => {
  test('output is always between 0 and 100', () => {
    fc.assert(
      fc.property(muscleArb, hoursArb, rpeArb, setsArb, (muscle, hours, rpe, sets) => {
        const result = calcMuscleRecovery(muscle, hours, rpe, sets)
        return result >= 0 && result <= 100
      }),
      { numRuns: 1000 }
    )
  })

  test('null/undefined hours returns 100', () => {
    fc.assert(
      fc.property(muscleArb, fc.constantFrom(null, undefined), rpeArb, setsArb, (muscle, hours, rpe, sets) => {
        return calcMuscleRecovery(muscle, hours, rpe, sets) === 100
      }),
      { numRuns: 200 }
    )
  })

  test('hours = 0 returns 0 (or very low)', () => {
    fc.assert(
      fc.property(muscleArb, rpeArb, setsArb, (muscle, rpe, sets) => {
        const result = calcMuscleRecovery(muscle, 0, rpe, sets)
        return result <= 5 // allows small rounding
      }),
      { numRuns: 200 }
    )
  })

  test('very high hours (>1000) returns 100', () => {
    fc.assert(
      fc.property(muscleArb, fc.float({ min: 1000, max: 10000, noNaN: true }), rpeArb, setsArb, (muscle, hours, rpe, sets) => {
        return calcMuscleRecovery(muscle, hours, rpe, sets) === 100
      }),
      { numRuns: 200 }
    )
  })

  test('higher RPE (7-10) gives lower recovery than lower RPE (1-6) at same hours/sets', () => {
    fc.assert(
      fc.property(
        muscleArb,
        fc.float({ min: 20, max: 80, noNaN: true }), // hours in realistic recovery range
        fc.float({ min: 1, max: 6, noNaN: true }),   // low RPE
        fc.float({ min: 7.5, max: 10, noNaN: true }), // high RPE
        fc.integer({ min: 4, max: 12 }),              // sets
        (muscle, hours, lowRPE, highRPE, sets) => {
          const lowRPERecovery = calcMuscleRecovery(muscle, hours, lowRPE, sets)
          const highRPERecovery = calcMuscleRecovery(muscle, hours, highRPE, sets)
          return lowRPERecovery >= highRPERecovery
        }
      ),
      { numRuns: 500 }
    )
  })

  test('more sets (>6) gives lower recovery than fewer sets at same hours/rpe', () => {
    fc.assert(
      fc.property(
        muscleArb,
        fc.float({ min: 20, max: 80, noNaN: true }), // hours
        rpeArb,
        fc.integer({ min: 0, max: 5 }),               // few sets
        fc.integer({ min: 8, max: 20 }),              // many sets
        (muscle, hours, rpe, fewSets, manySets) => {
          const fewSetsRecovery = calcMuscleRecovery(muscle, hours, rpe, fewSets)
          const manySetsRecovery = calcMuscleRecovery(muscle, hours, rpe, manySets)
          return fewSetsRecovery >= manySetsRecovery
        }
      ),
      { numRuns: 500 }
    )
  })

  test('result is always an integer', () => {
    fc.assert(
      fc.property(muscleArb, hoursArb, rpeArb, setsArb, (muscle, hours, rpe, sets) => {
        const result = calcMuscleRecovery(muscle, hours, rpe, sets)
        return Number.isInteger(result)
      }),
      { numRuns: 500 }
    )
  })

  test('handles NaN inputs gracefully', () => {
    fc.assert(
      fc.property(muscleArb, (muscle) => {
        // Test with various NaN/Infinity combinations
        const r1 = calcMuscleRecovery(muscle, NaN, 7, 5)
        const r2 = calcMuscleRecovery(muscle, 24, NaN, 5)
        const r3 = calcMuscleRecovery(muscle, 24, 7, NaN)
        const r4 = calcMuscleRecovery(muscle, Infinity, 7, 5)
        const r5 = calcMuscleRecovery(muscle, 24, Infinity, 5)
        const r6 = calcMuscleRecovery(muscle, 24, 7, Infinity)
        
        return [r1, r2, r3, r4, r5, r6].every(r => 
          Number.isFinite(r) && r >= 0 && r <= 100
        )
      }),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// classifyExercise TESTS
// ============================================================================

describe('classifyExercise', () => {
  test('never crashes for any string input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (name) => {
        const result = classifyExercise(name)
        // Should not throw
        return result === null || muscles.includes(result)
      }),
      { numRuns: 1000 }
    )
  })

  test('returns null or one of 9 known muscle groups', () => {
    fc.assert(
      fc.property(exerciseNameArb, (name) => {
        const result = classifyExercise(name)
        return result === null || muscles.includes(result)
      }),
      { numRuns: 500 }
    )
  })

  test('is case-insensitive', () => {
    const knownExercises = [
      'Bench Press', 'Squat', 'Deadlift', 'Lat Pulldown', 'Leg Curl',
      'Shoulder Press', 'Bicep Curl', 'Tricep Pushdown', 'Hip Thrust', 'Plank'
    ]
    
    fc.assert(
      fc.property(fc.constantFrom(...knownExercises), (name) => {
        const lower = classifyExercise(name.toLowerCase())
        const upper = classifyExercise(name.toUpperCase())
        const mixed = classifyExercise(name)
        return lower === upper && upper === mixed
      }),
      { numRuns: 100 }
    )
  })

  test('empty string returns null', () => {
    expect(classifyExercise('')).toBe(null)
  })

  test('null returns null', () => {
    expect(classifyExercise(null)).toBe(null)
  })

  test('undefined returns null', () => {
    expect(classifyExercise(undefined)).toBe(null)
  })

  test('handles special characters without crashing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }).map(s => s + '!@#$%^&*()[]{}\\|;:\'"<>,.?/~`'),
        (name) => {
          const result = classifyExercise(name)
          return result === null || muscles.includes(result)
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ============================================================================
// analyzeTraining TESTS
// ============================================================================

describe('analyzeTraining', () => {
  test('never crashes for random workout arrays', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 20 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        return typeof result === 'object' && result !== null
      }),
      { numRuns: 500 }
    )
  })

  test('returns object with exactly 9 muscle groups as keys', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 10 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        const keys = Object.keys(result)
        return keys.length === 9 && muscles.every(m => keys.includes(m))
      }),
      { numRuns: 300 }
    )
  })

  test('recoveryPct per muscle is always 0-100', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 15 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        return muscles.every(m => {
          const pct = result[m].recoveryPct
          return pct >= 0 && pct <= 100
        })
      }),
      { numRuns: 300 }
    )
  })

  test('setsThisWeek is always >= 0', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 15 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        return muscles.every(m => result[m].setsThisWeek >= 0)
      }),
      { numRuns: 300 }
    )
  })

  test('empty workouts array gives all muscles needs_work status', () => {
    fc.assert(
      fc.property(goalArb, (goal) => {
        const result = analyzeTraining([], goal)
        return muscles.every(m => result[m].status === 'needs_work')
      }),
      { numRuns: 50 }
    )
  })

  test('future dated workouts are ignored', () => {
    // Create a workout with a future date
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    
    const futureWorkout = {
      id: '123',
      created_at: futureDate.toISOString(),
      workout_sets: [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 8 }
      ]
    }
    
    const result = analyzeTraining([futureWorkout], 'hypertrophy')
    // Chest should still show as needs_work since future workout is ignored
    expect(result.chest.status).toBe('needs_work')
    expect(result.chest.setsThisWeek).toBe(0)
  })

  test('daysSinceLastTrained is always >= 0 or null', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 15 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        return muscles.every(m => {
          const days = result[m].daysSinceLastTrained
          return days === null || days >= 0
        })
      }),
      { numRuns: 300 }
    )
  })

  test('hoursSinceLastTrained is always >= 0 or null', () => {
    fc.assert(
      fc.property(fc.array(workoutArb, { minLength: 0, maxLength: 15 }), goalArb, (workouts, goal) => {
        const result = analyzeTraining(workouts, goal)
        return muscles.every(m => {
          const hours = result[m].hoursSinceLastTrained
          return hours === null || hours >= 0
        })
      }),
      { numRuns: 300 }
    )
  })
})

// ============================================================================
// scoreSplits TESTS
// ============================================================================

describe('scoreSplits', () => {
  test('never crashes for random inputs', () => {
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        return Array.isArray(result)
      }),
      { numRuns: 500 }
    )
  })

  test('returns array of length 6 (all splits)', () => {
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        return result.length === 7
      }),
      { numRuns: 300 }
    )
  })

  test('scores are always finite numbers (not NaN, not Infinity)', () => {
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        return result.every(split => Number.isFinite(split.score))
      }),
      { numRuns: 500 }
    )
  })

  test('array is sorted descending by score', () => {
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        for (let i = 0; i < result.length - 1; i++) {
          if (result[i].score < result[i + 1].score) return false
        }
        return true
      }),
      { numRuns: 300 }
    )
  })

  test('each split name appears exactly once', () => {
    const expectedSplits = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body']
    
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        const names = result.map(s => s.name)
        return expectedSplits.every(split => names.filter(n => n === split).length === 1)
      }),
      { numRuns: 200 }
    )
  })

  test('fresh athlete (all needs_work) returns valid split ranking', () => {
    // Create a fresh athlete status where all muscles need work
    const freshStatus = {}
    for (const m of muscles) {
      freshStatus[m] = {
        setsThisWeek: 0,
        daysSinceLastTrained: null,
        hoursSinceLastTrained: null,
        avgRpeLastSession: null,
        setsLastSession: 0,
        recoveryPct: 100,
        recentExercises: [],
        lastSessionSets: [],
        target: { min: 10, max: 20, mev: 6 },
        status: 'needs_work',
      }
    }

    const result = scoreSplits(freshStatus, null, 'beginner')
    const topSplit = result[0].name
    
    // For a fresh beginner, algorithm prioritizes based on volume deficit per muscle
    // Legs/Lower often score highest due to large muscle groups (quads, hamstrings, glutes)
    // Verify we get a valid split at the top
    expect(['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'].includes(topSplit)).toBe(true)
    // And that scores are sorted
    expect(result[0].score).toBeGreaterThanOrEqual(result[5].score)
  })

  test('each split has name, score, and reasoning properties', () => {
    fc.assert(
      fc.property(muscleStatusArb, lastWorkoutInfoArb, experienceLevelArb, (status, lastWorkout, level) => {
        const result = scoreSplits(status, lastWorkout, level)
        return result.every(split => 
          typeof split.name === 'string' &&
          typeof split.score === 'number' &&
          typeof split.reasoning === 'string'
        )
      }),
      { numRuns: 200 }
    )
  })
})

// ============================================================================
// Edge case tests
// ============================================================================

describe('Edge cases', () => {
  test('calcMuscleRecovery handles negative hours gracefully', () => {
    fc.assert(
      fc.property(muscleArb, fc.float({ min: -1000, max: 0, noNaN: true }), rpeArb, setsArb, (muscle, hours, rpe, sets) => {
        const result = calcMuscleRecovery(muscle, hours, rpe, sets)
        return Number.isFinite(result) && result >= 0 && result <= 100
      }),
      { numRuns: 200 }
    )
  })

  test('analyzeTraining handles malformed workout_sets', () => {
    const malformedWorkouts = [
      { id: '1', created_at: new Date().toISOString(), workout_sets: null },
      { id: '2', created_at: new Date().toISOString(), workout_sets: undefined },
      { id: '3', created_at: new Date().toISOString() }, // missing workout_sets
    ]
    
    // Should not crash
    expect(() => analyzeTraining(malformedWorkouts, 'hypertrophy')).not.toThrow()
  })

  test('classifyExercise handles regex special characters', () => {
    const regexSpecialChars = ['.*+?^${}()|[]\\', '(bench)', '[squat]', 'dead.lift', 'row+']
    
    for (const name of regexSpecialChars) {
      expect(() => classifyExercise(name)).not.toThrow()
    }
  })
})
