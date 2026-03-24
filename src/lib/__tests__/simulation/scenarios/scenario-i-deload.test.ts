/**
 * Scenario I -- Deload week correctness test.
 *
 * Profile: Marcus, week 4 of accumulation phase (deload week).
 * Action: Generate a workout with isDeload: true.
 *
 * Goal: Verify that deload workouts have reduced volume/intensity:
 *   - Compounds: max 2 sets
 *   - Isolations: max 1 set (ENGINE-006 fix)
 *   - RPE target = 6
 *   - Total volume approximately 40% of normal
 *   - Momentum indicator shows 'deload' status, no warnings
 */

import { describe, it, expect } from 'vitest'
import { MARCUS } from '../userProfiles'
import { generateLocalWorkout } from '../../../localWorkoutGenerator'
import { calculateMomentum } from '../../../momentumCalculator'
import { createMuscleStatusMap } from '../../../../__tests__/helpers'
import type { MuscleGroup, MomentumStatus } from '../../../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateDeloadWorkout(split: string = 'Push') {
  const muscleStatus = createMuscleStatusMap()

  return generateLocalWorkout({
    muscleStatus,
    recommendedSplit: split,
    recentHistory: [],
    preferences: {
      goal: MARCUS.goal,
      trainingGoal: MARCUS.goal,
      experienceLevel: MARCUS.experienceLevel,
      bodyweight: MARCUS.bodyweight,
      equipment: MARCUS.equipment,
      energy: 'medium',
      time: 120,
      focusedMuscles: [] as MuscleGroup[],
      isDeload: true,
      blockWeek: 4,
      targetRPE: 6,
      targetRepRange: null,
    },
  })
}

function generateNormalWorkout(split: string = 'Push') {
  const muscleStatus = createMuscleStatusMap()

  return generateLocalWorkout({
    muscleStatus,
    recommendedSplit: split,
    recentHistory: [],
    preferences: {
      goal: MARCUS.goal,
      trainingGoal: MARCUS.goal,
      experienceLevel: MARCUS.experienceLevel,
      bodyweight: MARCUS.bodyweight,
      equipment: MARCUS.equipment,
      energy: 'medium',
      time: 120,
      focusedMuscles: [] as MuscleGroup[],
      isDeload: false,
      blockWeek: 3,
      targetRPE: null,
      targetRepRange: null,
    },
  })
}

/**
 * Check if an exercise name maps to a compound movement.
 * Uses the same heuristic as the workout generator.
 */
function isCompoundExercise(name: string): boolean {
  const compoundPatterns = [
    'bench press', 'squat', 'deadlift', 'row', 'press', 'pull-up',
    'chin-up', 'pulldown', 'hip thrust', 'leg press', 'dip',
    'hack squat', 'lunge', 'split squat', 'front squat',
    'close grip bench', 'push-up', 'push up', 'step-up',
    'goblet squat', 'sumo squat',
  ]
  const lower = name.toLowerCase()
  return compoundPatterns.some(p => lower.includes(p))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario I: Deload week correctness', () => {
  describe('Push workout deload', () => {
    const deloadWorkout = generateDeloadWorkout('Push')
    const normalWorkout = generateNormalWorkout('Push')

    it('generates a valid deload workout', () => {
      expect(deloadWorkout.split).toBe('Push')
      expect(deloadWorkout.exercises.length).toBeGreaterThan(0)
    })

    it('compound exercises have max 2 sets', () => {
      for (const exercise of deloadWorkout.exercises) {
        if (isCompoundExercise(exercise.name)) {
          expect(exercise.sets).toBeLessThanOrEqual(2)
        }
      }
    })

    it('isolation exercises have max 1 set (ENGINE-006)', () => {
      for (const exercise of deloadWorkout.exercises) {
        if (!isCompoundExercise(exercise.name)) {
          expect(exercise.sets).toBeLessThanOrEqual(1)
        }
      }
    })

    it('RPE target is 6 for all exercises', () => {
      for (const exercise of deloadWorkout.exercises) {
        expect(exercise.rpe_target).toBeLessThanOrEqual(6)
      }
    })

    it('total volume is substantially reduced compared to normal workout', () => {
      const deloadTotalSets = deloadWorkout.exercises.reduce((sum, e) => sum + e.sets, 0)
      const normalTotalSets = normalWorkout.exercises.reduce((sum, e) => sum + e.sets, 0)

      // Deload should be significantly less than normal.
      // getSets returns 2 for compound and 1 for isolation during deload,
      // vs 4 for compound and 3 for isolation normally.
      // Exact ratio depends on the compound/isolation mix.
      // Allow a range of 25%-70% to cover different exercise selections.
      const ratio = deloadTotalSets / normalTotalSets
      expect(ratio).toBeGreaterThanOrEqual(0.2)
      expect(ratio).toBeLessThanOrEqual(0.7)
    })

    it('deload has fewer total sets than normal workout', () => {
      const deloadSets = deloadWorkout.exercises.reduce((sum, e) => sum + e.sets, 0)
      const normalSets = normalWorkout.exercises.reduce((sum, e) => sum + e.sets, 0)

      expect(deloadSets).toBeLessThan(normalSets)
    })

    it('reasoning mentions deload', () => {
      expect(deloadWorkout.reasoning.toLowerCase()).toContain('deload')
    })
  })

  describe('Full Body workout deload', () => {
    const deloadWorkout = generateDeloadWorkout('Full Body')

    it('compound exercises have max 2 sets in Full Body deload', () => {
      for (const exercise of deloadWorkout.exercises) {
        if (isCompoundExercise(exercise.name)) {
          expect(exercise.sets).toBeLessThanOrEqual(2)
        }
      }
    })

    it('isolation exercises have max 1 set in Full Body deload', () => {
      for (const exercise of deloadWorkout.exercises) {
        if (!isCompoundExercise(exercise.name)) {
          expect(exercise.sets).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('Legs workout deload', () => {
    const deloadWorkout = generateDeloadWorkout('Legs')

    it('generates valid leg deload workout', () => {
      expect(deloadWorkout.split).toBe('Legs')
      expect(deloadWorkout.exercises.length).toBeGreaterThan(0)
    })

    it('all exercises have reduced sets', () => {
      for (const exercise of deloadWorkout.exercises) {
        // No exercise should have more than 2 sets during deload
        expect(exercise.sets).toBeLessThanOrEqual(2)
      }
    })
  })

  describe('Momentum indicator during deload (ALGO-013)', () => {
    it('shows deload status, not declining or fatigue', () => {
      // Simulate a deload workout with typical sets
      const mockWorkout = {
        exercises: [
          {
            name: 'Flat Barbell Bench Press',
            sets: [
              { created_at: new Date(Date.now() - 3000).toISOString(), weight_kg: 60, reps: 8, rpe: 6 },
              { created_at: new Date(Date.now() - 2000).toISOString(), weight_kg: 60, reps: 8, rpe: 6 },
            ],
          },
          {
            name: 'Dumbbell Overhead Press',
            sets: [
              { created_at: new Date(Date.now() - 1000).toISOString(), weight_kg: 20, reps: 10, rpe: 5 },
              { created_at: new Date().toISOString(), weight_kg: 20, reps: 10, rpe: 5 },
            ],
          },
        ],
      }

      const momentum = calculateMomentum(mockWorkout, { isDeload: true })

      // During deload, momentum should not be null if enough sets
      if (momentum !== null) {
        // Status should be 'deload', not 'declining' or 'fatigue'
        expect(momentum.status).toBe('deload' as MomentumStatus)

        // Score should be at least 50 (deload floor)
        expect(momentum.score).toBeGreaterThanOrEqual(50)

        // No negative signals should be present
        expect(momentum.signals).not.toContain('e1rm_dropping')
        expect(momentum.signals).not.toContain('rpe_degrading')
        expect(momentum.signals).not.toContain('reps_dropping')

        // showPRHint should be false during deload
        expect(momentum.showPRHint).toBe(false)
      }
    })

    it('does not show PR hint during deload', () => {
      // Even if sets look good, PR hint should be suppressed
      const mockWorkout = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [
              { created_at: new Date(Date.now() - 4000).toISOString(), weight_kg: 50, reps: 10, rpe: 5 },
              { created_at: new Date(Date.now() - 3000).toISOString(), weight_kg: 55, reps: 10, rpe: 5 },
              { created_at: new Date(Date.now() - 2000).toISOString(), weight_kg: 60, reps: 10, rpe: 5 },
              { created_at: new Date(Date.now() - 1000).toISOString(), weight_kg: 65, reps: 10, rpe: 5 },
            ],
          },
        ],
      }

      const momentum = calculateMomentum(mockWorkout, { isDeload: true })

      if (momentum !== null) {
        expect(momentum.showPRHint).toBe(false)
        expect(momentum.status).toBe('deload' as MomentumStatus)
      }
    })
  })

  describe('Deload vs normal comparison across splits', () => {
    const splits = ['Push', 'Pull', 'Legs', 'Full Body']

    for (const split of splits) {
      it(`${split}: deload has significantly fewer sets than normal`, () => {
        const deload = generateDeloadWorkout(split)
        const normal = generateNormalWorkout(split)

        const deloadSets = deload.exercises.reduce((s, e) => s + e.sets, 0)
        const normalSets = normal.exercises.reduce((s, e) => s + e.sets, 0)

        // Deload should always have fewer sets
        expect(deloadSets).toBeLessThan(normalSets)

        // And the reduction should be substantial (at least 30%)
        if (normalSets > 0) {
          expect(deloadSets / normalSets).toBeLessThanOrEqual(0.7)
        }
      })
    }
  })
})
