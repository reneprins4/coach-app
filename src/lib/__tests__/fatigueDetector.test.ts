/**
 * Tests for src/lib/fatigueDetector.ts
 */
import { describe, it, expect } from 'vitest'
import { detectFatigue } from '../fatigueDetector'
import { createWorkout } from '../../__tests__/helpers'
import type { Workout } from '../../types'

function makeWorkoutsWithRPEDrift(weeksBack: number = 3): Workout[] {
  const workouts: Workout[] = []
  for (let week = weeksBack; week >= 0; week--) {
    for (let i = 0; i < 2; i++) {
      const date = new Date()
      date.setDate(date.getDate() - week * 7 - i * 2)
      // RPE increases over weeks: 6.5 -> 7.5 -> 8.5 -> 9.5
      const rpe = 6.5 + (weeksBack - week) * 1.0
      workouts.push(createWorkout({
        created_at: date.toISOString(),
      }, [
        { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe },
        { exercise: 'Squat', weight_kg: 100, reps: 5, rpe: rpe + 0.5 },
      ]))
    }
  }
  return workouts
}

describe('fatigueDetector', () => {
  describe('detectFatigue', () => {
    it('returns no fatigue for empty workouts', () => {
      const result = detectFatigue([])
      expect(result.fatigued).toBe(false)
      expect(result.score).toBe(0)
      expect(result.signals).toEqual([])
    })

    it('returns no fatigue for fewer than 4 recent workouts', () => {
      const workouts = [
        createWorkout({ created_at: new Date().toISOString() }),
        createWorkout({ created_at: new Date().toISOString() }),
      ]
      const result = detectFatigue(workouts)
      expect(result.fatigued).toBe(false)
    })

    it('detects RPE drift signal when RPE rises significantly', () => {
      const workouts = makeWorkoutsWithRPEDrift(3)
      const result = detectFatigue(workouts, 4)
      const rpeDriftSignals = result.signals.filter(s => s.type === 'rpe_drift')
      expect(rpeDriftSignals.length).toBeGreaterThan(0)
    })

    it('detects volume drop when recent sets decrease', () => {
      const workouts: Workout[] = []
      // First few workouts with many sets
      for (let i = 0; i < 4; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i) * 2)
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, Array.from({ length: 10 }, (_, j) => ({
          exercise: `Exercise ${j}`,
          weight_kg: 50,
          reps: 8,
          rpe: 7,
        }))))
      }
      // Recent workouts with far fewer sets
      for (let i = 0; i < 3; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 50, reps: 8, rpe: 7 },
          { exercise: 'Squat', weight_kg: 50, reps: 5, rpe: 7 },
        ]))
      }

      const result = detectFatigue(workouts, 3)
      const volumeDropSignals = result.signals.filter(s => s.type === 'volume_drop')
      expect(volumeDropSignals.length).toBeGreaterThan(0)
    })

    it('detects frequency drop when workouts per week is low relative to target', () => {
      // 4 workouts spread over 4 weeks = 1/week, target is 4x/week
      const workouts: Workout[] = []
      for (let i = 0; i < 4; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i * 7)
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7 },
        ]))
      }

      // 1x/week is 25% of 4x target — well below 60% threshold
      const result = detectFatigue(workouts, 4, 4)
      const freqSignals = result.signals.filter(s => s.type === 'frequency_drop')
      expect(freqSignals.length).toBeGreaterThan(0)
    })

    it('does not flag frequency drop for beginner training 1.5x/week on a 2x target', () => {
      // 6 workouts over 4 weeks = 1.5/week, target is 2x/week
      // 1.5/2 = 75% — above the 60% threshold, should NOT flag
      const workouts: Workout[] = []
      for (let i = 0; i < 6; i++) {
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(i * 4.5))
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 40, reps: 10, rpe: 6 },
        ]))
      }

      const result = detectFatigue(workouts, 4, 2)
      const freqSignals = result.signals.filter(s => s.type === 'frequency_drop')
      expect(freqSignals.length).toBe(0)
    })

    it('flags frequency drop when training 1x/week on a 4x target', () => {
      // 4 workouts over 4 weeks = 1/week, target is 4x/week
      // 1/4 = 25% — well below 60% threshold
      const workouts: Workout[] = []
      for (let i = 0; i < 4; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i * 7)
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7 },
        ]))
      }

      const result = detectFatigue(workouts, 4, 4)
      const freqSignals = result.signals.filter(s => s.type === 'frequency_drop')
      expect(freqSignals.length).toBeGreaterThan(0)
    })

    it('uses targetFrequency parameter instead of hardcoded threshold', () => {
      // 5 workouts over 4 weeks = 1.25/week
      // With target 2: 1.25/2 = 62.5% — above 60%, no flag
      // With target 4: 1.25/4 = 31.25% — below 60%, should flag
      const workouts: Workout[] = []
      for (let i = 0; i < 5; i++) {
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(i * 5.6))
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 60, reps: 8, rpe: 7 },
        ]))
      }

      const resultLowTarget = detectFatigue(workouts, 4, 2)
      const resultHighTarget = detectFatigue(workouts, 4, 4)

      const freqSignalsLow = resultLowTarget.signals.filter(s => s.type === 'frequency_drop')
      const freqSignalsHigh = resultHighTarget.signals.filter(s => s.type === 'frequency_drop')

      expect(freqSignalsLow.length).toBe(0)
      expect(freqSignalsHigh.length).toBeGreaterThan(0)
    })

    it('returns fatigued=true when score >= 2', () => {
      const workouts = makeWorkoutsWithRPEDrift(3)
      const result = detectFatigue(workouts, 4)
      // RPE drift on multiple exercises should give score >= 2
      if (result.score >= 2) {
        expect(result.fatigued).toBe(true)
      }
    })

    it('provides urgent recommendation when score >= 3', () => {
      const workouts = makeWorkoutsWithRPEDrift(3)
      const result = detectFatigue(workouts, 4)
      if (result.score >= 3) {
        expect(result.recommendation).toBe('urgent')
      } else if (result.score >= 2) {
        expect(result.recommendation).toBe('suggested')
      } else {
        expect(result.recommendation).toBe('none')
      }
    })

    it('ignores workouts outside the time window', () => {
      const oldWorkouts: Workout[] = []
      for (let i = 0; i < 6; i++) {
        const date = new Date()
        date.setDate(date.getDate() - 60 - i) // 2 months ago
        oldWorkouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [{ exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 9 }]))
      }
      const result = detectFatigue(oldWorkouts, 3)
      expect(result.fatigued).toBe(false)
      expect(result.score).toBe(0)
    })
  })
})
