import { describe, it, expect } from 'vitest'
import { generateFirstWorkout, isFirstWorkoutEligible } from '../firstWorkout'
import type { UserSettings } from '../../types'

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    name: 'Test',
    gender: 'male',
    goal: 'hypertrophy',
    frequency: '3x',
    restTime: 90,
    units: 'kg',
    memberSince: null,
    bodyweight: '75',
    experienceLevel: 'complete_beginner',
    equipment: 'full_gym',
    benchMax: '',
    squatMax: '',
    deadliftMax: '',
    ohpMax: '',
    onboardingCompleted: true,
    language: 'nl',
    time: 60,
    trainingGoal: 'hypertrophy',
    trainingPhase: 'build',
    mainLift: null,
    mainLiftGoalKg: null,
    mainLiftGoalDate: null,
    priorityMuscles: [],
    priorityMusclesUntil: null,
    ...overrides,
  }
}

describe('isFirstWorkoutEligible', () => {
  it('returns true for complete_beginner with 0 workouts', () => {
    expect(isFirstWorkoutEligible(0, 'complete_beginner')).toBe(true)
  })

  it('returns true for beginner with 0 workouts', () => {
    expect(isFirstWorkoutEligible(0, 'beginner')).toBe(true)
  })

  it('returns false for intermediate with 0 workouts', () => {
    expect(isFirstWorkoutEligible(0, 'intermediate')).toBe(false)
  })

  it('returns false for beginner with 1+ workouts', () => {
    expect(isFirstWorkoutEligible(1, 'beginner')).toBe(false)
  })

  it('returns false for advanced with 0 workouts', () => {
    expect(isFirstWorkoutEligible(0, 'advanced')).toBe(false)
  })
})

describe('First Workout Generator', () => {
  it('generates a Full Body workout for complete beginners', () => {
    const settings = makeSettings({ experienceLevel: 'complete_beginner' })
    const workout = generateFirstWorkout(settings)
    expect(workout.split).toBe('Full Body')
  })

  it('uses only bodyweight/dumbbell exercises when equipment is minimal', () => {
    const settings = makeSettings({ equipment: 'bodyweight' })
    const workout = generateFirstWorkout(settings)
    // All exercises should be bodyweight-compatible (weight_kg === 0 for bodyweight)
    for (const ex of workout.exercises) {
      // Bodyweight exercises either have 0 weight or are bodyweight-tagged
      expect(ex.weight_kg).toBe(0)
    }
    expect(workout.exercises.length).toBeGreaterThanOrEqual(4)
  })

  it('uses full gym exercises when equipment is full_gym', () => {
    const settings = makeSettings({ equipment: 'full_gym' })
    const workout = generateFirstWorkout(settings)
    // Should have exercises that use machines/barbells (weight > 0 for non-bodyweight)
    const hasWeightedExercise = workout.exercises.some(ex => ex.weight_kg > 0)
    expect(hasWeightedExercise).toBe(true)
  })

  it('workout has 4-6 exercises', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    expect(workout.exercises.length).toBeGreaterThanOrEqual(4)
    expect(workout.exercises.length).toBeLessThanOrEqual(6)
  })

  it('all exercises have low RPE targets (6-7)', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    for (const ex of workout.exercises) {
      expect(ex.rpe_target).toBeGreaterThanOrEqual(6)
      expect(ex.rpe_target).toBeLessThanOrEqual(7)
    }
  })

  it('includes a mix of compound and isolation', () => {
    const settings = makeSettings({ equipment: 'full_gym' })
    const workout = generateFirstWorkout(settings)
    // At least check we have multiple muscle groups covered
    const muscles = new Set(workout.exercises.map(e => e.muscle_group))
    expect(muscles.size).toBeGreaterThanOrEqual(3)
  })

  it('sets are conservative (2-3 per exercise)', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    for (const ex of workout.exercises) {
      expect(ex.sets).toBeGreaterThanOrEqual(2)
      expect(ex.sets).toBeLessThanOrEqual(3)
    }
  })

  it('includes brief exercise descriptions in notes', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    for (const ex of workout.exercises) {
      expect(ex.notes).toBeTruthy()
      expect(ex.notes.length).toBeGreaterThan(0)
    }
  })

  it('generates correct duration estimate (~30-40 min)', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    expect(workout.estimated_duration_min).toBeGreaterThanOrEqual(25)
    expect(workout.estimated_duration_min).toBeLessThanOrEqual(45)
  })

  it('works with dumbbells equipment', () => {
    // 'dumbbells' is used at runtime in localWorkoutGenerator despite not being in the Equipment type union
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = makeSettings({ equipment: 'dumbbells' as any })
    const workout = generateFirstWorkout(settings)
    expect(workout.exercises.length).toBeGreaterThanOrEqual(4)
    expect(workout.exercises.length).toBeLessThanOrEqual(6)
    expect(workout.split).toBe('Full Body')
  })

  it('returns proper AIWorkoutResponse format', () => {
    const settings = makeSettings()
    const workout = generateFirstWorkout(settings)
    expect(workout).toHaveProperty('split')
    expect(workout).toHaveProperty('reasoning')
    expect(workout).toHaveProperty('exercises')
    expect(workout).toHaveProperty('estimated_duration_min')
    expect(workout).toHaveProperty('volume_notes')

    for (const ex of workout.exercises) {
      expect(ex).toHaveProperty('name')
      expect(ex).toHaveProperty('muscle_group')
      expect(ex).toHaveProperty('sets')
      expect(ex).toHaveProperty('reps_min')
      expect(ex).toHaveProperty('reps_max')
      expect(ex).toHaveProperty('weight_kg')
      expect(ex).toHaveProperty('rpe_target')
      expect(ex).toHaveProperty('rest_seconds')
      expect(ex).toHaveProperty('notes')
      expect(ex).toHaveProperty('vs_last_session')
    }
  })
})
