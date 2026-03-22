import { describe, it, expect } from 'vitest'
import { groupVolumeByWeek } from './volumeTracker'
import type { Workout } from '../types'

/** Helper to create a workout with sets at a recent date */
function makeWorkout(sets: { exercise: string; weight_kg: number | null; reps: number | null }[]): Workout {
  const now = new Date()
  return {
    id: 'w1',
    user_id: 'u1',
    split: 'Push',
    created_at: now.toISOString(),
    completed_at: now.toISOString(),
    notes: null,
    totalVolume: 0,
    exerciseNames: sets.map(s => s.exercise),
    workout_sets: sets.map((s, i) => ({
      id: `s${i}`,
      workout_id: 'w1',
      user_id: 'u1',
      exercise: s.exercise,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: null,
      created_at: now.toISOString(),
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
