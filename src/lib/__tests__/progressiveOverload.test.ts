/**
 * Tests for percentage-based progressive overload system.
 *
 * Strategy tiers:
 *   - Lower body compounds: 5-7.5% weight increase
 *   - Upper body compounds: 2.5-5% weight increase
 *   - Isolation exercises:  2.5-5% weight increase
 *
 * RPE-driven decisions:
 *   - RPE < 8 + not at top of rep range  -> rep progression first
 *   - RPE < 8 + at top of rep range      -> weight increase + reset reps
 *   - RPE 8-9                             -> maintain
 *   - RPE 9.5+                            -> deload (-5%)
 *   - No history                          -> estimate from bodyweight
 *
 * All weights rounded to nearest 2.5 kg.
 */
import { describe, it, expect } from 'vitest'
import { calculateProgression } from '../progressiveOverload'

describe('Percentage-Based Progressive Overload', () => {
  // ---- Weight increase tiers ----

  it('lower body compound: 100kg deadlift @RPE 7 at top of range -> suggests 105-107.5kg', () => {
    const result = calculateProgression({
      exercise: 'Deadlift',
      previousWeight: 100,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'hamstrings',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedWeight).toBeGreaterThanOrEqual(105)
    expect(result.suggestedWeight).toBeLessThanOrEqual(107.5)
  })

  it('upper body compound: 60kg bench @RPE 7 at top of range -> suggests 62.5-63kg', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 60,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedWeight).toBeGreaterThanOrEqual(62.5)
    // 5% of 60 = 3 -> 63, rounded to 2.5 = 62.5
    expect(result.suggestedWeight).toBeLessThanOrEqual(62.5)
  })

  it('isolation: 15kg curl @RPE 7 at top of range -> minimum 2.5kg step to 17.5kg', () => {
    // At light weights the percentage increase (3.75% of 15 = 0.56kg) is smaller
    // than the minimum 2.5kg plate increment, so the floor applies: 15 + 2.5 = 17.5
    const result = calculateProgression({
      exercise: 'Bicep Curl',
      previousWeight: 15,
      previousRpe: 7,
      previousReps: 12,
      targetRepRange: [8, 12],
      muscleGroup: 'biceps',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedWeight).toBe(17.5)
  })

  // ---- Rep progression before weight ----

  it('8 reps done in 8-12 range @RPE 7.5 -> suggest rep progression, same weight', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 8,
      previousRpe: 7.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBeGreaterThan(8)
    expect(result.suggestedWeight).toBe(80)
  })

  // ---- Weight increase at top of rep range ----

  it('12 reps done in 8-12 range @RPE 7 -> weight increase + reset to bottom', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedWeight).toBeGreaterThan(80)
    expect(result.suggestedReps).toBe(8) // Reset to bottom of range
  })

  // ---- Maintain ----

  it('RPE 8.5 -> maintain current weight and reps', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 8.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('maintain')
    expect(result.suggestedWeight).toBe(80)
    expect(result.suggestedReps).toBe(10)
  })

  // ---- Deload ----

  it('RPE 9.5+ -> reduce weight by ~5%', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 9.5,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('deload')
    expect(result.suggestedWeight).toBeLessThan(100)
    expect(result.suggestedWeight).toBeGreaterThanOrEqual(92.5)
  })

  // ---- Rounding ----

  it('all suggested weights are rounded to nearest 2.5kg', () => {
    const result = calculateProgression({
      exercise: 'Deadlift',
      previousWeight: 97.5,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'hamstrings',
    })
    expect(result.suggestedWeight % 2.5).toBe(0)
  })

  // ---- No history ----

  it('no previous data -> estimate strategy', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('estimate')
    expect(result.suggestedWeight).toBeGreaterThan(0)
    expect(result.suggestedWeight % 2.5).toBe(0)
  })

  // ---- Edge cases ----

  it('RPE exactly 8 -> maintain', () => {
    const result = calculateProgression({
      exercise: 'Barbell Row',
      previousWeight: 70,
      previousReps: 8,
      previousRpe: 8,
      targetRepRange: [6, 10],
      muscleGroup: 'back',
    })
    expect(result.strategy).toBe('maintain')
    expect(result.suggestedWeight).toBe(70)
  })

  it('RPE exactly 9 -> maintain (boundary)', () => {
    const result = calculateProgression({
      exercise: 'Barbell Row',
      previousWeight: 70,
      previousReps: 8,
      previousRpe: 9,
      targetRepRange: [6, 10],
      muscleGroup: 'back',
    })
    expect(result.strategy).toBe('maintain')
    expect(result.suggestedWeight).toBe(70)
  })

  it('RPE 10 -> deload', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 120,
      previousReps: 3,
      previousRpe: 10,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('deload')
    expect(result.suggestedWeight).toBeLessThan(120)
  })

  it('result always includes a reason string', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(typeof result.reason).toBe('string')
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it('rep progression suggests reps within the target range', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 9,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBeGreaterThan(9)
    expect(result.suggestedReps).toBeLessThanOrEqual(12)
  })

  it('very light isolation still gets minimum 2.5kg increase when progressing', () => {
    const result = calculateProgression({
      exercise: 'Lateral Raise',
      previousWeight: 5,
      previousReps: 15,
      previousRpe: 6,
      targetRepRange: [10, 15],
      muscleGroup: 'shoulders',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedWeight).toBeGreaterThanOrEqual(5)
    // 2.5% of 5 = 0.125, but should round up to at least 2.5 increment
    expect(result.suggestedWeight % 2.5).toBe(0)
  })
})
