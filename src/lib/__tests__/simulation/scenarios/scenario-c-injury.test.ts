/**
 * Scenario C — Knee Injury Safety Test
 *
 * Profile: Jaap, 54 year old, active knee injury (moderate, left)
 * Simulated: 30 workouts + 1 active knee injury in state
 *
 * Validates:
 * - Generated workout contains NO squat/lunge/leg extension
 * - Generated workout contains rehab exercises for knee
 * - Exercise picker shows warning badges on knee-stressing exercises
 * - Uses the injury recovery system: loadInjuries, filterWorkoutForInjuries
 */

import { describe, it, expect } from 'vitest'
import { JAAP, toSettings } from '../userProfiles'
import { generateLinearProgression } from '../workoutGenerator'
import { analyzeTraining } from '../../../training-analysis'
import { generateLocalWorkout } from '../../../localWorkoutGenerator'
import {
  filterWorkoutForInjuries,
  getExcludedExercises,
  getRehabExercises,
  isExerciseSafe,
  addInjury,
} from '../../../injuryRecovery'
import type { ActiveInjury } from '../../../injuryRecovery'
import type { Workout, RecentSession } from '../../../../types'

// ---------------------------------------------------------------------------
// Data setup
// ---------------------------------------------------------------------------

const JAAP_EXERCISES = [
  'Flat Barbell Bench Press',
  'Back Squat',
  'Barbell Row',
  'Romanian Deadlift',
  'Leg Extension',
]

function generateJaapHistory(): Workout[] {
  return generateLinearProgression({
    exercises: JAAP_EXERCISES,
    weeks: 10,
    sessionsPerWeek: 3,
    startWeights: {
      'Flat Barbell Bench Press': 70,
      'Back Squat': 90,
      'Barbell Row': 60,
      'Romanian Deadlift': 80,
      'Leg Extension': 40,
    },
    weeklyIncreasePct: 0.015,
    setsPerExercise: 3,
    repsPerSet: 8,
    split: 'Full Body',
  })
}

function createKneeInjury(): ActiveInjury {
  return addInjury({
    bodyArea: 'knee',
    side: 'left',
    severity: 'moderate',
  })
}

function toRecentSessions(workouts: Workout[]): RecentSession[] {
  return workouts.slice(-3).map(w => ({
    date: w.created_at,
    sets: w.workout_sets.map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Excluded exercise patterns for knee injury (moderate severity)
// ---------------------------------------------------------------------------

/**
 * Exercises excluded at moderate knee injury severity.
 * Note: Hack Squat, Leg Press, Hip Thrust are only excluded at 'severe'.
 * These must match the excludedPatterns in INJURY_AREAS.knee.
 */
const KNEE_EXCLUDED_EXERCISES_MODERATE = [
  'Back Squat', 'Front Squat', 'Goblet Squat', 'Bodyweight Squat',
  'Leg Extension', 'Bulgarian Split Squat',
  'Walking Lunges', 'Dumbbell Lunge', 'Jump Squat',
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario C: Knee injury safety', () => {
  const workouts = generateJaapHistory()
  const settings = toSettings(JAAP)
  const kneeInjury = createKneeInjury()
  const activeInjuries = [kneeInjury]

  it('generates 30 workouts for Jaap', () => {
    expect(workouts.length).toBe(30)
  })

  it('knee injury exclusion list covers dangerous exercises', () => {
    const excluded = getExcludedExercises('knee', 'moderate')
    expect(excluded.length).toBeGreaterThan(5)

    // Each dangerous exercise should match at least one exclusion pattern
    for (const dangerousExercise of ['Back Squat', 'Leg Extension', 'Bulgarian Split Squat', 'Lunge']) {
      const isExcluded = excluded.some(pattern => {
        try {
          return new RegExp(pattern, 'i').test(dangerousExercise.toLowerCase())
        } catch {
          return dangerousExercise.toLowerCase().includes(pattern.toLowerCase())
        }
      })
      expect(isExcluded).toBe(true)
    }
  })

  it('isExerciseSafe returns false for knee-stressing exercises', () => {
    for (const exercise of KNEE_EXCLUDED_EXERCISES_MODERATE) {
      const safe = isExerciseSafe(exercise, activeInjuries)
      expect(safe).toBe(false)
    }
  })

  it('isExerciseSafe returns true for upper body exercises', () => {
    const safeExercises = [
      'Flat Barbell Bench Press',
      'Barbell Row',
      'Barbell Overhead Press',
      'Barbell Curl',
      'Tricep Pushdown',
    ]
    for (const exercise of safeExercises) {
      const safe = isExerciseSafe(exercise, activeInjuries)
      expect(safe).toBe(true)
    }
  })

  it('filterWorkoutForInjuries removes squats, lunges, leg extension', () => {
    const exerciseList = [
      { name: 'Flat Barbell Bench Press', muscle_group: 'chest' },
      { name: 'Back Squat', muscle_group: 'quads' },
      { name: 'Barbell Row', muscle_group: 'back' },
      { name: 'Leg Extension', muscle_group: 'quads' },
      { name: 'Bulgarian Split Squat', muscle_group: 'quads' },
      { name: 'Walking Lunges', muscle_group: 'quads' },
    ]

    const filtered = filterWorkoutForInjuries(exerciseList, activeInjuries)

    // Extract non-rehab exercise names
    const regularExercises = filtered.filter(e => !e.isRehab).map(e => e.name)

    // Squat, Leg Extension, Bulgarian Split Squat, and Lunges should be removed
    expect(regularExercises).not.toContain('Back Squat')
    expect(regularExercises).not.toContain('Leg Extension')
    expect(regularExercises).not.toContain('Bulgarian Split Squat')
    expect(regularExercises).not.toContain('Walking Lunges')

    // Bench and Row should remain
    expect(regularExercises).toContain('Flat Barbell Bench Press')
    expect(regularExercises).toContain('Barbell Row')
  })

  it('filtered workout contains rehab exercises for knee', () => {
    const exerciseList = [
      { name: 'Flat Barbell Bench Press', muscle_group: 'chest' },
      { name: 'Back Squat', muscle_group: 'quads' },
    ]

    const filtered = filterWorkoutForInjuries(exerciseList, activeInjuries)

    const rehabExercises = filtered.filter(e => e.isRehab)
    expect(rehabExercises.length).toBeGreaterThan(0)

    // Knee rehab exercises should include known rehabilitation movements
    const rehabNames = rehabExercises.map(e => e.name)
    const expectedRehabExercises = getRehabExercises('knee', 'moderate')
    expect(expectedRehabExercises.length).toBeGreaterThan(0)

    // At least some rehab exercises should be present
    const hasKneeRehab = expectedRehabExercises.some(r => rehabNames.includes(r.name))
    expect(hasKneeRehab).toBe(true)
  })

  it('knee rehab exercises include Wall Sit and Terminal Knee Extension', () => {
    const rehabExercises = getRehabExercises('knee', 'moderate')
    const rehabNames = rehabExercises.map(e => e.name)

    expect(rehabNames).toContain('Wall Sit')
    expect(rehabNames).toContain('Terminal Knee Extension')
  })

  it('generateLocalWorkout with injuries produces safe workout', () => {
    const muscleStatus = analyzeTraining(workouts.slice(-7), settings.goal)

    // Store the injury in localStorage so generateLocalWorkout picks it up
    const injuryData = JSON.stringify(activeInjuries)
    localStorage.setItem('kravex_injuries', injuryData)

    try {
      const workout = generateLocalWorkout({
        muscleStatus,
        recommendedSplit: 'Full Body',
        recentHistory: toRecentSessions(workouts),
        preferences: {
          goal: settings.goal,
          equipment: settings.equipment,
          experienceLevel: settings.experienceLevel,
          bodyweight: settings.bodyweight,
        },
      })

      // No exercise in the generated workout should be unsafe for knee injury
      for (const exercise of workout.exercises) {
        const isUnsafe = KNEE_EXCLUDED_EXERCISES_MODERATE.some(excluded =>
          exercise.name.toLowerCase().includes(excluded.toLowerCase())
        )
        // The workout generator filters via loadInjuries + filterWorkoutForInjuries
        // so unsafe exercises should be replaced with alternatives or removed
        if (isUnsafe) {
          // If an unsafe exercise slipped through, it should at least have
          // been replaced (check for alternative markers)
          // This is a safety-critical test
          expect(isUnsafe).toBe(false)
        }
      }
    } finally {
      localStorage.removeItem('kravex_injuries')
    }
  })

  it('alternatives are suggested for excluded exercises', () => {
    const exerciseList = [
      { name: 'Back Squat', muscle_group: 'quads' },
      { name: 'Bulgarian Split Squat', muscle_group: 'quads' },
    ]

    const filtered = filterWorkoutForInjuries(exerciseList, activeInjuries)
    const alternatives = filtered.filter(e => e.isAlternative)

    // At least one alternative should be suggested
    expect(alternatives.length).toBeGreaterThan(0)

    // Alternatives should reference the original exercise
    for (const alt of alternatives) {
      expect(alt.originalExercise).toBeTruthy()
    }
  })
})
