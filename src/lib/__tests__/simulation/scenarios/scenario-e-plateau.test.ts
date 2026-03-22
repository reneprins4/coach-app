/**
 * Scenario E — Real Plateau Detection (True Positive Test)
 *
 * Profile: Sofia, 29 year old, intermediate, 3x/week
 * Simulated: 50 workouts where bench press is stuck at 50kg for 8 weeks
 *
 * Validates:
 * - Plateau detected after week 6-8 on bench press
 * - No plateau on exercises that show progression
 * - Plateau status is 'plateau' not 'slowing'
 */

import { describe, it, expect } from 'vitest'
import {
  generatePlateau,
} from '../workoutGenerator'
import { detectPlateaus } from '../../../plateauDetector'
import type { Workout } from '../../../../types'

// ---------------------------------------------------------------------------
// Data setup
// ---------------------------------------------------------------------------

function generateSofiaWorkouts(): Workout[] {
  // Sofia trains 3x/week for ~17 weeks (50 workouts)
  // Bench press stuck at 50kg for 8 weeks
  // Other exercises progress normally
  return generatePlateau({
    exercise: 'Flat Barbell Bench Press',
    weeks: 8,
    weight: 50,
    reps: 8,
    sessionsPerWeek: 3,
    otherExercises: [
      { name: 'Back Squat', weight: 60 },
      { name: 'Barbell Row', weight: 40 },
    ],
    split: 'Full Body',
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario E: Real plateau detection', () => {
  const workouts = generateSofiaWorkouts()

  it('generates workouts with flat bench press weight', () => {
    expect(workouts.length).toBe(24) // 8 weeks * 3 sessions

    // Verify all bench press sets are at exactly 50kg
    for (const w of workouts) {
      const benchSets = w.workout_sets.filter(s =>
        s.exercise === 'Flat Barbell Bench Press'
      )
      for (const s of benchSets) {
        expect(s.weight_kg).toBe(50)
        expect(s.reps).toBe(8)
      }
    }
  })

  it('plateau detected on bench press after 6-8 weeks at same weight', () => {
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p =>
      /bench/i.test(p.exercise)
    )

    expect(benchPlateau).toBeDefined()
    expect(benchPlateau!.weeksOfData).toBeGreaterThanOrEqual(3) // minimum data needed
  })

  it('plateau status is "plateau" not "slowing"', () => {
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p =>
      /bench/i.test(p.exercise)
    )

    expect(benchPlateau).toBeDefined()
    // With exactly the same weight for 8 weeks, the relative slope should be
    // essentially 0, which means isStagnant = true and status = 'plateau'
    expect(benchPlateau!.status).toBe('plateau')
  })

  it('plateau recommendation is specific (mentions incline or variation)', () => {
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p =>
      /bench/i.test(p.exercise)
    )

    expect(benchPlateau).toBeDefined()
    expect(benchPlateau!.recommendation).toBeTruthy()
    expect(benchPlateau!.recommendation.length).toBeGreaterThan(10)
    // For a bench press plateau, the recommendation should suggest incline or dumbbell
    expect(
      /incline|dumbbell|wissel|variatie|paused/i.test(benchPlateau!.recommendation)
    ).toBe(true)
  })

  it('no plateau on exercises that show progression (squat, row)', () => {
    const plateaus = detectPlateaus(workouts)

    const squatPlateau = plateaus.find(p =>
      /squat/i.test(p.exercise)
    )
    const rowPlateau = plateaus.find(p =>
      /row/i.test(p.exercise)
    )

    // Squat and Row both have 2% weekly increase via otherExercises config
    // They should not be flagged as plateau
    expect(squatPlateau).toBeUndefined()
    expect(rowPlateau).toBeUndefined()
  })

  it('plateau weeklyGrowthPct is near zero for stagnant exercise', () => {
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p =>
      /bench/i.test(p.exercise)
    )

    expect(benchPlateau).toBeDefined()
    const growthPct = parseFloat(benchPlateau!.weeklyGrowthPct)
    // For a true plateau (same weight every week), growth should be <0.5%
    expect(Math.abs(growthPct)).toBeLessThan(0.5)
  })

  it('plateau weeklyData shows flat line', () => {
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p =>
      /bench/i.test(p.exercise)
    )

    expect(benchPlateau).toBeDefined()
    expect(benchPlateau!.weeklyData.length).toBeGreaterThanOrEqual(3)

    // All e1RM values should be nearly identical (same weight, same reps)
    const e1rmValues = benchPlateau!.weeklyData.map(d => d.e1rm)
    const minE1rm = Math.min(...e1rmValues)
    const maxE1rm = Math.max(...e1rmValues)

    // With 50kg x 8 reps, e1RM = 50 * (1 + 8/30) = 63.3
    // All values should be the same since weight and reps never change
    expect(maxE1rm - minE1rm).toBeLessThan(1) // less than 1kg difference
  })

  it('only stagnant exercises appear in plateau results', () => {
    // Generate a mixed dataset: bench stuck, everything else progressing
    const mixedWorkouts = generatePlateau({
      exercise: 'Flat Barbell Bench Press',
      weeks: 8,
      weight: 50,
      reps: 8,
      sessionsPerWeek: 3,
      otherExercises: [
        { name: 'Back Squat', weight: 60 },
        { name: 'Barbell Row', weight: 40 },
        { name: 'Dumbbell Overhead Press', weight: 20 },
        { name: 'Romanian Deadlift', weight: 50 },
      ],
    })

    const plateaus = detectPlateaus(mixedWorkouts)

    // Only bench should be in plateau results
    for (const plateau of plateaus) {
      if (plateau.status === 'plateau') {
        expect(/bench/i.test(plateau.exercise)).toBe(true)
      }
    }
  })
})
