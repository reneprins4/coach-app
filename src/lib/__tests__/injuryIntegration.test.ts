/**
 * TDD tests for Injury Recovery integration across the stack:
 * - Local workout generator filtering
 * - Today's workout injury awareness
 * - Exercise picker warning badges
 * - AI prompt injury context
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { generateLocalWorkout } from '../localWorkoutGenerator'
import { generateTodaysWorkout } from '../todaysWorkout'
import {
  saveInjuries,
  isExerciseSafe,
  getRecoveryGuidance,
} from '../injuryRecovery'
import type { ActiveInjury } from '../injuryRecovery'
import { createMuscleStatusMap, createRecentSession, createWorkout, createWorkoutSet, createSettings } from '../../__tests__/helpers'
import type { MuscleGroup, Workout } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInjury(overrides: Partial<ActiveInjury> = {}): ActiveInjury {
  return {
    id: crypto.randomUUID(),
    bodyArea: 'shoulder',
    side: 'left',
    severity: 'moderate',
    reportedDate: new Date().toISOString(),
    status: 'active',
    checkIns: [],
    ...overrides,
  }
}

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

function createRealisticWorkoutHistory(count: number): Workout[] {
  const splits: Array<{ split: string; exercises: Array<{ exercise: string }> }> = [
    {
      split: 'Push',
      exercises: [
        { exercise: 'Flat Barbell Bench Press' },
        { exercise: 'Incline Dumbbell Press' },
        { exercise: 'Dumbbell Overhead Press' },
        { exercise: 'Lateral Raise' },
        { exercise: 'Tricep Pushdown' },
      ],
    },
    {
      split: 'Pull',
      exercises: [
        { exercise: 'Barbell Row' },
        { exercise: 'Lat Pulldown (Wide)' },
        { exercise: 'Seated Cable Row' },
        { exercise: 'Barbell Curl' },
        { exercise: 'Hammer Curl' },
      ],
    },
    {
      split: 'Legs',
      exercises: [
        { exercise: 'Back Squat' },
        { exercise: 'Leg Press' },
        { exercise: 'Romanian Deadlift' },
        { exercise: 'Lying Leg Curl' },
        { exercise: 'Hip Thrust' },
      ],
    },
  ]

  const workouts: Workout[] = []
  for (let i = 0; i < count; i++) {
    const splitData = splits[i % splits.length]!
    const date = new Date()
    date.setDate(date.getDate() - (count - i) * 2)
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

// ===========================================================================
// Local Workout Generator Integration
// ===========================================================================

describe('Injury Integration - Workout Generation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('local generator excludes exercises for active shoulder injury', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    saveInjuries(injuries)

    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))
    const exerciseNames = result.exercises.map(e => e.name.toLowerCase())

    // Should not contain exercises excluded by shoulder injury
    for (const name of exerciseNames) {
      expect(name).not.toMatch(/overhead press/i)
      expect(name).not.toMatch(/lateral raise/i)
      expect(name).not.toMatch(/arnold press/i)
      expect(name).not.toMatch(/upright row/i)
    }
  })

  it('local generator adds rehab exercises at end of workout', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    saveInjuries(injuries)

    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))

    // Should have rehab exercises appended
    const rehabExercises = result.exercises.filter(e => (e.muscle_group as string) === 'rehab')
    expect(rehabExercises.length).toBeGreaterThan(0)

    // Rehab exercises should be at the end
    const lastNonRehab = result.exercises.findLastIndex(e => (e.muscle_group as string) !== 'rehab')
    const firstRehab = result.exercises.findIndex(e => (e.muscle_group as string) === 'rehab')
    if (firstRehab !== -1 && lastNonRehab !== -1) {
      expect(firstRehab).toBeGreaterThan(lastNonRehab)
    }
  })

  it('local generator replaces excluded exercise with safe alternative', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    saveInjuries(injuries)

    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))
    const exerciseNames = result.exercises.map(e => e.name)

    // Landmine Press is a common shoulder-safe alternative
    // OR the excluded exercise is simply removed — either way, no unsafe exercises
    for (const name of exerciseNames) {
      const safe = isExerciseSafe(name, injuries)
      // Rehab exercises are always safe by definition
      const isRehab = (result.exercises.find(e => e.name === name)?.muscle_group as string) === 'rehab'
      if (!isRehab) {
        expect(safe).toBe(true)
      }
    }
  })

  it('local generator with no injuries returns normal workout', () => {
    // No injuries saved
    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))

    // Should have normal Push exercises without rehab
    expect(result.exercises.length).toBeGreaterThan(0)
    const rehabExercises = result.exercises.filter(e => (e.muscle_group as string) === 'rehab')
    expect(rehabExercises.length).toBe(0)
  })

  it('local generator handles multiple injuries simultaneously', () => {
    const injuries: ActiveInjury[] = [
      makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' }),
      makeInjury({ bodyArea: 'elbow', severity: 'mild', status: 'active' }),
    ]
    saveInjuries(injuries)

    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))
    const nonRehabExercises = result.exercises.filter(e => (e.muscle_group as string) !== 'rehab')

    // All non-rehab exercises should be safe for both injuries
    for (const ex of nonRehabExercises) {
      expect(isExerciseSafe(ex.name, injuries)).toBe(true)
    }
  })

  it('recovering injury applies 70% weight modifier note in reasoning', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'recovering' })]
    saveInjuries(injuries)

    const result = generateLocalWorkout(makeInput({ recommendedSplit: 'Push' }))

    // The reasoning should mention injury modification
    expect(result.reasoning.toLowerCase()).toMatch(/injury|blessure|modified|aangepast|recover/i)
  })
})

// ===========================================================================
// Today's Workout Integration
// ===========================================================================

describe('Injury Integration - Today\'s Workout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('todaysWorkout respects active injuries', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'knee', severity: 'moderate', status: 'active' })]
    saveInjuries(injuries)

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const workouts = createRealisticWorkoutHistory(5)
    const result = generateTodaysWorkout(workouts)

    if (result) {
      const nonRehabExercises = result.exercises.filter(e => (e.muscle_group as string) !== 'rehab')
      // All non-rehab exercises should be safe for knee injury
      for (const ex of nonRehabExercises) {
        expect(isExerciseSafe(ex.name, injuries)).toBe(true)
      }
    }
  })

  it('todaysWorkout still suggests workouts when injury only affects some muscles', () => {
    // Shoulder injury should still allow Legs/Pull workouts
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    saveInjuries(injuries)

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const workouts = createRealisticWorkoutHistory(5)
    const result = generateTodaysWorkout(workouts)

    // Should still return a workout suggestion
    expect(result).not.toBeNull()
    expect(result!.exercises.length).toBeGreaterThan(0)
  })

  it('todaysWorkout suggests Full Body with modifications when injury is mild', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'mild', status: 'active' })]
    saveInjuries(injuries)

    const settings = createSettings()
    localStorage.setItem('coach-app-settings', JSON.stringify(settings))

    const workouts = createRealisticWorkoutHistory(5)
    const result = generateTodaysWorkout(workouts)

    // Should still return a workout
    expect(result).not.toBeNull()
    if (result) {
      // All exercises should be injury-safe
      const nonRehabExercises = result.exercises.filter(e => (e.muscle_group as string) !== 'rehab')
      for (const ex of nonRehabExercises) {
        expect(isExerciseSafe(ex.name, injuries)).toBe(true)
      }
    }
  })
})

// ===========================================================================
// Exercise Picker Integration
// ===========================================================================

describe('Injury Integration - Exercise Picker', () => {
  it('exercise has warning when unsafe for active injury', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    const safe = isExerciseSafe('Barbell Overhead Press', injuries)
    expect(safe).toBe(false)
  })

  it('exercise without injury conflict shows no warning', () => {
    const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })]
    const safe = isExerciseSafe('Back Squat', injuries)
    expect(safe).toBe(true)
  })

  it('warning reflects which injury it conflicts with', () => {
    const shoulderInjury = makeInjury({ bodyArea: 'shoulder', severity: 'moderate', status: 'active' })
    const kneeInjury = makeInjury({ bodyArea: 'knee', severity: 'moderate', status: 'active' })

    // Overhead Press conflicts with shoulder, not knee
    expect(isExerciseSafe('Barbell Overhead Press', [shoulderInjury])).toBe(false)
    expect(isExerciseSafe('Barbell Overhead Press', [kneeInjury])).toBe(true)

    // Squat conflicts with knee, not shoulder
    expect(isExerciseSafe('Back Squat', [kneeInjury])).toBe(false)
    expect(isExerciseSafe('Back Squat', [shoulderInjury])).toBe(true)
  })
})

// ===========================================================================
// Recovery Guidance Integration
// ===========================================================================

describe('Injury Integration - Recovery Guidance', () => {
  it('recovering injury returns 70% weight modifier', () => {
    const injury = makeInjury({ status: 'recovering' })
    const guidance = getRecoveryGuidance(injury)
    expect(guidance.weightModifier).toBeCloseTo(0.7, 1)
  })

  it('active injury returns 0 weight modifier (full avoidance)', () => {
    const injury = makeInjury({ status: 'active' })
    const guidance = getRecoveryGuidance(injury)
    expect(guidance.weightModifier).toBe(0)
  })

  it('resolved injury returns 1.0 weight modifier (normal)', () => {
    const injury = makeInjury({ status: 'resolved' })
    const guidance = getRecoveryGuidance(injury)
    expect(guidance.weightModifier).toBe(1)
  })
})
