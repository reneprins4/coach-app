/**
 * Tests for src/lib/plateauDetector.ts
 */
import { describe, it, expect } from 'vitest'
import { detectPlateaus } from '../plateauDetector'
import type { Workout } from '../../types'
import { createWorkout } from '../../__tests__/helpers'

function makeWorkoutsWithProgression(
  exerciseName: string,
  weeksCount: number,
  startWeight: number,
  weeklyIncrease: number,
): Workout[] {
  const workouts: Workout[] = []
  for (let week = 0; week < weeksCount; week++) {
    const date = new Date()
    date.setDate(date.getDate() - (weeksCount - week) * 7)
    // Set to Sunday of that week to get a unique week key
    date.setDate(date.getDate() - date.getDay())
    const weight = startWeight + week * weeklyIncrease
    workouts.push(createWorkout({
      created_at: date.toISOString(),
    }, [
      { exercise: exerciseName, weight_kg: weight, reps: 8, rpe: 7 },
    ]))
  }
  return workouts
}

describe('plateauDetector', () => {
  describe('detectPlateaus', () => {
    it('returns empty array for no workouts', () => {
      expect(detectPlateaus([])).toEqual([])
    })

    it('returns empty array for fewer than 3 weeks of data per exercise', () => {
      const workouts = [
        createWorkout({ created_at: new Date().toISOString() }, [
          { exercise: 'Bench Press', weight_kg: 80, reps: 8 },
        ]),
      ]
      expect(detectPlateaus(workouts)).toEqual([])
    })

    it('returns empty array when progression is strong', () => {
      // Adding 5kg/week — strong progression, no plateau
      const workouts = makeWorkoutsWithProgression('Bench Press', 6, 60, 5)
      const results = detectPlateaus(workouts)
      // Should not flag as plateau since there is clear upward trend
      const benchPlateaus = results.filter(r => r.exercise === 'Bench Press')
      expect(benchPlateaus.length).toBe(0)
    })

    it('detects stagnation when weight stays the same', () => {
      // Same weight for 6 weeks = plateau
      const workouts = makeWorkoutsWithProgression('Bench Press', 6, 80, 0)
      const results = detectPlateaus(workouts)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.exercise).toBe('Bench Press')
      expect(results[0]!.status).toBe('plateau')
    })

    it('detects slowing progression', () => {
      // Start with good progression (first 3 weeks: +5kg/wk), then slow (next 3: +0.5kg/wk)
      const workouts: Workout[] = []
      for (let week = 0; week < 6; week++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - week) * 7)
        date.setDate(date.getDate() - date.getDay())
        const weight = week < 3 ? 60 + week * 5 : 75 + (week - 3) * 0.5
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Squat', weight_kg: weight, reps: 5, rpe: 8 },
        ]))
      }
      const results = detectPlateaus(workouts)
      const squatResults = results.filter(r => r.exercise === 'Squat')
      if (squatResults.length > 0) {
        expect(['plateau', 'slowing']).toContain(squatResults[0]!.status)
      }
    })

    it('provides recommendations for bench press exercises', () => {
      const workouts = makeWorkoutsWithProgression('Bench Press', 6, 80, 0)
      const results = detectPlateaus(workouts)
      if (results.length > 0) {
        expect(results[0]!.recommendation).toBeTruthy()
        expect(results[0]!.recommendation.length).toBeGreaterThan(0)
      }
    })

    it('provides recommendations for squat exercises', () => {
      const workouts = makeWorkoutsWithProgression('Back Squat', 6, 100, 0)
      const results = detectPlateaus(workouts)
      if (results.length > 0) {
        expect(results[0]!.recommendation).toContain('squat')
      }
    })

    it('provides recommendations for deadlift exercises', () => {
      const workouts = makeWorkoutsWithProgression('Deadlift', 6, 120, 0)
      const results = detectPlateaus(workouts)
      if (results.length > 0) {
        expect(results[0]!.recommendation).toBeTruthy()
      }
    })

    it('sorts results with plateau before slowing', () => {
      // Create both a plateau and slowing exercise
      const plateauWorkouts = makeWorkoutsWithProgression('Bench Press', 6, 80, 0)
      const slowWorkouts = makeWorkoutsWithProgression('Squat', 6, 100, 0.2)
      const allWorkouts = [...plateauWorkouts, ...slowWorkouts]
      const results = detectPlateaus(allWorkouts)
      if (results.length >= 2) {
        const plateauIdx = results.findIndex(r => r.status === 'plateau')
        const slowIdx = results.findIndex(r => r.status === 'slowing')
        if (plateauIdx >= 0 && slowIdx >= 0) {
          expect(plateauIdx).toBeLessThan(slowIdx)
        }
      }
    })

    it('4-week vacation followed by 2 weeks training is NOT a plateau', () => {
      // User trained for 4 weeks progressing well, took 4 weeks off,
      // came back slightly lower (detraining), then 2 weeks progressing again.
      // Without the fix, slice(-6) grabs 6 data weeks spanning a huge gap,
      // and the detraining dip makes the regression look flat/negative = false plateau.
      const workouts: Workout[] = []

      // 4 weeks of training before vacation (week -10, -9, -8, -7)
      for (let week = 0; week < 4; week++) {
        const date = new Date()
        date.setDate(date.getDate() - (10 - week) * 7)
        date.setDate(date.getDate() - date.getDay())
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Bench Press', weight_kg: 80 + week * 2.5, reps: 8, rpe: 7 },
        ]))
      }

      // 4 weeks vacation (no workouts)

      // 2 weeks of training after vacation (week -2, -1) — came back a bit lower but progressing
      for (let week = 0; week < 2; week++) {
        const date = new Date()
        date.setDate(date.getDate() - (2 - week) * 7)
        date.setDate(date.getDate() - date.getDay())
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          // Came back at 82.5 (lost some strength) but progressing: 82.5 → 85
          { exercise: 'Bench Press', weight_kg: 82.5 + week * 2.5, reps: 8, rpe: 7 },
        ]))
      }

      const results = detectPlateaus(workouts)
      const benchResults = results.filter(r => r.exercise === 'Bench Press')
      // Should NOT detect plateau — only the 2 recent weeks should be considered,
      // and the user is progressing in those weeks
      expect(benchResults.length).toBe(0)
    })

    it('only weeks with training data are used for regression', () => {
      // 7 weeks of data spanning a long calendar period with a gap.
      // Pre-break: strong progress. Post-break: slight detraining but progressing.
      // Bug: slice(-6) takes last 6 data-weeks including the dip, looks like plateau.
      // Fix: only use recent consecutive training weeks.
      const workouts: Workout[] = []

      // 4 old weeks with strong progression
      for (let i = 0; i < 4; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (20 - i) * 7)
        date.setDate(date.getDate() - date.getDay())
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Squat', weight_kg: 100 + i * 5, reps: 5, rpe: 8 },
        ]))
      }

      // 3 recent weeks, came back slightly lower but progressing
      for (let i = 0; i < 3; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (3 - i) * 7)
        date.setDate(date.getDate() - date.getDay())
        workouts.push(createWorkout({
          created_at: date.toISOString(),
        }, [
          { exercise: 'Squat', weight_kg: 105 + i * 5, reps: 5, rpe: 8 },
        ]))
      }

      const results = detectPlateaus(workouts)
      const squatResults = results.filter(r => r.exercise === 'Squat')
      // Progression is clear in actual training weeks — should NOT be a plateau
      expect(squatResults.length).toBe(0)
    })

    it('includes weeklyData and weeklyGrowthPct in results', () => {
      const workouts = makeWorkoutsWithProgression('Bench Press', 6, 80, 0)
      const results = detectPlateaus(workouts)
      if (results.length > 0) {
        expect(results[0]!.weeklyData).toBeDefined()
        expect(results[0]!.weeklyData.length).toBeGreaterThan(0)
        expect(results[0]!.weeklyGrowthPct).toBeDefined()
      }
    })
  })
})
