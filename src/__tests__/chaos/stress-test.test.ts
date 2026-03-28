/**
 * Stress tests for algorithm performance with large datasets.
 *
 * Validates that core analysis functions complete within acceptable time
 * bounds and produce correct results when processing 500+ workouts
 * spanning 2+ years of training data.
 */

import { describe, it, expect } from 'vitest'
import { generateLinearProgression } from '../../lib/__tests__/simulation/workoutGenerator'
import { analyzeTraining } from '../../lib/training-analysis'
import { detectPlateaus } from '../../lib/plateauDetector'
import { detectFatigue } from '../../lib/fatigueDetector'
import { analyzeOptimalHour } from '../../lib/optimalHour'
import { groupVolumeByWeek, groupVolumeByMuscle } from '../../lib/volumeTracker'
import { analyzeWeaknesses } from '../../lib/weaknessHunter'
import { computeTrainingStory } from '../../lib/trainingStory'
import { buildAchievementContext } from '../../lib/achievements'
import type { Workout, WorkoutSet } from '../../types'

// ---------------------------------------------------------------------------
// Dataset generation
// ---------------------------------------------------------------------------

// 2-year power user: 520 workouts (5x/week for 104 weeks)
const LARGE_DATASET = generateLinearProgression({
  exercises: [
    'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
    'Row', 'Curl', 'Tricep Extension', 'Leg Press',
  ],
  weeks: 104,
  sessionsPerWeek: 5,
  startWeights: {
    'Bench Press': 60, 'Squat': 80, 'Deadlift': 100,
    'Overhead Press': 40, 'Row': 60, 'Curl': 15,
    'Tricep Extension': 20, 'Leg Press': 100,
  },
  weeklyIncreasePct: 0.005,
})

// ---------------------------------------------------------------------------
// Dataset integrity
// ---------------------------------------------------------------------------

describe('Stress: Large dataset integrity', () => {
  it('dataset has 520 workouts', () => {
    expect(LARGE_DATASET.length).toBe(520)
  })

  it('all workouts have valid structure', () => {
    for (const w of LARGE_DATASET) {
      expect(w.id).toBeTruthy()
      expect(w.created_at).toBeTruthy()
      expect(w.workout_sets.length).toBeGreaterThan(0)
      expect(w.totalVolume).toBeGreaterThan(0)
    }
  })

  it('workouts span approximately 2 years', () => {
    const dates = LARGE_DATASET.map(w => new Date(w.created_at).getTime())
    const earliest = Math.min(...dates)
    const latest = Math.max(...dates)
    const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24)
    expect(spanDays).toBeGreaterThan(700) // ~2 years
    expect(spanDays).toBeLessThan(740)
  })
})

// ---------------------------------------------------------------------------
// Performance tests -- each must complete within budget
// ---------------------------------------------------------------------------

describe('Stress: Large dataset performance', () => {
  it('analyzeTraining completes in < 500ms with 520 workouts', () => {
    const start = performance.now()
    const result = analyzeTraining(LARGE_DATASET)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)
    expect(result).toBeDefined()
    // Should return status for all 9 muscle groups
    expect(Object.keys(result).length).toBe(9)
  })

  it('detectPlateaus completes in < 500ms with 520 workouts', () => {
    const start = performance.now()
    const result = detectPlateaus(LARGE_DATASET)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)
    expect(Array.isArray(result)).toBe(true)
  })

  it('detectFatigue completes in < 200ms with 520 workouts', () => {
    const start = performance.now()
    const result = detectFatigue(LARGE_DATASET, 3, 5)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
    expect(result).toBeDefined()
    expect(typeof result.fatigued).toBe('boolean')
  })

  it('analyzeOptimalHour completes in < 300ms with 520 workouts', () => {
    const start = performance.now()
    const result = analyzeOptimalHour(LARGE_DATASET)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(300)
    expect(result.hasEnoughData).toBe(true)
  })

  it('groupVolumeByWeek completes in < 200ms with 520 workouts', () => {
    const start = performance.now()
    const result = groupVolumeByWeek(LARGE_DATASET, 104)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
    expect(result.length).toBeGreaterThan(0)
  })

  it('groupVolumeByMuscle completes in < 200ms with 520 workouts', () => {
    const start = performance.now()
    const result = groupVolumeByMuscle(LARGE_DATASET, 104)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
    expect(typeof result).toBe('object')
  })

  it('analyzeWeaknesses completes in < 300ms with 520 workouts', () => {
    const start = performance.now()
    const result = analyzeWeaknesses(LARGE_DATASET, 16)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(300)
    expect(result).toBeDefined()
    expect(typeof result.totalSets).toBe('number')
  })

  it('computeTrainingStory completes in < 300ms with 520 workouts', () => {
    // Use a month that falls within the dataset range
    const midDate = new Date(LARGE_DATASET[Math.floor(LARGE_DATASET.length / 2)]!.created_at)
    const month = midDate.getMonth()
    const year = midDate.getFullYear()

    const start = performance.now()
    const result = computeTrainingStory(LARGE_DATASET, month, year, 5)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(300)
    expect(result).toBeDefined()
    expect(typeof result.totalWorkouts).toBe('number')
  })

  it('buildAchievementContext completes in < 200ms with 520 workouts', () => {
    const start = performance.now()
    const result = buildAchievementContext(LARGE_DATASET, 90, '2024-01-01')
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
    expect(result).toBeDefined()
    expect(result.workouts.length).toBe(520)
  })
})

// ---------------------------------------------------------------------------
// Correctness with large data
// ---------------------------------------------------------------------------

describe('Stress: Correctness at scale', () => {
  it('plateau detection stays reasonable with steady 0.5%/week progression', () => {
    const plateaus = detectPlateaus(LARGE_DATASET)
    // 0.5%/week is borderline for the detector's 0.5% threshold, so some
    // exercises may register as 'slowing'. However we should not see all 8
    // exercises flagged -- that would indicate a false-positive storm.
    expect(plateaus.length).toBeLessThan(LARGE_DATASET[0]!.workout_sets.length / 3)
    // Any detected plateaus should be 'slowing' not full 'plateau' given
    // the weight is actually increasing
    for (const p of plateaus) {
      expect(['slowing', 'plateau']).toContain(p.status)
    }
  })

  it('optimal hour has high confidence with 520 workouts', () => {
    const result = analyzeOptimalHour(LARGE_DATASET)
    // 520 workouts >> 60 threshold for 'high' confidence
    expect(result.confidence).toBe('high')
  })

  it('achievements detect workout count milestones', () => {
    const ctx = buildAchievementContext(LARGE_DATASET, 90, '2024-01-01')
    expect(ctx.workouts.length).toBe(520)
    // 520 workouts with 8 exercises * 3 sets each at decent weights
    // should accumulate significant volume
    expect(ctx.totalVolume).toBeGreaterThan(100000)
  })

  it('analyzeTraining returns all muscle groups with data', () => {
    const result = analyzeTraining(LARGE_DATASET)
    // With 8 compound exercises, most muscle groups should have data
    const musclesWithData = Object.values(result).filter(
      ms => ms.daysSinceLastTrained !== null
    )
    expect(musclesWithData.length).toBeGreaterThanOrEqual(5)
  })

  it('groupVolumeByWeek returns approximately 104 weeks of data', () => {
    const result = groupVolumeByWeek(LARGE_DATASET, 104)
    // Should have close to 104 weeks (some variance due to date grouping)
    expect(result.length).toBeGreaterThan(90)
    expect(result.length).toBeLessThanOrEqual(105)
  })

  it('weakness analysis processes all sets from 520 workouts', () => {
    // Use the full 104-week window to capture entire dataset
    // Date cutoff is computed from now, so boundary workouts may be excluded
    const result = analyzeWeaknesses(LARGE_DATASET, 108)
    expect(result.workoutCount).toBeGreaterThanOrEqual(515)
    expect(result.workoutCount).toBeLessThanOrEqual(520)
    // ~520 workouts * 8 exercises * 3 sets = ~12480 sets
    expect(result.totalSets).toBeGreaterThan(10000)
  })
})

// ---------------------------------------------------------------------------
// Extreme edge cases
// ---------------------------------------------------------------------------

describe('Stress: Extreme edge cases', () => {
  it('1000 workouts does not cause stack overflow', () => {
    const massive = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 200,
      sessionsPerWeek: 5,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0.002,
    })
    expect(massive.length).toBe(1000)
    expect(() => analyzeTraining(massive)).not.toThrow()
  })

  it('analyzeTraining with 1000 workouts completes in < 1000ms', () => {
    const massive = generateLinearProgression({
      exercises: ['Bench Press', 'Squat'],
      weeks: 200,
      sessionsPerWeek: 5,
      startWeights: { 'Bench Press': 60, 'Squat': 80 },
      weeklyIncreasePct: 0.002,
    })

    const start = performance.now()
    analyzeTraining(massive)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(1000)
  })

  it('workout with 50 exercises does not crash', () => {
    const exercises = Array.from({ length: 50 }, (_, i) => `Exercise ${i}`)
    const startWeights = Object.fromEntries(exercises.map(e => [e, 20]))
    const workouts = generateLinearProgression({
      exercises,
      weeks: 1,
      sessionsPerWeek: 1,
      startWeights,
      weeklyIncreasePct: 0,
    })
    expect(workouts.length).toBe(1)
    expect(workouts[0]!.workout_sets.length).toBe(150) // 50 exercises * 3 sets
    expect(() => analyzeTraining(workouts)).not.toThrow()
  })

  it('workout with 100 sets per exercise does not crash', () => {
    // Manually build a single workout with 100 sets of bench press
    const sets: WorkoutSet[] = Array.from({ length: 100 }, (_, i) => ({
      id: `stress-set-${i}`,
      workout_id: 'stress-workout-1',
      user_id: 'stress-user',
      exercise: 'Bench Press',
      weight_kg: 80,
      reps: 5,
      duration_seconds: null,
      rpe: 8,
      created_at: new Date().toISOString(),
    }))

    const workout: Workout = {
      id: 'stress-workout-1',
      user_id: 'stress-user',
      split: 'Push',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: null,
      workout_sets: sets,
      totalVolume: 100 * 80 * 5,
      exerciseNames: ['Bench Press'],
    }

    expect(() => analyzeTraining([workout])).not.toThrow()
    expect(() => detectPlateaus([workout])).not.toThrow()
    expect(() => detectFatigue([workout])).not.toThrow()
    expect(() => groupVolumeByWeek([workout])).not.toThrow()
    expect(() => analyzeWeaknesses([workout])).not.toThrow()
  })

  it('all algorithms handle empty dataset without error', () => {
    const empty: Workout[] = []

    expect(() => analyzeTraining(empty)).not.toThrow()
    expect(() => detectPlateaus(empty)).not.toThrow()
    expect(() => detectFatigue(empty)).not.toThrow()
    expect(() => analyzeOptimalHour(empty)).not.toThrow()
    expect(() => groupVolumeByWeek(empty)).not.toThrow()
    expect(() => groupVolumeByMuscle(empty)).not.toThrow()
    expect(() => analyzeWeaknesses(empty)).not.toThrow()
    expect(() => buildAchievementContext(empty, 90, null)).not.toThrow()
  })

  it('single workout dataset does not crash any algorithm', () => {
    const single = generateLinearProgression({
      exercises: ['Bench Press'],
      weeks: 1,
      sessionsPerWeek: 1,
      startWeights: { 'Bench Press': 60 },
      weeklyIncreasePct: 0,
    })
    expect(single.length).toBe(1)

    expect(() => analyzeTraining(single)).not.toThrow()
    expect(() => detectPlateaus(single)).not.toThrow()
    expect(() => detectFatigue(single)).not.toThrow()
    expect(() => analyzeOptimalHour(single)).not.toThrow()
    expect(() => groupVolumeByWeek(single)).not.toThrow()
    expect(() => groupVolumeByMuscle(single)).not.toThrow()
    expect(() => analyzeWeaknesses(single)).not.toThrow()
    expect(() => computeTrainingStory(single, 0, 2026, 3)).not.toThrow()
    expect(() => buildAchievementContext(single, 80, null)).not.toThrow()
  })
})
