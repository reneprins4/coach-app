/**
 * Tests for src/lib/localWorkoutGenerator.ts
 */
import { describe, it, expect } from 'vitest'
import { generateLocalWorkout } from '../localWorkoutGenerator'
import { createMuscleStatusMap, createRecentSession } from '../../__tests__/helpers'
import type { MuscleGroup } from '../../types'

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    muscleStatus: createMuscleStatusMap(),
    recommendedSplit: 'Push' as string,
    recentHistory: [] as ReturnType<typeof createRecentSession>[],
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
    },
    ...overrides,
  }
}

describe('localWorkoutGenerator', () => {
  describe('generateLocalWorkout', () => {
    it('generates a valid workout response structure', () => {
      const result = generateLocalWorkout(makeInput())
      expect(result).toHaveProperty('split')
      expect(result).toHaveProperty('reasoning')
      expect(result).toHaveProperty('exercises')
      expect(result).toHaveProperty('estimated_duration_min')
      expect(result).toHaveProperty('volume_notes')
      expect(Array.isArray(result.exercises)).toBe(true)
    })

    it('generates exercises matching the Push split', () => {
      const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))
      expect(result.split).toBe('Push')
      const muscles = new Set(result.exercises.map(e => e.muscle_group))
      // Push should include chest, shoulders, triceps
      expect(muscles.has('chest')).toBe(true)
      expect(muscles.has('shoulders')).toBe(true)
      expect(muscles.has('triceps')).toBe(true)
      // Should NOT include pull muscles
      expect(muscles.has('back')).toBe(false)
      expect(muscles.has('biceps')).toBe(false)
    })

    it('generates exercises matching the Pull split', () => {
      const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Pull' }))
      expect(result.split).toBe('Pull')
      const muscles = new Set(result.exercises.map(e => e.muscle_group))
      expect(muscles.has('back')).toBe(true)
      expect(muscles.has('biceps')).toBe(true)
    })

    it('generates exercises matching the Legs split', () => {
      const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Legs' }))
      const muscles = new Set(result.exercises.map(e => e.muscle_group))
      expect(muscles.has('quads')).toBe(true)
      expect(muscles.has('hamstrings')).toBe(true)
    })

    it('generates exercises for Full Body split', () => {
      const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Full Body' }))
      expect(result.exercises.length).toBeGreaterThanOrEqual(5)
    })

    it('falls back to Full Body for unknown split', () => {
      const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Unknown' }))
      expect(result.exercises.length).toBeGreaterThan(0)
    })

    it('reduces volume during deload', () => {
      const normal = generateLocalWorkout(makeInput())
      const deload = generateLocalWorkout(makeInput({
        preferences: {
          ...makeInput().preferences,
          isDeload: true,
        },
      }))
      const normalSets = normal.exercises.reduce((s, e) => s + e.sets, 0)
      const deloadSets = deload.exercises.reduce((s, e) => s + e.sets, 0)
      expect(deloadSets).toBeLessThan(normalSets)
    })

    it('caps RPE at 6 during deload', () => {
      const result = generateLocalWorkout(makeInput({
        preferences: {
          ...makeInput().preferences,
          isDeload: true,
        },
      }))
      for (const ex of result.exercises) {
        expect(ex.rpe_target).toBeLessThanOrEqual(6)
      }
    })

    it('adds extra exercises for focused muscles', () => {
      // Use low setsThisWeek so volume ceiling doesn't interfere with focus test
      const lowVolumeStatus = createMuscleStatusMap({
        chest: { setsThisWeek: 0 },
        shoulders: { setsThisWeek: 0 },
        triceps: { setsThisWeek: 0 },
      })
      const withoutFocus = generateLocalWorkout(makeInput({ muscleStatus: lowVolumeStatus }))
      const withFocus = generateLocalWorkout(makeInput({
        muscleStatus: lowVolumeStatus,
        preferences: {
          ...makeInput().preferences,
          focusedMuscles: ['chest'] as MuscleGroup[],
        },
      }))
      const chestWithout = withoutFocus.exercises.filter(e => e.muscle_group === 'chest').length
      const chestWith = withFocus.exercises.filter(e => e.muscle_group === 'chest').length
      expect(chestWith).toBeGreaterThan(chestWithout)
    })

    it('assigns non-zero weights to non-bodyweight exercises', () => {
      const result = generateLocalWorkout(makeInput())
      for (const ex of result.exercises) {
        // Bodyweight exercises can have 0kg
        if (!['Pull-up', 'Plank', 'Hanging Leg Raise', 'Ab Wheel Rollout', 'Nordic Curl', 'Glute Bridge', 'Diamond Push-up'].includes(ex.name)) {
          expect(ex.weight_kg).toBeGreaterThan(0)
        }
      }
    })

    it('adjusts weights based on experience level', () => {
      const beginner = generateLocalWorkout(makeInput({
        preferences: { ...makeInput().preferences, experienceLevel: 'beginner' as const },
      }))
      const advanced = generateLocalWorkout(makeInput({
        preferences: { ...makeInput().preferences, experienceLevel: 'advanced' as const },
      }))
      // Advanced weights should generally be higher than beginner
      const beginnerTotal = beginner.exercises.reduce((s, e) => s + e.weight_kg, 0)
      const advancedTotal = advanced.exercises.reduce((s, e) => s + e.weight_kg, 0)
      expect(advancedTotal).toBeGreaterThan(beginnerTotal)
    })

    it('uses strength rep ranges when goal is strength', () => {
      const result = generateLocalWorkout(makeInput({
        preferences: { ...makeInput().preferences, trainingGoal: 'strength' },
      }))
      // Compound exercises should have lower rep ranges for strength
      const compounds = result.exercises.filter(e =>
        ['Flat Barbell Bench Press', 'Back Squat', 'Barbell Row'].includes(e.name)
      )
      for (const ex of compounds) {
        expect(ex.reps_max).toBeLessThanOrEqual(8)
      }
    })

    it('applies progressive overload from history', () => {
      // RPE 7 with 10 reps in 8-10 range (at top) -> weight increase
      const history = [createRecentSession({}, [
        { exercise: 'Flat Barbell Bench Press', weight_kg: 80, reps: 10, rpe: 7 },
      ])]
      const result = generateLocalWorkout(makeInput({ recentHistory: history }))
      const bench = result.exercises.find(e => e.name === 'Flat Barbell Bench Press')
      if (bench) {
        // Upper body compound at top of rep range: +2.5-5% of 80 = 82-84, rounded to 82.5
        expect(bench.weight_kg).toBeGreaterThan(80)
        expect(bench.vs_last_session).toContain('up')
      }
    })

    it('reduces weight when previous RPE > 9', () => {
      const history = [createRecentSession({}, [
        { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 5, rpe: 9.5 },
      ])]
      const result = generateLocalWorkout(makeInput({ recentHistory: history }))
      const bench = result.exercises.find(e => e.name === 'Flat Barbell Bench Press')
      if (bench) {
        expect(bench.weight_kg).toBeLessThan(100)
        expect(bench.vs_last_session).toContain('down')
      }
    })

    it('reduces exercises for low energy / short time', () => {
      const normal = generateLocalWorkout(makeInput())
      const lowEnergy = generateLocalWorkout(makeInput({
        preferences: { ...makeInput().preferences, energy: 'low', time: 30 },
      }))
      expect(lowEnergy.exercises.length).toBeLessThanOrEqual(normal.exercises.length)
    })

    it('includes volume_notes with muscle set counts', () => {
      const result = generateLocalWorkout(makeInput())
      expect(result.volume_notes).toContain('chest')
      expect(result.volume_notes).toContain('sets')
    })

    it('estimated_duration_min is a positive number', () => {
      const result = generateLocalWorkout(makeInput())
      expect(result.estimated_duration_min).toBeGreaterThan(0)
    })

    // --- ENGINE-003: Volume ceiling enforcement ---

    it('caps exercise sets to 0 and removes exercises when user is already at weekly MRV', () => {
      // Intermediate ceiling is 18 sets per muscle group.
      // Set setsThisWeek = 18 for chest so remaining = 0.
      const muscleStatus = createMuscleStatusMap({
        chest: { setsThisWeek: 18 },
      })
      const result = generateLocalWorkout(makeInput({
        muscleStatus,
        recommendedSplit: 'Push',
      }))
      // All chest exercises should be removed (sets would be 0)
      const chestExercises = result.exercises.filter(e => e.muscle_group === 'chest')
      expect(chestExercises).toHaveLength(0)
    })

    it('reduces exercise sets when partially over MRV', () => {
      // Intermediate ceiling = 18. setsThisWeek = 15.
      // Remaining = 18 - 15 = 3 sets for all chest exercises combined.
      // A Push workout normally generates 3 chest exercises (compound 4 sets + compound 4 sets + isolation 3 sets = 11 sets).
      // With only 3 remaining, total chest sets should be capped to 3.
      const muscleStatus = createMuscleStatusMap({
        chest: { setsThisWeek: 15 },
      })
      const result = generateLocalWorkout(makeInput({
        muscleStatus,
        recommendedSplit: 'Push',
      }))
      const chestSets = result.exercises
        .filter(e => e.muscle_group === 'chest')
        .reduce((sum, e) => sum + e.sets, 0)
      expect(chestSets).toBeLessThanOrEqual(3)
      expect(chestSets).toBeGreaterThan(0)
    })

    it('does not cap sets when well under MRV', () => {
      // Intermediate ceiling = 18. setsThisWeek = 5.
      // Remaining = 13 — plenty of room, no capping needed.
      const muscleStatus = createMuscleStatusMap({
        chest: { setsThisWeek: 5 },
      })
      const result = generateLocalWorkout(makeInput({
        muscleStatus,
        recommendedSplit: 'Push',
      }))
      const chestSets = result.exercises
        .filter(e => e.muscle_group === 'chest')
        .reduce((sum, e) => sum + e.sets, 0)
      // Normal Push generates 3 chest exercises: 4+4+3 = 11 sets
      // With 13 remaining, all sets should be preserved
      expect(chestSets).toBeGreaterThanOrEqual(11)
    })
  })
})
