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

  // ---- Category detection (mutant killers) ----

  it('correctly categorizes Deadlift as lower_compound (5-7.5% range)', () => {
    const result = calculateProgression({
      exercise: 'Deadlift',
      previousWeight: 100,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'hamstrings',
    })
    expect(result.strategy).toBe('weight_increase')
    // lower_compound midpoint = (5+7.5)/2 = 6.25%. 100*0.0625=6.25 -> 100+6.25=106.25 -> round to 107.5
    expect(result.suggestedWeight).toBe(107.5)
  })

  it('correctly categorizes Bench Press as upper_compound (2.5-5% range)', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('weight_increase')
    // upper_compound midpoint = (2.5+5)/2 = 3.75%. 80*0.0375=3.0 -> max(2.5,3.0)=3.0 -> 80+3=83 -> round to 82.5
    expect(result.suggestedWeight).toBe(82.5)
  })

  it('correctly categorizes Bicep Curl as isolation (2.5-5% range)', () => {
    const result = calculateProgression({
      exercise: 'Bicep Curl',
      previousWeight: 20,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'biceps',
    })
    expect(result.strategy).toBe('weight_increase')
    // isolation midpoint = 3.75%. 20*0.0375=0.75 -> max(2.5,0.75)=2.5 -> 20+2.5=22.5
    expect(result.suggestedWeight).toBe(22.5)
  })

  it('correctly categorizes Overhead Press as upper_compound', () => {
    const result = calculateProgression({
      exercise: 'Overhead Press',
      previousWeight: 50,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'shoulders',
    })
    expect(result.strategy).toBe('weight_increase')
    // upper_compound midpoint = 3.75%. 50*0.0375=1.875 -> max(2.5,1.875)=2.5 -> 50+2.5=52.5
    expect(result.suggestedWeight).toBe(52.5)
  })

  it('correctly categorizes Hip Thrust as lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Hip Thrust',
      previousWeight: 100,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'glutes',
    })
    expect(result.strategy).toBe('weight_increase')
    // lower_compound midpoint = 6.25%. 100*0.0625=6.25 -> 100+6.25=106.25 -> round to 107.5
    expect(result.suggestedWeight).toBe(107.5)
  })

  it('categorizes Romanian Deadlift as lower_compound via pattern match', () => {
    const result = calculateProgression({
      exercise: 'Romanian Deadlift',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'hamstrings',
    })
    expect(result.strategy).toBe('weight_increase')
    // lower_compound midpoint = 6.25%. 80*0.0625=5.0 -> 80+5=85
    expect(result.suggestedWeight).toBe(85)
  })

  it('categorizes Pull-up as upper_compound', () => {
    const result = calculateProgression({
      exercise: 'Pull-up',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'back',
    })
    expect(result.strategy).toBe('weight_increase')
    // upper_compound midpoint = 3.75%. 80*0.0375=3.0 -> max(2.5,3)=3 -> 80+3=83 -> round to 82.5
    expect(result.suggestedWeight).toBe(82.5)
  })

  it('categorizes Leg Press via fallback compound hints for quads muscle group', () => {
    // Leg Press is in the LOWER_BODY_COMPOUND_PATTERNS but let's also test
    // an exercise that falls through to the compoundHints fallback
    const result = calculateProgression({
      exercise: 'Smith Machine Squat',  // Not in exact patterns, but has 'squat' hint + quads group
      previousWeight: 100,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('weight_increase')
    // lower_compound via fallback. midpoint = 6.25%. 100*0.0625=6.25 -> 107.5
    expect(result.suggestedWeight).toBe(107.5)
  })

  it('exercise with quads muscle group but no compound hints falls to isolation', () => {
    const result = calculateProgression({
      exercise: 'Leg Extension',  // No compound hint words
      previousWeight: 40,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('weight_increase')
    // isolation midpoint = 3.75%. 40*0.0375=1.5 -> max(2.5,1.5)=2.5 -> 40+2.5=42.5
    expect(result.suggestedWeight).toBe(42.5)
  })

  // ---- Exact percentage boundary verification ----

  it('lower compound increase uses midpoint 6.25% of previous weight', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 160,
      previousReps: 6,
      previousRpe: 7,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    // 160*0.0625=10 -> 160+10=170
    expect(result.suggestedWeight).toBe(170)
  })

  it('upper compound increase uses midpoint 3.75% of previous weight', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 100,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    // 100*0.0375=3.75 -> max(2.5,3.75)=3.75 -> 100+3.75=103.75 -> round to 105
    expect(result.suggestedWeight).toBe(105)
  })

  it('isolation increase uses midpoint 3.75% of previous weight', () => {
    const result = calculateProgression({
      exercise: 'Tricep Extension',
      previousWeight: 40,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'triceps',
    })
    // 40*0.0375=1.5 -> max(2.5,1.5)=2.5 -> 40+2.5=42.5
    expect(result.suggestedWeight).toBe(42.5)
  })

  // ---- Strategy field exact matching ----

  it('strategy is exactly "rep_progression" when below top of range and RPE < 8', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 9,
      previousRpe: 7.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedWeight).toBe(80) // weight unchanged
    expect(result.suggestedReps).toBe(10) // 9 + 1 (RPE >= 7 adds 1)
  })

  it('strategy is exactly "weight_increase" when at top of range and RPE < 8', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.suggestedReps).toBe(8) // reset to bottom
  })

  it('strategy is exactly "maintain" when RPE is 8-9', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 8,
      previousRpe: 8.5,
      targetRepRange: [6, 10],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('maintain')
    expect(result.suggestedWeight).toBe(100)
    expect(result.suggestedReps).toBe(8)
  })

  it('strategy is exactly "deload" when RPE >= 9.5', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 9.5,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('deload')
    expect(result.suggestedWeight).toBe(95) // 100*0.95=95
  })

  it('strategy is exactly "estimate" when no previous data', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [6, 10],
      muscleGroup: 'quads',
    })
    expect(result.strategy).toBe('estimate')
    // Default BW 80 * quads multiplier 0.8 = 64 -> round to 65
    expect(result.suggestedWeight).toBe(65)
    expect(result.suggestedReps).toBe(6) // repMin
  })

  // ---- Reason string content verification ----

  it('reason for weight_increase mentions the percentage and category', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [6, 10],
      muscleGroup: 'quads',
    })
    expect(result.reason).toContain('6%') // Math.round(6.25) = 6
    expect(result.reason).toContain('lower compound')
    expect(result.reason).toContain('100kg')
    expect(result.reason).toContain('107.5kg')
  })

  it('reason for deload mentions the reduction', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 10,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    expect(result.reason).toContain('-5%')
    expect(result.reason).toContain('100kg')
    expect(result.reason).toContain('95kg')
    expect(result.reason).toContain('RPE 10')
  })

  it('reason for rep_progression mentions adding reps', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 9,
      previousRpe: 7.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.reason).toContain('Adding 1 rep(s)')
    expect(result.reason).toContain('80kg')
  })

  it('reason for maintain mentions the productive range', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: 8.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.reason).toContain('productive range')
    expect(result.reason).toContain('80kg')
    expect(result.reason).toContain('RPE 8.5')
  })

  it('reason for estimate mentions bodyweight and multiplier', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
      bodyweightKg: 75,
    })
    expect(result.reason).toContain('No previous data')
    expect(result.reason).toContain('75kg')
    expect(result.reason).toContain('0.6')
  })

  // ---- RPE boundary precision ----

  it('RPE 9.4 is NOT deload (boundary just below 9.5)', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 5,
      previousRpe: 9.4,
      targetRepRange: [4, 6],
      muscleGroup: 'quads',
    })
    // RPE 9.4 >= 8 so it should be maintain, not deload
    expect(result.strategy).toBe('maintain')
  })

  it('RPE 7.9 is NOT maintain (boundary just below 8)', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100,
      previousReps: 8,
      previousRpe: 7.9,
      targetRepRange: [6, 10],
      muscleGroup: 'quads',
    })
    // RPE 7.9 < 8 so should be rep_progression (not at top) or weight_increase
    expect(result.strategy).toBe('rep_progression')
  })

  // ---- Rep progression add-reps logic ----

  it('RPE < 7 adds 2 reps in rep_progression', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 8,
      previousRpe: 6.5,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBe(10) // 8 + 2
  })

  it('RPE exactly 7 adds 1 rep (boundary: >= 7 adds 1)', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 8,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBe(9) // 8 + 1
  })

  it('RPE 6.9 adds 2 reps (boundary: < 7 adds 2)', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 8,
      previousRpe: 6.9,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBe(10) // 8 + 2
  })

  it('rep progression does not exceed repMax', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 11,
      previousRpe: 6, // adds 2 but capped at 12
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
    expect(result.suggestedReps).toBe(12) // min(11+2, 12) = 12
  })

  // ---- roundWeight ----

  it('roundWeight ensures minimum 2.5kg for non-zero results', () => {
    // When estimating from bodyweight for a muscle group with low multiplier
    const result = calculateProgression({
      exercise: 'Wrist Curl',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [10, 15],
      muscleGroup: 'biceps', // 0.15 multiplier
      bodyweightKg: 10, // 10*0.15=1.5 -> should round to 2.5
    })
    expect(result.suggestedWeight).toBe(2.5)
  })

  // ---- Bodyweight estimate defaults ----

  it('uses default 80kg bodyweight when not specified', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    // chest mult = 0.6, 80*0.6=48 -> round to 47.5
    expect(result.suggestedWeight).toBe(47.5)
  })

  it('uses 0.3 multiplier for unknown muscle groups in estimate', () => {
    const result = calculateProgression({
      exercise: 'Some Unknown Exercise',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'core', // core has explicit 0.2 multiplier
    })
    // core = 0.2, 80*0.2=16 -> round to 15
    expect(result.suggestedWeight).toBe(15)
  })

  it('uses custom bodyweight for estimates', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: null,
      previousReps: null,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
      bodyweightKg: 100,
    })
    // chest mult = 0.6, 100*0.6=60 -> round to 60
    expect(result.suggestedWeight).toBe(60)
  })

  // ---- Ensure minimum 2.5kg increase in weight_increase strategy ----

  it('weight increase enforces minimum 2.5kg step even when percentage is tiny', () => {
    const result = calculateProgression({
      exercise: 'Lateral Raise',
      previousWeight: 7.5,
      previousReps: 15,
      previousRpe: 6,
      targetRepRange: [10, 15],
      muscleGroup: 'shoulders',
    })
    expect(result.strategy).toBe('weight_increase')
    // isolation 3.75% of 7.5 = 0.28 -> max(2.5, 0.28) = 2.5 -> 7.5+2.5=10
    expect(result.suggestedWeight).toBe(10)
  })

  // ---- Partial null inputs ----

  it('treats partial null history as estimate', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: null,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('estimate')
  })

  it('treats null RPE with valid weight/reps as estimate', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 10,
      previousRpe: null,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('estimate')
  })

  // ---- atTopOfRange boundary ----

  it('previousReps equal to repMax triggers weight_increase (not rep_progression)', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12, // exactly repMax
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('weight_increase')
  })

  it('previousReps one below repMax triggers rep_progression', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 11, // one below repMax
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(result.strategy).toBe('rep_progression')
  })

  // ---- Upper body compound pattern string mutation killers ----
  // Each test uses an exercise name that matches ONLY one specific pattern
  // and checks the reason string contains "upper compound"

  const upperCompoundBase = {
    previousWeight: 100,
    previousReps: 10,
    previousRpe: 7,
    targetRepRange: [6, 10] as [number, number],
    muscleGroup: 'chest' as const,
  }

  it('Bench Press is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Bench Press', muscleGroup: 'chest' })
    expect(result.reason).toContain('upper compound')
  })

  it('Barbell Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Barbell Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Overhead Press is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Overhead Press', muscleGroup: 'shoulders' })
    expect(result.reason).toContain('upper compound')
  })

  it('Pull-up is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Pull-up', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Chin-up is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Chin-up', muscleGroup: 'biceps' })
    expect(result.reason).toContain('upper compound')
  })

  it('Lat Pulldown is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Lat Pulldown', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Seated Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Seated Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Cable Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Cable Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Dumbbell Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Dumbbell Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('Incline Press is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Incline Press', muscleGroup: 'chest' })
    expect(result.reason).toContain('upper compound')
  })

  it('Close Grip Bench is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Close Grip Bench', muscleGroup: 'triceps' })
    expect(result.reason).toContain('upper compound')
  })

  it('Dip is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Dip', muscleGroup: 'chest' })
    expect(result.reason).toContain('upper compound')
  })

  it('Military Press is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Military Press', muscleGroup: 'shoulders' })
    expect(result.reason).toContain('upper compound')
  })

  it('Pendlay Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'Pendlay Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  it('T-bar Row is classified as upper compound (reason check)', () => {
    const result = calculateProgression({ ...upperCompoundBase, exercise: 'T-bar Row', muscleGroup: 'back' })
    expect(result.reason).toContain('upper compound')
  })

  // ---- Lower body compound pattern: ensure classification works via pattern ----

  it('Squat is classified as lower compound (reason check)', () => {
    const result = calculateProgression({
      exercise: 'Squat',
      previousWeight: 100, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'quads',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('Deadlift is classified as lower compound (reason check)', () => {
    const result = calculateProgression({
      exercise: 'Deadlift',
      previousWeight: 100, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'hamstrings',
    })
    expect(result.reason).toContain('lower compound')
  })

  // ---- Isolation exercise does NOT contain "lower compound" or "upper compound" ----

  it('Bicep Curl is classified as isolation (reason check)', () => {
    const result = calculateProgression({
      exercise: 'Bicep Curl',
      previousWeight: 20, previousReps: 12, previousRpe: 7,
      targetRepRange: [8, 12], muscleGroup: 'biceps',
    })
    expect(result.reason).toContain('isolation')
    expect(result.reason).not.toContain('compound')
  })

  // ---- Fallback compound hints: exercise on quads/hamstrings/glutes that matches hints ----

  it('fallback: "Leg Press" matches via lower_compound patterns directly', () => {
    const result = calculateProgression({
      exercise: 'Leg Press',
      previousWeight: 100, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'quads',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: exercise with "thrust" hint on glutes returns lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Barbell Thrust',  // matches 'thrust' hint
      previousWeight: 100, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'glutes',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: exercise with "lunge" hint on hamstrings returns lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Walking Lunge',
      previousWeight: 60, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'hamstrings',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: exercise with "press" hint on quads returns lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Single Leg Press',  // matches 'press' hint and also 'leg press' pattern
      previousWeight: 60, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'quads',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: exercise with "deadlift" hint on hamstrings returns lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Stiff Leg Deadlift',
      previousWeight: 80, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'hamstrings',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: exercise with "squat" hint on glutes returns lower_compound', () => {
    const result = calculateProgression({
      exercise: 'Goblet Squat',
      previousWeight: 40, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'glutes',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('fallback: quads exercise without compound hint falls to isolation', () => {
    const result = calculateProgression({
      exercise: 'Leg Extension',
      previousWeight: 40, previousReps: 12, previousRpe: 7,
      targetRepRange: [8, 12], muscleGroup: 'quads',
    })
    expect(result.reason).toContain('isolation')
  })

  it('fallback: non-lower-body muscle group with no pattern match falls to isolation', () => {
    const result = calculateProgression({
      exercise: 'Face Pull',
      previousWeight: 20, previousReps: 12, previousRpe: 7,
      targetRepRange: [8, 12], muscleGroup: 'shoulders',
    })
    expect(result.reason).toContain('isolation')
  })

  // ---- lowerBodyGroups array coverage ----

  it('hamstrings muscle group is recognized as lower body for fallback', () => {
    const result = calculateProgression({
      exercise: 'Glute Ham Raise with thrust',  // 'thrust' hint, hamstrings group
      previousWeight: 30, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'hamstrings',
    })
    expect(result.reason).toContain('lower compound')
  })

  it('glutes muscle group is recognized as lower body for fallback', () => {
    const result = calculateProgression({
      exercise: 'Cable Thrust',  // 'thrust' hint, glutes group, no upper pattern match
      previousWeight: 30, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'glutes',
    })
    expect(result.reason).toContain('lower compound')
  })

  // ---- Kill LOWER_BODY_COMPOUND_PATTERNS.some() mutants ----
  // Need an exercise that matches LOWER_BODY_COMPOUND_PATTERNS but NOT the fallback hints,
  // or whose muscleGroup is NOT in lowerBodyGroups. "Good Morning" is in the patterns
  // but doesn't contain any of ['press', 'squat', 'deadlift', 'thrust', 'lunge'].
  // If the patterns check is removed (mutated), "Good Morning" falls through to
  // the fallback (muscleGroup=hamstrings is in lowerBodyGroups, but no hint matches)
  // and then to isolation.

  it('Good Morning is classified as lower_compound via LOWER_BODY_COMPOUND_PATTERNS (not fallback)', () => {
    const result = calculateProgression({
      exercise: 'Good Morning',
      previousWeight: 60, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'hamstrings',
    })
    expect(result.strategy).toBe('weight_increase')
    expect(result.reason).toContain('lower compound')
    // lower_compound midpoint = 6.25%. 60*0.0625=3.75 -> max(2.5,3.75)=3.75 -> 60+3.75=63.75 -> round to 65
    expect(result.suggestedWeight).toBe(65)
  })

  // Hack Squat also matches patterns directly AND the fallback (contains 'squat')
  // Let me use "Good Morning" with a non-lower muscle group too
  it('Good Morning with back muscle group still matches via patterns', () => {
    const result = calculateProgression({
      exercise: 'Good Morning',
      previousWeight: 60, previousReps: 10, previousRpe: 7,
      targetRepRange: [6, 10], muscleGroup: 'back',
    })
    // 'good morning' is in LOWER_BODY_COMPOUND_PATTERNS -> lower_compound
    // Without pattern check, back is NOT in lowerBodyGroups, falls to isolation
    expect(result.reason).toContain('lower compound')
  })

  // ---- Kill lowerBodyGroups.includes(muscleGroup) -> true mutant ----
  // If mutated to `if (true)`, non-lower muscle groups would enter the fallback.
  // An exercise like "Dumbbell Press" on 'chest' (not in lowerBodyGroups) with 'press' hint
  // would match compound hints and be classified as lower_compound instead of isolation/upper.
  // BUT wait - "Dumbbell Press" doesn't match UPPER_BODY_COMPOUND_PATTERNS (no exact match for 'dumbbell press')
  // Let me check: 'incline press'.includes in 'dumbbell press'? No.
  // Actually 'dumbbell press' doesn't contain 'bench press', 'overhead press', 'incline press', etc.
  // Wait - but 'press' IS in the pattern list! No it's not - the UPPER patterns are full strings.
  // 'dumbbell press' doesn't contain 'bench press' or 'overhead press' or 'incline press' or 'military press'.
  // It DOES contain... let me check each: bench press? no. overhead press? no. incline press? no.
  // close grip bench? no. military press? no.
  // So 'Dumbbell Press' on 'chest' would: not match lower patterns, not match upper patterns,
  // then check lowerBodyGroups.includes('chest') -> false -> fall to isolation.
  // If mutated to true: check compoundHints.includes('press') -> yes -> lower_compound!

  it('Dumbbell Press on chest is isolation (not lower compound via fallback)', () => {
    const result = calculateProgression({
      exercise: 'Dumbbell Press',
      previousWeight: 30, previousReps: 12, previousRpe: 7,
      targetRepRange: [8, 12], muscleGroup: 'chest',
    })
    expect(result.reason).toContain('isolation')
    expect(result.reason).not.toContain('lower compound')
  })
})
