/**
 * Scenario H -- MRV volume ceiling test.
 *
 * Profile: Tyler, advanced, chest already at 20 sets this week (at/above MRV).
 * Action: Generate a Push workout.
 *
 * Goal: Verify that the workout generator respects volume ceilings and
 * does not add more chest sets when the muscle is already at MRV.
 * The workout should shift focus to shoulders and triceps.
 */

import { describe, it, expect } from 'vitest'
import { TYLER } from '../userProfiles'
import { generateLocalWorkout } from '../../../localWorkoutGenerator'
import { getVolumeCeiling } from '../../../training-analysis'
import { createMuscleStatusMap, createMuscleStatus } from '../../../../__tests__/helpers'
import type { MuscleGroup } from '../../../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePushWorkoutWithChestAtMRV() {
  // Get the MRV ceiling for advanced lifters
  const ceilings = getVolumeCeiling(TYLER.experienceLevel)
  const chestMRV = ceilings['chest']! // Should be 20 for advanced (hypertrophy max)

  // Create muscle status where chest is already at or above MRV
  const muscleStatus = createMuscleStatusMap({
    chest: createMuscleStatus({
      setsThisWeek: chestMRV, // At MRV ceiling
      daysSinceLastTrained: 2,
      hoursSinceLastTrained: 48,
      avgRpeLastSession: 7.5,
      setsLastSession: 10,
      recoveryPct: 80,
      status: 'ready',
      target: { min: 10, max: 20, mev: 8 },
    }),
    shoulders: createMuscleStatus({
      setsThisWeek: 6, // Well below MRV, room for more
      daysSinceLastTrained: 3,
      hoursSinceLastTrained: 72,
      recoveryPct: 95,
      status: 'ready',
      target: { min: 8, max: 16, mev: 6 },
    }),
    triceps: createMuscleStatus({
      setsThisWeek: 4, // Well below MRV, room for more
      daysSinceLastTrained: 3,
      hoursSinceLastTrained: 72,
      recoveryPct: 95,
      status: 'ready',
      target: { min: 8, max: 14, mev: 6 },
    }),
  })

  const result = generateLocalWorkout({
    muscleStatus,
    recommendedSplit: 'Push',
    recentHistory: [],
    preferences: {
      goal: TYLER.goal,
      trainingGoal: TYLER.goal,
      experienceLevel: TYLER.experienceLevel,
      bodyweight: TYLER.bodyweight,
      equipment: TYLER.equipment,
      energy: 'medium',
      time: 60,
      focusedMuscles: [] as MuscleGroup[],
      isDeload: false,
      targetRPE: null,
      targetRepRange: null,
    },
  })

  return { result, chestMRV, muscleStatus }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario H: MRV volume ceiling', () => {
  it('volume ceiling values are correct for advanced lifters', () => {
    const ceilings = getVolumeCeiling('advanced')

    // Advanced uses 1.0 multiplier on hypertrophy max values
    expect(ceilings['chest']).toBe(20)
    expect(ceilings['back']).toBe(22)
    expect(ceilings['shoulders']).toBe(16)
    expect(ceilings['quads']).toBe(20)
    expect(ceilings['biceps']).toBe(14)
    expect(ceilings['triceps']).toBe(14)
  })

  it('volume ceiling scales down for intermediate lifters', () => {
    const ceilings = getVolumeCeiling('intermediate')

    // Intermediate uses 0.85 multiplier
    expect(ceilings['chest']).toBe(17) // Math.round(20 * 0.85) = 17
    expect(ceilings['back']).toBe(19) // Math.round(22 * 0.85) = 18.7 -> 19
  })

  it('volume ceiling scales down for beginners', () => {
    const ceilings = getVolumeCeiling('beginner')

    // Beginner uses 0.6 multiplier
    expect(ceilings['chest']).toBe(12) // Math.round(20 * 0.6) = 12
    expect(ceilings['back']).toBe(13) // Math.round(22 * 0.6) = 13.2 -> 13
  })

  describe('Push workout with chest at MRV', () => {
    const { result, chestMRV } = generatePushWorkoutWithChestAtMRV()

    it('generates a valid Push workout', () => {
      expect(result.split).toBe('Push')
      expect(result.exercises.length).toBeGreaterThan(0)
    })

    it('chest exercises have 0 or minimal sets', () => {
      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')
      const totalChestSets = chestExercises.reduce((sum, e) => sum + e.sets, 0)

      // When chest is already at MRV (20 sets), new chest exercises should have
      // very few or no sets
      expect(totalChestSets).toBeLessThanOrEqual(1)
    })

    it('does NOT add normal volume of bench press when MRV is already reached', () => {
      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')

      // Either no chest exercises at all, or the total chest sets are minimal
      // The volume ceiling code should cap or remove chest exercises
      const totalChestSets = chestExercises.reduce((sum, e) => sum + e.sets, 0)
      expect(totalChestSets).toBeLessThanOrEqual(2)

      // Specifically, no single chest exercise should have its full default allocation
      for (const ex of chestExercises) {
        expect(ex.sets).toBeLessThanOrEqual(2)
      }
    })

    it('workout shifts focus to shoulders and triceps', () => {
      const shoulderExercises = result.exercises.filter(e => e.muscle_group === 'shoulders')
      const tricepExercises = result.exercises.filter(e => e.muscle_group === 'triceps')

      const shoulderSets = shoulderExercises.reduce((sum, e) => sum + e.sets, 0)
      const tricepSets = tricepExercises.reduce((sum, e) => sum + e.sets, 0)

      // Shoulders and triceps should have meaningful volume
      expect(shoulderSets).toBeGreaterThan(0)
      expect(tricepSets).toBeGreaterThan(0)

      // Combined shoulder + tricep volume should be the majority of the workout
      const chestSets = result.exercises
        .filter(e => e.muscle_group === 'chest')
        .reduce((sum, e) => sum + e.sets, 0)

      expect(shoulderSets + tricepSets).toBeGreaterThan(chestSets)
    })

    it('volume ceiling is respected -- total sets would not exceed MRV', () => {
      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')
      const addedChestSets = chestExercises.reduce((sum, e) => sum + e.sets, 0)

      // Current weekly chest sets + added sets should not exceed MRV
      expect(chestMRV + addedChestSets).toBeLessThanOrEqual(chestMRV + 1)
    })
  })

  describe('Push workout with chest below MRV (control group)', () => {
    it('includes normal chest volume when below MRV', () => {
      const muscleStatus = createMuscleStatusMap({
        chest: createMuscleStatus({
          setsThisWeek: 6, // Well below MRV
          daysSinceLastTrained: 3,
          hoursSinceLastTrained: 72,
          recoveryPct: 95,
          status: 'ready',
          target: { min: 10, max: 20, mev: 8 },
        }),
        shoulders: createMuscleStatus({
          setsThisWeek: 4,
          daysSinceLastTrained: 3,
          hoursSinceLastTrained: 72,
          recoveryPct: 95,
          status: 'ready',
        }),
        triceps: createMuscleStatus({
          setsThisWeek: 4,
          daysSinceLastTrained: 3,
          hoursSinceLastTrained: 72,
          recoveryPct: 95,
          status: 'ready',
        }),
      })

      const result = generateLocalWorkout({
        muscleStatus,
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: {
          goal: TYLER.goal,
          trainingGoal: TYLER.goal,
          experienceLevel: TYLER.experienceLevel,
          bodyweight: TYLER.bodyweight,
          equipment: TYLER.equipment,
          energy: 'medium',
          time: 60,
          focusedMuscles: [] as MuscleGroup[],
          isDeload: false,
          targetRPE: null,
          targetRepRange: null,
        },
      })

      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')
      const totalChestSets = chestExercises.reduce((sum, e) => sum + e.sets, 0)

      // When below MRV, chest should have meaningful volume (Push template = 3 exercises)
      expect(chestExercises.length).toBeGreaterThanOrEqual(2)
      expect(totalChestSets).toBeGreaterThanOrEqual(6) // At least 2 exercises x 3 sets
    })
  })
})
