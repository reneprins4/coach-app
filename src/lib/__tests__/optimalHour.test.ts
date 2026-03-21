import { describe, it, expect } from 'vitest'
import { createWorkout } from '../../__tests__/helpers'
import type { Workout } from '../../types'
import {
  getTimeSlot,
  analyzeOptimalHour,
  formatSlotLabel,
  computeWorkoutScore,
} from '../optimalHour'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a workout at a specific hour with customizable sets */
function workoutAt(
  hour: number,
  minute: number,
  sets: Array<{ weight_kg: number; reps: number; rpe?: number | null }>,
  dayOffset = 0,
): Workout {
  const date = new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
  return createWorkout(
    { created_at: date.toISOString() },
    sets.map(s => ({
      exercise: 'Bench Press',
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe ?? null,
    })),
  )
}

/** Generate N workouts at a given hour with consistent sets */
function generateWorkoutsAtHour(
  hour: number,
  count: number,
  sets: Array<{ weight_kg: number; reps: number; rpe?: number | null }>,
): Workout[] {
  return Array.from({ length: count }, (_, i) =>
    workoutAt(hour, 0, sets, i),
  )
}

// ---------------------------------------------------------------------------
// Data requirements
// ---------------------------------------------------------------------------

describe('Optimal Hour', () => {
  describe('data requirements', () => {
    it('returns hasEnoughData false for < 20 workouts', () => {
      const workouts = generateWorkoutsAtHour(9, 10, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour(workouts)
      expect(result.hasEnoughData).toBe(false)
      expect(result.bestSlot).toBeNull()
    })

    it('returns hasEnoughData true for >= 20 workouts', () => {
      const workouts = generateWorkoutsAtHour(9, 20, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour(workouts)
      expect(result.hasEnoughData).toBe(true)
      expect(result.totalWorkouts).toBe(20)
    })
  })

  // ---------------------------------------------------------------------------
  // Time slot mapping
  // ---------------------------------------------------------------------------

  describe('getTimeSlot', () => {
    it('maps 7:00 to 06-08', () => {
      expect(getTimeSlot(new Date(2026, 2, 15, 7, 0))).toBe('06-08')
    })

    it('maps 16:30 to 16-18', () => {
      expect(getTimeSlot(new Date(2026, 2, 15, 16, 30))).toBe('16-18')
    })

    it('maps 5:00 to 06-08 (clamped)', () => {
      expect(getTimeSlot(new Date(2026, 2, 15, 5, 0))).toBe('06-08')
    })

    it('maps 23:00 to 20-22 (clamped)', () => {
      expect(getTimeSlot(new Date(2026, 2, 15, 23, 0))).toBe('20-22')
    })

    it('maps boundary 8:00 to 08-10', () => {
      expect(getTimeSlot(new Date(2026, 2, 15, 8, 0))).toBe('08-10')
    })
  })

  // ---------------------------------------------------------------------------
  // Performance analysis
  // ---------------------------------------------------------------------------

  describe('performance analysis', () => {
    it('identifies best slot when morning workouts have higher volume', () => {
      // 10 morning workouts with high volume
      const morning = generateWorkoutsAtHour(7, 10, [
        { weight_kg: 100, reps: 10, rpe: 7 },
        { weight_kg: 100, reps: 10, rpe: 7 },
      ])
      // 10 evening workouts with lower volume
      const evening = generateWorkoutsAtHour(19, 10, [
        { weight_kg: 60, reps: 8, rpe: 8 },
        { weight_kg: 60, reps: 8, rpe: 8 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      expect(result.bestSlot?.slot).toBe('06-08')
    })

    it('identifies worst slot correctly', () => {
      const morning = generateWorkoutsAtHour(7, 10, [
        { weight_kg: 100, reps: 10, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 10, [
        { weight_kg: 40, reps: 6, rpe: 9 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      expect(result.worstSlot?.slot).toBe('18-20')
    })

    it('calculates percentage difference vs average', () => {
      const morning = generateWorkoutsAtHour(7, 10, [
        { weight_kg: 100, reps: 10, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 10, [
        { weight_kg: 60, reps: 8, rpe: 8 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      expect(result.percentageDifference).toBeGreaterThan(0)
    })

    it('all workouts at same time returns percentageDifference 0', () => {
      const workouts = generateWorkoutsAtHour(9, 20, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour(workouts)
      expect(result.percentageDifference).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Confidence
  // ---------------------------------------------------------------------------

  describe('confidence', () => {
    it('slot with < 3 workouts is not confident', () => {
      // 18 workouts morning, 2 evening — evening slot should not be best/worst with confidence
      const morning = generateWorkoutsAtHour(7, 18, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 2, [
        { weight_kg: 120, reps: 10, rpe: 6 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      // The evening slot has < 3 workouts, so it should be excluded from best/worst
      const eveningSlot = result.allSlots.find(s => s.slot === '18-20')
      expect(eveningSlot?.workoutCount).toBe(2)
      // bestSlot should be morning since evening is not confident enough
      expect(result.bestSlot?.slot).toBe('06-08')
    })

    it('confidence is low at 20 workouts', () => {
      const workouts = generateWorkoutsAtHour(9, 20, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour(workouts)
      expect(result.confidence).toBe('low')
    })

    it('confidence is medium at 40 workouts', () => {
      const morning = generateWorkoutsAtHour(7, 20, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 20, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      expect(result.confidence).toBe('medium')
    })

    it('confidence is high at 60+ workouts', () => {
      const morning = generateWorkoutsAtHour(7, 30, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 30, [
        { weight_kg: 80, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      expect(result.confidence).toBe('high')
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles workouts with no RPE data', () => {
      const workouts = generateWorkoutsAtHour(9, 20, [
        { weight_kg: 80, reps: 8, rpe: null },
      ])
      const result = analyzeOptimalHour(workouts)
      expect(result.hasEnoughData).toBe(true)
      // Should still compute based on volume only
      expect(result.bestSlot).not.toBeNull()
    })

    it('handles empty workout array', () => {
      const result = analyzeOptimalHour([])
      expect(result.hasEnoughData).toBe(false)
      expect(result.totalWorkouts).toBe(0)
      expect(result.bestSlot).toBeNull()
      expect(result.allSlots).toEqual([])
    })

    it('handles workouts with no sets', () => {
      const workouts = Array.from({ length: 20 }, (_, i) => {
        const date = new Date(2026, 2, 1 + i, 9, 0)
        return createWorkout({
          created_at: date.toISOString(),
          workout_sets: [],
          totalVolume: 0,
          exerciseNames: [],
        })
      })
      const result = analyzeOptimalHour(workouts)
      expect(result.hasEnoughData).toBe(true)
      // All slots will have 0 volume
    })
  })

  // ---------------------------------------------------------------------------
  // Score calculation
  // ---------------------------------------------------------------------------

  describe('score calculation', () => {
    it('higher volume in a slot produces higher performance score', () => {
      const morning = generateWorkoutsAtHour(7, 10, [
        { weight_kg: 100, reps: 10, rpe: 7 },
      ])
      const evening = generateWorkoutsAtHour(19, 10, [
        { weight_kg: 60, reps: 8, rpe: 7 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      const morningSlot = result.allSlots.find(s => s.slot === '06-08')
      const eveningSlot = result.allSlots.find(s => s.slot === '18-20')
      expect(morningSlot!.performanceScore).toBeGreaterThan(eveningSlot!.performanceScore)
    })

    it('lower RPE at same volume produces higher score', () => {
      const morning = generateWorkoutsAtHour(7, 10, [
        { weight_kg: 80, reps: 10, rpe: 6 },
      ])
      const evening = generateWorkoutsAtHour(19, 10, [
        { weight_kg: 80, reps: 10, rpe: 9 },
      ])
      const result = analyzeOptimalHour([...morning, ...evening])
      const morningSlot = result.allSlots.find(s => s.slot === '06-08')
      const eveningSlot = result.allSlots.find(s => s.slot === '18-20')
      expect(morningSlot!.performanceScore).toBeGreaterThan(eveningSlot!.performanceScore)
    })
  })

  // ---------------------------------------------------------------------------
  // computeWorkoutScore
  // ---------------------------------------------------------------------------

  describe('computeWorkoutScore', () => {
    it('computes volume as sum of weight * reps', () => {
      const w = workoutAt(9, 0, [
        { weight_kg: 80, reps: 10, rpe: 7 },
        { weight_kg: 60, reps: 12, rpe: 8 },
      ])
      const score = computeWorkoutScore(w)
      expect(score.volume).toBe(80 * 10 + 60 * 12)
    })

    it('computes avgRpe from sets with RPE', () => {
      const w = workoutAt(9, 0, [
        { weight_kg: 80, reps: 10, rpe: 7 },
        { weight_kg: 60, reps: 12, rpe: 9 },
      ])
      const score = computeWorkoutScore(w)
      expect(score.avgRpe).toBe(8)
    })

    it('returns null avgRpe when no RPE data', () => {
      const w = workoutAt(9, 0, [
        { weight_kg: 80, reps: 10, rpe: null },
      ])
      const score = computeWorkoutScore(w)
      expect(score.avgRpe).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  describe('formatSlotLabel', () => {
    it('returns "16:00 - 18:00" for nl', () => {
      expect(formatSlotLabel('16-18', 'nl')).toBe('16:00 - 18:00')
    })

    it('returns "4:00 PM - 6:00 PM" for en', () => {
      expect(formatSlotLabel('16-18', 'en')).toBe('4:00 PM - 6:00 PM')
    })

    it('returns "6:00 AM - 8:00 AM" for en morning slot', () => {
      expect(formatSlotLabel('06-08', 'en')).toBe('6:00 AM - 8:00 AM')
    })

    it('returns "06:00 - 08:00" for nl morning slot', () => {
      expect(formatSlotLabel('06-08', 'nl')).toBe('06:00 - 08:00')
    })
  })
})
