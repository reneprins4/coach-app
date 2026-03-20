/**
 * TDD tests for Today's Workout Generator
 * Tests the local workout suggestion engine that picks the best split
 * and generates a workout without any API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase (required by periodization/settings import chain)
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}))

import { generateTodaysWorkout } from '../../lib/todaysWorkout'
import { createWorkout, createWorkoutSet, createSettings } from '../../__tests__/helpers'
import type { Workout } from '../../types'

// Helper: create workouts with varied muscle groups across days
function createRealisticWorkoutHistory(count: number): Workout[] {
  const splits: Array<{ split: string; exercises: Array<{ exercise: string; muscle: string }> }> = [
    {
      split: 'Push',
      exercises: [
        { exercise: 'Flat Barbell Bench Press', muscle: 'chest' },
        { exercise: 'Incline Dumbbell Press', muscle: 'chest' },
        { exercise: 'Dumbbell Overhead Press', muscle: 'shoulders' },
        { exercise: 'Lateral Raise', muscle: 'shoulders' },
        { exercise: 'Tricep Pushdown', muscle: 'triceps' },
      ],
    },
    {
      split: 'Pull',
      exercises: [
        { exercise: 'Barbell Row', muscle: 'back' },
        { exercise: 'Lat Pulldown (Wide)', muscle: 'back' },
        { exercise: 'Seated Cable Row', muscle: 'back' },
        { exercise: 'Barbell Curl', muscle: 'biceps' },
        { exercise: 'Hammer Curl', muscle: 'biceps' },
      ],
    },
    {
      split: 'Legs',
      exercises: [
        { exercise: 'Back Squat', muscle: 'quads' },
        { exercise: 'Leg Press', muscle: 'quads' },
        { exercise: 'Romanian Deadlift', muscle: 'hamstrings' },
        { exercise: 'Lying Leg Curl', muscle: 'hamstrings' },
        { exercise: 'Hip Thrust', muscle: 'glutes' },
      ],
    },
  ]

  const workouts: Workout[] = []
  for (let i = 0; i < count; i++) {
    const splitData = splits[i % splits.length]!
    const date = new Date()
    date.setDate(date.getDate() - (count - i) * 2) // every 2 days
    workouts.push(
      createWorkout(
        { split: splitData.split, created_at: date.toISOString() },
        splitData.exercises.map(e =>
          createWorkoutSet({ exercise: e.exercise, weight_kg: 60, reps: 10, rpe: 7.5 })
        ).map(s => ({ ...s }))
      )
    )
  }
  return workouts
}

describe("Today's Workout Generator", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when user has fewer than 3 workouts', () => {
    const workouts = [createWorkout(), createWorkout()]
    const result = generateTodaysWorkout(workouts)
    expect(result).toBeNull()
  })

  it('returns a workout suggestion when user has 3+ workouts', () => {
    const workouts = createRealisticWorkoutHistory(4)
    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    expect(result!.split).toBeTruthy()
    expect(result!.exercises.length).toBeGreaterThan(0)
  })

  it('picks split based on highest recovery score', () => {
    // Create workouts where Push was trained most recently (today),
    // Pull 2 days ago, Legs 4 days ago. Legs should have highest recovery.
    const now = new Date()
    const workouts: Workout[] = [
      // Most recent: Push (least recovered)
      createWorkout(
        { split: 'Push', created_at: new Date(now.getTime() - 4 * 3600000).toISOString() },
        [
          { exercise: 'Flat Barbell Bench Press', weight_kg: 80, reps: 8, rpe: 8 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 30, reps: 10, rpe: 7 },
          { exercise: 'Dumbbell Overhead Press', weight_kg: 25, reps: 10, rpe: 7 },
          { exercise: 'Tricep Pushdown', weight_kg: 30, reps: 12, rpe: 7 },
        ]
      ),
      // 2 days ago: Pull
      createWorkout(
        { split: 'Pull', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
        [
          { exercise: 'Barbell Row', weight_kg: 70, reps: 8, rpe: 8 },
          { exercise: 'Lat Pulldown (Wide)', weight_kg: 60, reps: 10, rpe: 7 },
          { exercise: 'Barbell Curl', weight_kg: 25, reps: 10, rpe: 7 },
        ]
      ),
      // 5 days ago: Legs (most recovered)
      createWorkout(
        { split: 'Legs', created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
        [
          { exercise: 'Back Squat', weight_kg: 100, reps: 8, rpe: 8 },
          { exercise: 'Romanian Deadlift', weight_kg: 80, reps: 10, rpe: 7 },
          { exercise: 'Hip Thrust', weight_kg: 80, reps: 10, rpe: 7 },
        ]
      ),
    ]

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    // Should NOT recommend Push since it was just trained 4 hours ago
    expect(result!.split).not.toBe('Push')
  })

  it('does not suggest a split with fatigued primary muscles', () => {
    const now = new Date()
    // Train Push muscles very recently and heavily
    const workouts: Workout[] = [
      createWorkout(
        { split: 'Push', created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
        [
          { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 5, rpe: 10 },
          { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 5, rpe: 10 },
          { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 5, rpe: 10 },
          { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 4, rpe: 10 },
          { exercise: 'Flat Barbell Bench Press', weight_kg: 100, reps: 4, rpe: 10 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 40, reps: 8, rpe: 9 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 40, reps: 7, rpe: 9.5 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 40, reps: 6, rpe: 10 },
          { exercise: 'Dumbbell Overhead Press', weight_kg: 30, reps: 8, rpe: 9 },
          { exercise: 'Dumbbell Overhead Press', weight_kg: 30, reps: 7, rpe: 9.5 },
        ]
      ),
      // Older workouts to meet minimum
      createWorkout(
        { split: 'Pull', created_at: new Date(now.getTime() - 4 * 86400000).toISOString() },
        [
          { exercise: 'Barbell Row', weight_kg: 70, reps: 8, rpe: 7 },
          { exercise: 'Lat Pulldown (Wide)', weight_kg: 60, reps: 10, rpe: 7 },
        ]
      ),
      createWorkout(
        { split: 'Legs', created_at: new Date(now.getTime() - 6 * 86400000).toISOString() },
        [
          { exercise: 'Back Squat', weight_kg: 100, reps: 8, rpe: 7 },
          { exercise: 'Romanian Deadlift', weight_kg: 80, reps: 10, rpe: 7 },
        ]
      ),
    ]

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    // Should not recommend Push since chest/shoulders/triceps are fatigued
    expect(result!.split).not.toBe('Push')
  })

  it('workout includes exercise count and estimated duration', () => {
    const workouts = createRealisticWorkoutHistory(5)
    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    expect(result!.exerciseCount).toBeGreaterThan(0)
    expect(result!.estimatedDuration).toBeGreaterThan(0)
    expect(result!.exerciseCount).toBe(result!.exercises.length)
  })

  it('workout uses local generator (no API call)', () => {
    // This test verifies the function is synchronous and returns immediately
    // (no async, no fetch calls)
    const workouts = createRealisticWorkoutHistory(4)
    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('No API calls allowed')
    })

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('workout includes split name and reasoning', () => {
    const workouts = createRealisticWorkoutHistory(5)
    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    expect(typeof result!.split).toBe('string')
    expect(result!.split.length).toBeGreaterThan(0)
    expect(typeof result!.reasoning).toBe('string')
    expect(result!.reasoning.length).toBeGreaterThan(0)
  })

  it('returns different split than yesterday if possible', () => {
    const now = new Date()
    // Yesterday was Push, so today should be something else
    const workouts: Workout[] = [
      createWorkout(
        { split: 'Push', created_at: new Date(now.getTime() - 20 * 3600000).toISOString() },
        [
          { exercise: 'Flat Barbell Bench Press', weight_kg: 80, reps: 8, rpe: 8 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 30, reps: 10, rpe: 7 },
          { exercise: 'Dumbbell Overhead Press', weight_kg: 25, reps: 10, rpe: 7 },
          { exercise: 'Tricep Pushdown', weight_kg: 30, reps: 12, rpe: 7 },
        ]
      ),
      createWorkout(
        { split: 'Pull', created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
        [
          { exercise: 'Barbell Row', weight_kg: 70, reps: 8, rpe: 7 },
          { exercise: 'Lat Pulldown (Wide)', weight_kg: 60, reps: 10, rpe: 7 },
          { exercise: 'Barbell Curl', weight_kg: 25, reps: 10, rpe: 7 },
        ]
      ),
      createWorkout(
        { split: 'Legs', created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
        [
          { exercise: 'Back Squat', weight_kg: 100, reps: 8, rpe: 8 },
          { exercise: 'Romanian Deadlift', weight_kg: 80, reps: 10, rpe: 7 },
          { exercise: 'Hip Thrust', weight_kg: 80, reps: 10, rpe: 7 },
        ]
      ),
    ]

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const result = generateTodaysWorkout(workouts)
    expect(result).not.toBeNull()
    // Push muscles were trained ~20h ago, should not be recommended again
    // The split scoring naturally penalizes recently trained muscles
    expect(result!.split).not.toBe('Push')
  })
})
