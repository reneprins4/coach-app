/**
 * Tests for BUG 6, BUG 11, BUG 12
 * - BUG 6: Rear Delt Fly misclassified as chest instead of shoulders
 * - BUG 11: False plateau at light weights due to 2.5kg rounding
 * - BUG 12: benchMax/squatMax/deadliftMax/ohpMax from settings unused
 */
import { describe, it, expect } from 'vitest'
import { getDetailedMuscleGroup } from '../weaknessHunter'
import { detectPlateaus } from '../plateauDetector'
import { generateLocalWorkout } from '../localWorkoutGenerator'
import { createWorkout, createMuscleStatusMap } from '../../__tests__/helpers'
import type { Workout, MuscleGroup } from '../../types'

// --- BUG 6: Rear Delt Fly classification ---

describe('BUG 6: Rear Delt Fly classification', () => {
  it('"Rear Delt Fly" is classified as shoulders (not chest)', () => {
    expect(getDetailedMuscleGroup('Rear Delt Fly')).toBe('shoulders_rear')
  })

  it('"Cable Fly" is still classified as chest', () => {
    expect(getDetailedMuscleGroup('Cable Fly')).toBe('chest')
  })

  it('"Dumbbell Fly" is still classified as chest', () => {
    expect(getDetailedMuscleGroup('Dumbbell Fly')).toBe('chest')
  })

  it('"Face Pull" is classified as shoulders', () => {
    expect(getDetailedMuscleGroup('Face Pull')).toBe('shoulders_rear')
  })

  it('"Chest Fly" is classified as chest', () => {
    expect(getDetailedMuscleGroup('Chest Fly')).toBe('chest')
  })
})

// --- BUG 11: Light weight plateau false positive ---

function makeWeeklyWorkouts(
  exerciseName: string,
  weeklyData: { weight: number; reps: number }[],
): Workout[] {
  const workouts: Workout[] = []
  for (let i = 0; i < weeklyData.length; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (weeklyData.length - i) * 7)
    // Set to Sunday of that week for unique week key
    date.setDate(date.getDate() - date.getDay())
    workouts.push(createWorkout({
      created_at: date.toISOString(),
    }, [
      { exercise: exerciseName, weight_kg: weeklyData[i]!.weight, reps: weeklyData[i]!.reps, rpe: 7 },
    ]))
  }
  return workouts
}

describe('BUG 11: Light weight plateau false positive', () => {
  it('no false plateau on 42.5kg row with 2% weekly growth (rounds to same 2.5kg)', () => {
    // Weight stays at 42.5 for 4 weeks, then bumps to 45 with lower reps (normal).
    // e1RM barely moves: 53.83 x4, 54.0, 55.5 => relative slope ~0.47%
    // Below 0.5% stagnation threshold BUT weight DID increase => NOT a plateau.
    const workouts = makeWeeklyWorkouts('Barbell Row', [
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 45, reps: 6 },
      { weight: 45, reps: 7 },
    ])

    const results = detectPlateaus(workouts)
    const rowPlateau = results.find(r => r.exercise.toLowerCase().includes('row'))
    // Should NOT be flagged as plateau — weight increased from 40 to 45
    expect(rowPlateau).toBeUndefined()
  })

  it('plateau detector accounts for rounding at light weights', () => {
    // 20kg lateral raise — weight stays the same but reps go up over 6 weeks
    // This is rep progression, not a plateau
    const workouts = makeWeeklyWorkouts('Lateral Raise', [
      { weight: 10, reps: 10 },
      { weight: 10, reps: 11 },
      { weight: 10, reps: 12 },
      { weight: 12.5, reps: 10 },
      { weight: 12.5, reps: 11 },
      { weight: 12.5, reps: 12 },
    ])

    const results = detectPlateaus(workouts)
    const lateralPlateau = results.find(r => r.exercise.toLowerCase().includes('lateral'))
    expect(lateralPlateau).toBeUndefined()
  })

  it('exercise progressing by 2.5kg every 2-3 weeks is NOT a plateau', () => {
    const workouts = makeWeeklyWorkouts('Dumbbell Curl', [
      { weight: 12.5, reps: 10 },
      { weight: 12.5, reps: 11 },
      { weight: 15, reps: 10 },
      { weight: 15, reps: 11 },
      { weight: 17.5, reps: 10 },
      { weight: 17.5, reps: 11 },
    ])

    const results = detectPlateaus(workouts)
    const curlPlateau = results.find(r => r.exercise.toLowerCase().includes('curl'))
    expect(curlPlateau).toBeUndefined()
  })

  it('true plateau at light weight (same weight AND reps for 6 weeks) IS detected', () => {
    // Truly stuck: same weight, same reps, 6 weeks — this IS a plateau
    const workouts = makeWeeklyWorkouts('Barbell Row', [
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
      { weight: 42.5, reps: 8 },
    ])

    const results = detectPlateaus(workouts)
    const rowPlateau = results.find(r => r.exercise.toLowerCase().includes('row'))
    expect(rowPlateau).toBeDefined()
    expect(rowPlateau!.status).toBe('plateau')
  })
})

// --- BUG 12: benchMax from settings used for estimation ---

describe('BUG 12: benchMax from settings used for estimation', () => {
  function makeInput(overrides: Record<string, unknown> = {}) {
    return {
      muscleStatus: createMuscleStatusMap(),
      recommendedSplit: 'Push' as string,
      recentHistory: [],
      preferences: {
        goal: 'hypertrophy',
        trainingGoal: 'hypertrophy',
        experienceLevel: 'intermediate' as const,
        bodyweight: '80',
        equipment: 'full_gym',
        energy: 'medium',
        time: 60,
        focusedMuscles: [] as MuscleGroup[],
        isDeload: false,
        targetRPE: null,
        targetRepRange: null,
        ...overrides,
      },
    }
  }

  it('when user has benchMax in settings, generator uses it instead of bodyweight estimate', () => {
    // benchMax = 100kg, so working weight should be ~75kg (75% of max)
    // Exercise selection is randomized, so retry until a bench exercise appears
    let benchWithMax = undefined
    for (let i = 0; i < 20 && !benchWithMax; i++) {
      const result = generateLocalWorkout(makeInput({ benchMax: '100' }))
      benchWithMax = result.exercises.find(e => e.name.toLowerCase().includes('bench'))
    }

    expect(benchWithMax).toBeDefined()
    // With a 100kg max, working weight at 75% = 75kg (rounded to 2.5kg)
    expect(benchWithMax!.weight_kg).toBe(75)
  })

  it('when benchMax is empty/0, falls back to bodyweight estimate', () => {
    // Exercise selection is randomized, so retry until all three generate the same bench exercise.
    // We need the SAME exercise name to compare bodyweight estimates meaningfully.
    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      const resultEmpty = generateLocalWorkout(makeInput({ benchMax: '' }))
      const resultZero = generateLocalWorkout(makeInput({ benchMax: '0' }))
      const resultDefault = generateLocalWorkout(makeInput({}))

      const emptyBenches = resultEmpty.exercises.filter(e => e.name.toLowerCase().includes('bench'))
      const zeroBenches = resultZero.exercises.filter(e => e.name.toLowerCase().includes('bench'))
      const defaultBenches = resultDefault.exercises.filter(e => e.name.toLowerCase().includes('bench'))

      // Find a bench exercise name that appears in all three
      for (const eb of emptyBenches) {
        const zb = zeroBenches.find(e => e.name === eb.name)
        const db = defaultBenches.find(e => e.name === eb.name)
        if (zb && db) {
          expect(eb.weight_kg).toBe(db.weight_kg)
          expect(zb.weight_kg).toBe(db.weight_kg)
          found = true
          break
        }
      }
    }
    expect(found).toBe(true)
  })

  it('squatMax from settings used for squat exercises', () => {
    // squatMax = 140kg, working weight at 75% = 105kg
    const input = makeInput({ squatMax: '140' })
    // Need a Legs split to get squat exercises
    const legInput = {
      ...input,
      recommendedSplit: 'Legs',
    }

    const result = generateLocalWorkout(legInput)
    const squat = result.exercises.find(e => e.name.toLowerCase().includes('squat'))

    expect(squat).toBeDefined()
    // 140 * 0.75 = 105kg
    expect(squat!.weight_kg).toBe(105)
  })
})
