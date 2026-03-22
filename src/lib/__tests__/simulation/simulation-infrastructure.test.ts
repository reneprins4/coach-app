/**
 * Smoke tests for the simulation test infrastructure.
 *
 * Validates that the data generators produce correctly shaped data
 * before any scenario tests rely on them.
 */

import { describe, it, expect } from 'vitest'
import {
  generateLinearProgression,
  generatePlateau,
  generateVacationGap,
  generatePPLCycle,
  generateFullBodyWorkouts,
} from './workoutGenerator'
import {
  EMMA, MARCUS, JAAP, TYLER, SOFIA, LENA,
  toSettings,
} from './userProfiles'
import type { Workout } from '../../../types'

// ---------------------------------------------------------------------------
// Helper: validate Workout shape
// ---------------------------------------------------------------------------

function assertValidWorkout(w: Workout): void {
  expect(w.id).toBeTruthy()
  expect(w.user_id).toBeTruthy()
  expect(w.split).toBeTruthy()
  expect(w.created_at).toBeTruthy()
  expect(new Date(w.created_at).getTime()).not.toBeNaN()
  expect(w.workout_sets.length).toBeGreaterThan(0)
  expect(w.exerciseNames.length).toBeGreaterThan(0)
  expect(typeof w.totalVolume).toBe('number')

  for (const set of w.workout_sets) {
    expect(set.id).toBeTruthy()
    expect(set.workout_id).toBe(w.id)
    expect(set.exercise).toBeTruthy()
    expect(typeof set.weight_kg).toBe('number')
    expect(typeof set.reps).toBe('number')
    expect(typeof set.rpe).toBe('number')
    expect(set.created_at).toBeTruthy()
  }
}

// ---------------------------------------------------------------------------
// generateLinearProgression
// ---------------------------------------------------------------------------

describe('generateLinearProgression', () => {
  it('creates correct number of workouts', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 4,
      sessionsPerWeek: 3,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.025,
    })
    expect(workouts).toHaveLength(12) // 4 weeks * 3 sessions
  })

  it('produces valid Workout objects', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press', 'Back Squat'],
      weeks: 2,
      sessionsPerWeek: 2,
      startWeights: { 'Bench Press': 60, 'Back Squat': 80 },
      weeklyIncreasePct: 0.025,
    })
    for (const w of workouts) {
      assertValidWorkout(w)
    }
  })

  it('increases weight over weeks', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 4,
      sessionsPerWeek: 1,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.05,
      setsPerExercise: 1,
    })

    const weights = workouts.map(w => w.workout_sets[0]!.weight_kg!)
    // Week 0 should be less than week 3
    expect(weights[0]).toBeLessThan(weights[3]!)
  })

  it('assigns unique IDs to all workouts and sets', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 2,
      sessionsPerWeek: 2,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.025,
    })
    const workoutIds = workouts.map(w => w.id)
    expect(new Set(workoutIds).size).toBe(workoutIds.length)

    const setIds = workouts.flatMap(w => w.workout_sets.map(s => s.id))
    expect(new Set(setIds).size).toBe(setIds.length)
  })

  it('spaces dates correctly across weeks', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 4,
      sessionsPerWeek: 3,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.025,
    })

    const dates = workouts.map(w => new Date(w.created_at).getTime())
    // Dates should be in ascending order
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]!)
    }

    // First and last workout should span roughly 4 weeks
    const spanDays = (dates[dates.length - 1]! - dates[0]!) / (1000 * 60 * 60 * 24)
    expect(spanDays).toBeGreaterThanOrEqual(20) // ~3 weeks minimum
    expect(spanDays).toBeLessThanOrEqual(35) // ~5 weeks maximum
  })

  it('calculates totalVolume correctly', () => {
    const workouts = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 1,
      sessionsPerWeek: 1,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0,
      repsPerSet: 10,
      setsPerExercise: 3,
    })

    const w = workouts[0]!
    const expectedVolume = 60 * 10 * 3 // weight * reps * sets
    expect(w.totalVolume).toBe(expectedVolume)
  })
})

// ---------------------------------------------------------------------------
// generatePlateau
// ---------------------------------------------------------------------------

describe('generatePlateau', () => {
  it('creates workouts with constant weight', () => {
    const workouts = generatePlateau({
      exercise: 'Flat Barbell Bench Press',
      weeks: 8,
      weight: 80,
      reps: 8,
    })

    expect(workouts.length).toBe(24) // 8 weeks * 3 sessions/week

    for (const w of workouts) {
      assertValidWorkout(w)
      const benchSets = w.workout_sets.filter(s => s.exercise === 'Flat Barbell Bench Press')
      for (const s of benchSets) {
        expect(s.weight_kg).toBe(80)
        expect(s.reps).toBe(8)
      }
    }
  })

  it('supports additional exercises that progress', () => {
    const workouts = generatePlateau({
      exercise: 'Bench Press',
      weeks: 4,
      weight: 80,
      reps: 8,
      otherExercises: [{ name: 'Back Squat', weight: 100 }],
    })

    const firstSquat = workouts[0]!.workout_sets.find(s => s.exercise === 'Back Squat')
    const lastSquat = workouts[workouts.length - 1]!.workout_sets.find(s => s.exercise === 'Back Squat')

    expect(firstSquat).toBeDefined()
    expect(lastSquat).toBeDefined()
    expect(lastSquat!.weight_kg!).toBeGreaterThanOrEqual(firstSquat!.weight_kg!)
  })
})

// ---------------------------------------------------------------------------
// generateVacationGap
// ---------------------------------------------------------------------------

describe('generateVacationGap', () => {
  it('inserts correct gap between before and after workouts', () => {
    const before = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 4,
      sessionsPerWeek: 3,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.025,
    })

    const after = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 2,
      sessionsPerWeek: 3,
      startWeights: { 'Bench Press': 65 },
      weeklyIncreasePct: 0.025,
    })

    const combined = generateVacationGap(before, 28, after)

    expect(combined.length).toBe(before.length + after.length)

    // Find the gap between the last before and first after workout
    const lastBeforeDate = new Date(before[before.length - 1]!.created_at)
    const firstAfterDate = new Date(combined[before.length]!.created_at)
    const gapDays = (firstAfterDate.getTime() - lastBeforeDate.getTime()) / (1000 * 60 * 60 * 24)

    expect(gapDays).toBeGreaterThanOrEqual(27)
    expect(gapDays).toBeLessThanOrEqual(29)
  })

  it('returns only before-workouts when no after provided', () => {
    const before = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 2,
      sessionsPerWeek: 2,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.025,
    })

    const result = generateVacationGap(before, 14)
    expect(result.length).toBe(before.length)
  })
})

// ---------------------------------------------------------------------------
// generatePPLCycle
// ---------------------------------------------------------------------------

describe('generatePPLCycle', () => {
  it('creates 6 sessions per week', () => {
    const workouts = generatePPLCycle({
      weeks: 2,
      startWeights: {
        'Flat Barbell Bench Press': 80,
        'Barbell Row': 70,
        'Back Squat': 100,
      },
      weeklyIncreasePct: 0.02,
    })

    expect(workouts.length).toBe(12) // 2 weeks * 6 sessions
  })

  it('alternates Push/Pull/Legs splits', () => {
    const workouts = generatePPLCycle({
      weeks: 1,
      startWeights: {},
      weeklyIncreasePct: 0.02,
    })

    expect(workouts[0]!.split).toBe('Push')
    expect(workouts[1]!.split).toBe('Pull')
    expect(workouts[2]!.split).toBe('Legs')
    expect(workouts[3]!.split).toBe('Push')
    expect(workouts[4]!.split).toBe('Pull')
    expect(workouts[5]!.split).toBe('Legs')
  })

  it('includes Face Pull on Pull days', () => {
    const workouts = generatePPLCycle({
      weeks: 1,
      startWeights: {},
      weeklyIncreasePct: 0.02,
    })

    const pullDays = workouts.filter(w => w.split === 'Pull')
    for (const pullDay of pullDays) {
      const hasFacePull = pullDay.exerciseNames.includes('Face Pull')
      expect(hasFacePull).toBe(true)
    }
  })

  it('produces valid Workout objects', () => {
    const workouts = generatePPLCycle({
      weeks: 1,
      startWeights: { 'Flat Barbell Bench Press': 80 },
      weeklyIncreasePct: 0.02,
    })

    for (const w of workouts) {
      assertValidWorkout(w)
    }
  })
})

// ---------------------------------------------------------------------------
// generateFullBodyWorkouts
// ---------------------------------------------------------------------------

describe('generateFullBodyWorkouts', () => {
  it('creates workouts with Full Body split', () => {
    const workouts = generateFullBodyWorkouts({
      exercises: ['Back Squat', 'Bench Press', 'Barbell Row'],
      weeks: 3,
      sessionsPerWeek: 3,
      startWeights: { 'Back Squat': 60, 'Bench Press': 40, 'Barbell Row': 40 },
      weeklyIncreasePct: 0.025,
    })

    expect(workouts.length).toBe(9)
    for (const w of workouts) {
      expect(w.split).toBe('Full Body')
      assertValidWorkout(w)
    }
  })
})

// ---------------------------------------------------------------------------
// User profiles
// ---------------------------------------------------------------------------

describe('userProfiles', () => {
  const profiles = [
    { profile: EMMA, name: 'Emma' },
    { profile: MARCUS, name: 'Marcus' },
    { profile: JAAP, name: 'Jaap' },
    { profile: TYLER, name: 'Tyler' },
    { profile: SOFIA, name: 'Sofia' },
    { profile: LENA, name: 'Lena' },
  ]

  for (const { profile, name } of profiles) {
    it(`${name}: toSettings produces valid UserSettings`, () => {
      const settings = toSettings(profile)

      expect(settings.name).toBe(name)
      expect(settings.gender).toBeTruthy()
      expect(settings.experienceLevel).toBeTruthy()
      expect(settings.equipment).toBeTruthy()
      expect(settings.goal).toBeTruthy()
      expect(settings.bodyweight).toBeTruthy()
      expect(settings.onboardingCompleted).toBe(true)
      expect(parseFloat(settings.benchMax)).toBeGreaterThan(0)
      expect(parseFloat(settings.squatMax)).toBeGreaterThan(0)
      expect(parseFloat(settings.deadliftMax)).toBeGreaterThan(0)
      expect(parseFloat(settings.ohpMax)).toBeGreaterThan(0)
    })
  }

  it('experience level affects estimated maxes', () => {
    const beginnerSettings = toSettings(EMMA) // complete_beginner
    const advancedSettings = toSettings(MARCUS) // advanced

    // Even accounting for different bodyweights, advanced should have higher relative maxes
    const beginnerRelBench = parseFloat(beginnerSettings.benchMax) / parseFloat(beginnerSettings.bodyweight)
    const advancedRelBench = parseFloat(advancedSettings.benchMax) / parseFloat(advancedSettings.bodyweight)

    expect(advancedRelBench).toBeGreaterThan(beginnerRelBench)
  })
})
