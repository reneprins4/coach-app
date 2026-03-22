import { describe, it, expect } from 'vitest'
import { groupVolumeByWeek, groupVolumeByMuscle } from './volumeTracker'
import type { Workout } from '../types'

/** Helper to create a workout with sets at a given date (default: now) */
function makeWorkout(
  sets: { exercise: string; weight_kg: number | null; reps: number | null }[],
  daysAgo: number = 0,
): Workout {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id: `w-${daysAgo}`,
    user_id: 'u1',
    split: 'Push',
    created_at: date.toISOString(),
    completed_at: date.toISOString(),
    notes: null,
    totalVolume: 0,
    exerciseNames: sets.map(s => s.exercise),
    workout_sets: sets.map((s, i) => ({
      id: `s${i}-${daysAgo}`,
      workout_id: `w-${daysAgo}`,
      user_id: 'u1',
      exercise: s.exercise,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: null,
      created_at: date.toISOString(),
    })),
  }
}

describe('calcWorkoutVolume - bodyweight handling (ALGO-008)', () => {
  it('bodyweight exercise (weight=0) uses reps as volume, not 0', () => {
    const workout = makeWorkout([
      { exercise: 'Push Up', weight_kg: 0, reps: 15 },
    ])
    const result = groupVolumeByWeek([workout], 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.totalVolume).toBe(15) // reps-based volume
  })

  it('bodyweight exercise (weight=null) uses reps as volume, not 0', () => {
    const workout = makeWorkout([
      { exercise: 'Pull Up', weight_kg: null, reps: 10 },
    ])
    const result = groupVolumeByWeek([workout], 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.totalVolume).toBe(10)
  })

  it('regular weighted exercise volume is weight * reps (unchanged)', () => {
    const workout = makeWorkout([
      { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
    ])
    const result = groupVolumeByWeek([workout], 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.totalVolume).toBe(800)
  })

  it('mixed workout sums weighted and bodyweight volume correctly', () => {
    const workout = makeWorkout([
      { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
      { exercise: 'Push Up', weight_kg: 0, reps: 20 },
    ])
    const result = groupVolumeByWeek([workout], 1)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.totalVolume).toBe(820) // 800 + 20
  })
})

describe('groupVolumeByMuscle - extended periods (MF-010)', () => {
  const chestSets = [
    { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
    { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
    { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
  ]

  it('supports 8-week period', () => {
    // Workout at 6 weeks ago should be included in 8-week window
    const workouts = [
      makeWorkout(chestSets, 0),        // today
      makeWorkout(chestSets, 42),       // 6 weeks ago
    ]

    const result = groupVolumeByMuscle(workouts, 8)

    // Both workouts have 3 sets of Bench Press -> chest
    expect(result['chest']).toBe(6)
  })

  it('supports 16-week period', () => {
    // Workout at 14 weeks ago should be included in 16-week window
    const workouts = [
      makeWorkout(chestSets, 0),        // today
      makeWorkout(chestSets, 98),       // 14 weeks ago
    ]

    const result = groupVolumeByMuscle(workouts, 16)

    expect(result['chest']).toBe(6)
  })

  it('excludes workouts outside the period window', () => {
    const workouts = [
      makeWorkout(chestSets, 0),        // today
      makeWorkout(chestSets, 60),       // ~8.5 weeks ago — outside 8w window
    ]

    const result = groupVolumeByMuscle(workouts, 8)

    // Only today's workout should count
    expect(result['chest']).toBe(3)
  })
})
