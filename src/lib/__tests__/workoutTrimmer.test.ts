import { describe, it, expect } from 'vitest'
import { trimWorkout } from '../workoutTrimmer'
import type { ActiveExercise } from '../../types'

function makeExercise(name: string, setCount: number): ActiveExercise {
  return {
    name,
    muscle_group: 'chest',
    sets: Array.from({ length: setCount }, (_, i) => ({
      id: `${name}-set-${i}`,
      weight_kg: 80,
      reps: 10,
      duration_seconds: null,
      rpe: null,
      created_at: new Date().toISOString(),
    })),
  }
}

describe('trimWorkout', () => {
  it('removes unstarted exercises from the end', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Bench Press', 3),
      makeExercise('Incline Press', 0),
      makeExercise('Flyes', 0),
      makeExercise('Tricep Pushdown', 0),
    ]

    const result = trimWorkout(exercises, 2)

    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('Bench Press')
    expect(result[1]!.name).toBe('Incline Press')
  })

  it('keeps exercises that already have logged sets', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Bench Press', 3),
      makeExercise('Incline Press', 0),
      makeExercise('Flyes', 2),       // started — must keep
      makeExercise('Tricep Pushdown', 0),
    ]

    const result = trimWorkout(exercises, 2)

    // target=2 but Flyes has sets, so it's kept as well
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.map(e => e.name)).toContain('Bench Press')
    expect(result.map(e => e.name)).toContain('Flyes')
  })

  it('with targetExercises=3 keeps first 3 + any started ones', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Squat', 4),
      makeExercise('Leg Press', 0),
      makeExercise('Lunges', 0),
      makeExercise('Leg Curl', 1),    // started
      makeExercise('Calf Raise', 0),
    ]

    const result = trimWorkout(exercises, 3)

    // Should keep first 3 (Squat, Leg Press, Lunges) + Leg Curl (started)
    expect(result).toHaveLength(4)
    expect(result.map(e => e.name)).toEqual([
      'Squat',
      'Leg Press',
      'Lunges',
      'Leg Curl',
    ])
  })

  it('returns all exercises when targetCount >= exercise count', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Bench Press', 2),
      makeExercise('Rows', 0),
    ]

    const result = trimWorkout(exercises, 5)

    expect(result).toHaveLength(2)
  })

  it('returns all exercises when all have logged sets', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Bench Press', 3),
      makeExercise('Rows', 2),
      makeExercise('Overhead Press', 1),
    ]

    const result = trimWorkout(exercises, 1)

    // All started — cannot trim any
    expect(result).toHaveLength(3)
  })

  it('handles empty exercises array', () => {
    const result = trimWorkout([], 3)
    expect(result).toHaveLength(0)
  })

  it('preserves exercise order after trimming', () => {
    const exercises: ActiveExercise[] = [
      makeExercise('Squat', 3),
      makeExercise('Bench Press', 0),
      makeExercise('Deadlift', 0),
      makeExercise('Overhead Press', 0),
      makeExercise('Barbell Row', 0),
    ]

    const result = trimWorkout(exercises, 3)

    expect(result.map(e => e.name)).toEqual([
      'Squat',
      'Bench Press',
      'Deadlift',
    ])
  })
})
