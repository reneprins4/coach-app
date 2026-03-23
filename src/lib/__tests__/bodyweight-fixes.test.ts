/**
 * TDD tests for 6 bodyweight-related bugs.
 *
 * BUG 2:  No bodyweight chest exercises in EXERCISE_POOL
 * BUG 3:  calculateProgression with weight=0 returns weight=2.5 (wrong)
 * BUG 4:  calculateProgression with weight=0 at top of rep range returns "weight_increase" (wrong)
 * BUG 5:  plateauDetector fires false positives on pure bodyweight exercises
 * BUG 9:  Nordic Curl assigned to complete beginners
 * BUG 10: No bodyweight biceps exercises
 */
import { describe, it, expect } from 'vitest'
import { calculateProgression } from '../progressiveOverload'
import { detectPlateaus } from '../plateauDetector'
import { generateLocalWorkout, EXERCISE_POOL } from '../localWorkoutGenerator'
import { createMuscleStatusMap } from '../../__tests__/helpers'
import { createWorkout } from '../../__tests__/helpers'
import type { Workout } from '../../types'

// --- helper: generate a Full Body workout for a bodyweight-only user ---
function makeBodyweightFullBody(level: 'complete_beginner' | 'beginner' | 'intermediate' = 'intermediate') {
  return generateLocalWorkout({
    muscleStatus: createMuscleStatusMap(),
    recommendedSplit: 'Full Body',
    recentHistory: [],
    preferences: {
      goal: 'hypertrophy',
      trainingGoal: 'hypertrophy',
      experienceLevel: level,
      bodyweight: '75',
      equipment: 'bodyweight',
      energy: 'medium',
      time: 60,
      focusedMuscles: [],
      isDeload: false,
      targetRPE: null,
      targetRepRange: null,
    },
  })
}

// --- helper: create workouts for plateau detector with bodyweight sets ---
function makeBodyweightWorkouts(exercise: string, weeks: number): Workout[] {
  const workouts: Workout[] = []
  for (let week = 0; week < weeks; week++) {
    const date = new Date()
    date.setDate(date.getDate() - (weeks - week) * 7)
    date.setDate(date.getDate() - date.getDay())
    // Pure bodyweight: weight_kg = 0, reps increase over time
    workouts.push(createWorkout({
      created_at: date.toISOString(),
    }, [
      { exercise, weight_kg: 0, reps: 10 + week, rpe: 7 },
    ]))
  }
  return workouts
}

describe('Bodyweight Exercise Fixes', () => {
  // ==== BUG 2: No bodyweight chest exercises ====

  describe('BUG 2 - Bodyweight chest exercises in pool', () => {
    it('EXERCISE_POOL.chest has at least 2 bodyweight exercises', () => {
      const bwChest = EXERCISE_POOL.chest.filter(e => e.equipment === 'bodyweight')
      expect(bwChest.length).toBeGreaterThanOrEqual(2)
    })

    it('Push-Up is in the chest pool as a bodyweight compound', () => {
      const pushUp = EXERCISE_POOL.chest.find(e => e.name === 'Push-Up')
      expect(pushUp).toBeDefined()
      expect(pushUp!.equipment).toBe('bodyweight')
      expect(pushUp!.isCompound).toBe(true)
    })

    it('bodyweight user gets chest exercises in Full Body workout', () => {
      const result = makeBodyweightFullBody()
      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')
      expect(chestExercises.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ==== BUG 3+4: Weight=0 progression broken ====

  describe('BUG 3+4 - calculateProgression with weight=0 (bodyweight)', () => {
    it('weight=0 and RPE>=9.5 returns weight=0 and strategy "maintain" (not deload to 2.5kg)', () => {
      const result = calculateProgression({
        exercise: 'Push-Up',
        previousWeight: 0,
        previousReps: 20,
        previousRpe: 9.5,
        targetRepRange: [8, 15],
        muscleGroup: 'chest',
      })
      expect(result.suggestedWeight).toBe(0)
      expect(result.strategy).not.toBe('deload')
    })

    it('weight=0 at top of rep range returns strategy "variation" not "weight_increase"', () => {
      const result = calculateProgression({
        exercise: 'Push-Up',
        previousWeight: 0,
        previousReps: 15,
        previousRpe: 7,
        targetRepRange: [8, 15],
        muscleGroup: 'chest',
      })
      expect(result.suggestedWeight).toBe(0)
      expect(result.strategy).toBe('variation')
      expect(result.strategy).not.toBe('weight_increase')
    })

    it('weight=0 and RPE<8 returns rep_progression with weight=0', () => {
      const result = calculateProgression({
        exercise: 'Push-Up',
        previousWeight: 0,
        previousReps: 10,
        previousRpe: 7,
        targetRepRange: [8, 15],
        muscleGroup: 'chest',
      })
      expect(result.suggestedWeight).toBe(0)
      expect(result.strategy).toBe('rep_progression')
      expect(result.suggestedReps).toBeGreaterThan(10)
    })

    it('weight=0 and RPE in 8-9 range maintains with weight=0', () => {
      const result = calculateProgression({
        exercise: 'Push-Up',
        previousWeight: 0,
        previousReps: 12,
        previousRpe: 8.5,
        targetRepRange: [8, 15],
        muscleGroup: 'chest',
      })
      expect(result.suggestedWeight).toBe(0)
      expect(result.strategy).toBe('maintain')
    })
  })

  // ==== BUG 5: False plateau on bodyweight ====

  describe('BUG 5 - plateauDetector ignores pure bodyweight exercises', () => {
    it('no plateau detected on Push-Up after 8 weeks of rep-only progression', () => {
      const workouts = makeBodyweightWorkouts('Push-Up', 8)
      const results = detectPlateaus(workouts)
      const pushUpPlateau = results.find(r => r.exercise.toLowerCase().includes('push-up') || r.exercise.toLowerCase().includes('push up'))
      expect(pushUpPlateau).toBeUndefined()
    })

    it('ignores exercises where ALL sets have weight_kg === 0', () => {
      // 6 weeks of bodyweight squats at weight=0
      const workouts = makeBodyweightWorkouts('Bodyweight Squat', 6)
      const results = detectPlateaus(workouts)
      const bwSquatPlateau = results.find(r => r.exercise.toLowerCase().includes('bodyweight squat'))
      expect(bwSquatPlateau).toBeUndefined()
    })

    it('still detects plateau on weighted exercises', () => {
      // 6 weeks of bench press with NO progression (plateau)
      const workouts: Workout[] = []
      for (let week = 0; week < 6; week++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - week) * 7)
        date.setDate(date.getDate() - date.getDay())
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 8 },
        ]))
      }
      const results = detectPlateaus(workouts)
      const benchPlateau = results.find(r => r.exercise.toLowerCase().includes('bench press'))
      expect(benchPlateau).toBeDefined()
    })
  })

  // ==== BUG 9: Nordic Curl for beginners ====

  describe('BUG 9 - Nordic Curl not for beginners', () => {
    it('complete_beginner does not get Nordic Curl', () => {
      const result = generateLocalWorkout({
        muscleStatus: createMuscleStatusMap(),
        recommendedSplit: 'Legs',
        recentHistory: [],
        preferences: {
          goal: 'hypertrophy',
          trainingGoal: 'hypertrophy',
          experienceLevel: 'complete_beginner',
          bodyweight: '70',
          equipment: 'bodyweight',
          energy: 'medium',
          time: 60,
          focusedMuscles: [],
          isDeload: false,
          targetRPE: null,
          targetRepRange: null,
        },
      })
      const nordicCurl = result.exercises.find(e => e.name.toLowerCase().includes('nordic'))
      expect(nordicCurl).toBeUndefined()
    })

    it('bodyweight hamstring pool has easier alternatives', () => {
      const bwHamstrings = EXERCISE_POOL.hamstrings.filter(e => e.equipment === 'bodyweight')
      // Should have at least 2 bodyweight options (Nordic + easier alternatives)
      expect(bwHamstrings.length).toBeGreaterThanOrEqual(2)
      // At least one that is NOT Nordic Curl
      const nonNordic = bwHamstrings.filter(e => !e.name.toLowerCase().includes('nordic'))
      expect(nonNordic.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ==== BUG 10: No bodyweight biceps ====

  describe('BUG 10 - Bodyweight biceps exercises', () => {
    it('EXERCISE_POOL.biceps has at least 1 bodyweight exercise', () => {
      const bwBiceps = EXERCISE_POOL.biceps.filter(e => e.equipment === 'bodyweight')
      expect(bwBiceps.length).toBeGreaterThanOrEqual(1)
    })

    it('bodyweight user gets biceps exercises in Full Body workout', () => {
      const result = makeBodyweightFullBody()
      const bicepsExercises = result.exercises.filter(e => e.muscle_group === 'biceps')
      expect(bicepsExercises.length).toBeGreaterThanOrEqual(1)
    })
  })
})
