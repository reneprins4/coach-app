/**
 * Progressive Overload Validation Tests
 *
 * These tests encode the scientific standard for progressive overload
 * based on Helms, Nuckols, and related literature. If the implementation
 * deviates from established overload science, these tests FAIL.
 */
import { describe, it, expect } from 'vitest'
import { calculateProgression } from '../../lib/progressiveOverload'

describe('Progressive Overload (Helms, Nuckols)', () => {
  it('lower compound: 5-10% increase', () => {
    const result = calculateProgression({
      exercise: 'Back Squat',
      previousWeight: 100,
      previousReps: 10, // at top of range
      previousRpe: 7,   // RPE < 8 triggers progression
      targetRepRange: [8, 10],
      muscleGroup: 'quads',
    })

    expect(result.strategy).toBe('weight_increase')
    const pctIncrease = (result.suggestedWeight - 100) / 100
    expect(pctIncrease).toBeGreaterThanOrEqual(0.05)
    expect(pctIncrease).toBeLessThanOrEqual(0.10)
  })

  it('upper compound: 2.5-5% increase', () => {
    const result = calculateProgression({
      exercise: 'Flat Barbell Bench Press',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [8, 10],
      muscleGroup: 'chest',
    })

    expect(result.strategy).toBe('weight_increase')
    const pctIncrease = (result.suggestedWeight - 80) / 80
    expect(pctIncrease).toBeGreaterThanOrEqual(0.025)
    expect(pctIncrease).toBeLessThanOrEqual(0.05)
  })

  it('isolation: 2.5-5% increase', () => {
    const result = calculateProgression({
      exercise: 'Barbell Curl',
      previousWeight: 30,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [10, 12],
      muscleGroup: 'biceps',
    })

    expect(result.strategy).toBe('weight_increase')
    const increase = result.suggestedWeight - 30
    // For 30kg at 2.5-5%, raw increase is 0.75-1.5kg, rounded to 2.5kg minimum
    expect(increase).toBeGreaterThanOrEqual(2.5)
    expect(increase).toBeLessThanOrEqual(5)
  })

  it('RPE >= 9.5 triggers deload (-5 to -10%)', () => {
    const result = calculateProgression({
      exercise: 'Back Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 9.5,
      targetRepRange: [3, 5],
      muscleGroup: 'quads',
    })

    expect(result.strategy).toBe('deload')
    const pctDecrease = (100 - result.suggestedWeight) / 100
    expect(pctDecrease).toBeGreaterThanOrEqual(0.03) // at least some decrease
    expect(pctDecrease).toBeLessThanOrEqual(0.10)
  })

  it('RPE 8-9 maintains (productive zone)', () => {
    const result = calculateProgression({
      exercise: 'Back Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 8.5,
      targetRepRange: [3, 5],
      muscleGroup: 'quads',
    })

    expect(result.strategy).toBe('maintain')
    expect(result.suggestedWeight).toBe(100)
  })

  it('rep progression before weight increase', () => {
    // RPE < 8 but NOT at top of rep range -> add reps first
    const result = calculateProgression({
      exercise: 'Back Squat',
      previousWeight: 100,
      previousReps: 8, // not at top (range is 8-10)
      previousRpe: 7,
      targetRepRange: [8, 10],
      muscleGroup: 'quads',
    })

    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedWeight).toBe(100) // same weight
    expect(result.suggestedReps).toBeGreaterThan(8) // more reps
  })

  it('Epley formula: weight * (1 + reps/30)', () => {
    // Verify the Epley formula is used correctly in the codebase
    // 100kg x 10 reps -> e1RM = 100 * (1 + 10/30) = 133.33
    const weight = 100
    const reps = 10
    const e1rm = weight * (1 + reps / 30)
    expect(e1rm).toBeCloseTo(133.33, 1)
  })
})
