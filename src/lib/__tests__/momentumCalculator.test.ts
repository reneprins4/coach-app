/**
 * Tests for src/lib/momentumCalculator.ts
 */
import { describe, it, expect } from 'vitest'
import { calculateMomentum } from '../momentumCalculator'

function makeMomentumWorkout(sets: Array<{ weight_kg: number; reps: number; rpe?: number }>) {
  const now = Date.now()
  return {
    exercises: [{
      name: 'Bench Press',
      sets: sets.map((s, i) => ({
        created_at: new Date(now + i * 60000).toISOString(), // 1 min apart
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe ?? null,
      })),
    }],
  }
}

describe('momentumCalculator', () => {
  describe('calculateMomentum', () => {
    it('does not show declining momentum during deload week', () => {
      // During deload: lower weight, lower reps, higher RPE trend (typical deload pattern)
      // This would normally trigger e1rm_dropping and rpe_degrading signals
      const workout = makeMomentumWorkout([
        { weight_kg: 60, reps: 8, rpe: 5 },
        { weight_kg: 55, reps: 8, rpe: 5.5 },
        { weight_kg: 50, reps: 8, rpe: 6 },
        { weight_kg: 50, reps: 6, rpe: 7 },
        { weight_kg: 45, reps: 6, rpe: 7.5 },
      ])

      const result = calculateMomentum(workout, { isDeload: true })

      expect(result).not.toBeNull()
      // During deload, status should never be 'declining' or 'fatigue'
      expect(result!.status).not.toBe('declining')
      expect(result!.status).not.toBe('fatigue')
      // Negative signals should be suppressed
      expect(result!.signals).not.toContain('e1rm_dropping')
      expect(result!.signals).not.toContain('rpe_degrading')
      expect(result!.signals).not.toContain('reps_dropping')
    })

    it('shows normal momentum signals in non-deload weeks', () => {
      // Declining performance should show declining/fatigue status normally
      const workout = makeMomentumWorkout([
        { weight_kg: 80, reps: 8, rpe: 7 },
        { weight_kg: 80, reps: 6, rpe: 8 },
        { weight_kg: 75, reps: 5, rpe: 9 },
        { weight_kg: 70, reps: 4, rpe: 9.5 },
        { weight_kg: 65, reps: 3, rpe: 10 },
      ])

      const resultNoDeload = calculateMomentum(workout, { isDeload: false })
      const resultDefault = calculateMomentum(workout)

      // Both should produce the same result
      expect(resultNoDeload).not.toBeNull()
      expect(resultDefault).not.toBeNull()
      expect(resultNoDeload!.score).toBe(resultDefault!.score)
      expect(resultNoDeload!.status).toBe(resultDefault!.status)

      // Should detect declining performance
      expect(resultDefault!.score).toBeLessThan(50)
    })

    it('returns null for workouts with fewer than 3 valid sets', () => {
      const workout = makeMomentumWorkout([
        { weight_kg: 80, reps: 8 },
        { weight_kg: 80, reps: 8 },
      ])
      expect(calculateMomentum(workout)).toBeNull()
    })

    it('shows deload-specific message when isDeload is true', () => {
      const workout = makeMomentumWorkout([
        { weight_kg: 50, reps: 10, rpe: 5 },
        { weight_kg: 45, reps: 10, rpe: 5 },
        { weight_kg: 45, reps: 8, rpe: 6 },
        { weight_kg: 40, reps: 8, rpe: 6 },
      ])

      const result = calculateMomentum(workout, { isDeload: true })
      expect(result).not.toBeNull()
      expect(result!.status).toBe('deload')
    })
  })
})
