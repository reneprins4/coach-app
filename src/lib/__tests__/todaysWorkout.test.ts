/**
 * Tests for src/lib/todaysWorkout.ts
 * ENGINE-001: Verify that recent workout history is passed to the local
 * generator so progressive overload can use actual weights, not beginner estimates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWorkout, createMuscleStatusMap, createSettings, createTrainingBlock } from '../../__tests__/helpers'
import type { Workout, RecentSession } from '../../types'

// Mock all dependencies of generateTodaysWorkout
vi.mock('../training-analysis', () => ({
  analyzeTraining: () => createMuscleStatusMap(),
  scoreSplits: () => [{ name: 'Push', score: 100, reasoning: 'Best split' }],
  getRecentSplits: () => [],
}))

vi.mock('../settings', () => ({
  getSettings: () => createSettings(),
}))

vi.mock('../periodization', () => ({
  getCurrentBlock: () => createTrainingBlock(),
  getCurrentWeekTarget: () => ({ week: 1, rpe: 7, repRange: [10, 12] as [number, number], setNote: 'Base', isDeload: false }),
  PHASES: {
    accumulation: {
      label: 'Accumulation', weeks: 4, description: '', color: 'blue',
      weekTargets: [{ week: 1, rpe: 7, repRange: [10, 12], setNote: 'Base', isDeload: false }],
    },
  },
}))

vi.mock('../workoutPreferences', () => ({
  buildWorkoutPreferences: () => ({
    isDeload: false,
    targetRPE: 8,
    targetRepRange: [8, 12] as [number, number],
  }),
}))

// Spy on generateLocalWorkout to capture the recentHistory argument
const generateLocalWorkoutSpy = vi.fn().mockReturnValue({
  exercises: [
    { name: 'Flat Barbell Bench Press', muscle_group: 'chest', sets: 3, reps_min: 8, reps_max: 12, weight_kg: 82.5, rpe_target: 8, rest_seconds: 120, notes: '', vs_last_session: 'up' },
  ],
  estimated_duration_min: 55,
  split: 'Push',
  reasoning: 'Push recommended',
  volume_notes: 'chest: 3 sets',
})

vi.mock('../localWorkoutGenerator', () => ({
  generateLocalWorkout: (...args: unknown[]) => generateLocalWorkoutSpy(...args),
}))

// Must import AFTER vi.mock calls
const { generateTodaysWorkout } = await import('../todaysWorkout')

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

describe('generateTodaysWorkout', () => {
  beforeEach(() => {
    generateLocalWorkoutSpy.mockClear()
  })

  it('passes recent workout history to local generator for progressive overload', () => {
    // Create workouts with actual sets (weight + reps)
    const workouts: Workout[] = [
      createWorkout(
        { created_at: daysAgo(1), split: 'Push' },
        [
          { exercise: 'Flat Barbell Bench Press', weight_kg: 80, reps: 10, rpe: 7 },
          { exercise: 'Incline Dumbbell Press', weight_kg: 30, reps: 12, rpe: 7.5 },
        ],
      ),
      createWorkout(
        { created_at: daysAgo(3), split: 'Pull' },
        [
          { exercise: 'Barbell Row', weight_kg: 70, reps: 8, rpe: 8 },
        ],
      ),
      createWorkout({ created_at: daysAgo(5), split: 'Legs' }, [{ exercise: 'Back Squat', weight_kg: 100, reps: 6, rpe: 8.5 }]),
      createWorkout({ created_at: daysAgo(7), split: 'Push' }, [{ exercise: 'Flat Barbell Bench Press', weight_kg: 77.5, reps: 10, rpe: 7.5 }]),
    ]

    generateTodaysWorkout(workouts)

    // Verify the local generator was called
    expect(generateLocalWorkoutSpy).toHaveBeenCalledTimes(1)

    // Extract the recentHistory from the call
    const callArg = generateLocalWorkoutSpy.mock.calls[0]![0] as { recentHistory: RecentSession[] }
    expect(callArg.recentHistory).toBeDefined()
    expect(callArg.recentHistory.length).toBeGreaterThan(0)

    // First session should have the sets from the most recent workout
    const firstSession = callArg.recentHistory[0]!
    expect(firstSession.date).toBe(workouts[0]!.created_at)
    expect(firstSession.sets).toHaveLength(2)
    expect(firstSession.sets[0]).toEqual({
      exercise: 'Flat Barbell Bench Press',
      weight_kg: 80,
      reps: 10,
      duration_seconds: null,
      rpe: 7,
    })
  })

  it('recent history includes sets from last 5 workouts', () => {
    // Create 7 workouts — only first 5 should be included
    const workouts: Workout[] = Array.from({ length: 7 }, (_, i) =>
      createWorkout(
        { created_at: daysAgo(i + 1), split: 'Push' },
        [{ exercise: `Exercise ${i}`, weight_kg: 50 + i * 5, reps: 10, rpe: 7 }],
      ),
    )

    generateTodaysWorkout(workouts)

    expect(generateLocalWorkoutSpy).toHaveBeenCalledTimes(1)
    const callArg = generateLocalWorkoutSpy.mock.calls[0]![0] as { recentHistory: RecentSession[] }
    expect(callArg.recentHistory).toHaveLength(5)

    // Verify the 6th and 7th workouts are excluded
    const exerciseNames = callArg.recentHistory.map((s: RecentSession) => s.sets[0]?.exercise)
    expect(exerciseNames).not.toContain('Exercise 5')
    expect(exerciseNames).not.toContain('Exercise 6')
  })

  it('handles workouts with missing set data gracefully', () => {
    const workouts: Workout[] = [
      createWorkout(
        { created_at: daysAgo(1), split: 'Push' },
        [{ exercise: 'Bench Press', weight_kg: null, reps: null, rpe: null }],
      ),
      createWorkout({ created_at: daysAgo(3), split: 'Pull' }, [{ exercise: 'Row', weight_kg: 60, reps: 8, rpe: 7 }]),
      createWorkout({ created_at: daysAgo(5), split: 'Legs' }, [{ exercise: 'Squat', weight_kg: 100, reps: 5, rpe: 8 }]),
    ]

    generateTodaysWorkout(workouts)

    const callArg = generateLocalWorkoutSpy.mock.calls[0]![0] as { recentHistory: RecentSession[] }
    // Null values should be converted to 0 / null
    const firstSet = callArg.recentHistory[0]!.sets[0]!
    expect(firstSet.weight_kg).toBe(0)
    expect(firstSet.reps).toBe(0)
    expect(firstSet.rpe).toBeNull()
  })

  it('returns null when fewer than 3 workouts exist (history irrelevant)', () => {
    const workouts: Workout[] = [
      createWorkout({ created_at: daysAgo(1) }),
      createWorkout({ created_at: daysAgo(3) }),
    ]

    const result = generateTodaysWorkout(workouts)

    expect(result).toBeNull()
    expect(generateLocalWorkoutSpy).not.toHaveBeenCalled()
  })
})
