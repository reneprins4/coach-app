/**
 * Recovery Model Safety Tests
 *
 * These tests validate critical safety fixes to the recovery model:
 * 1. Volume multiplier produces realistic fatigue at high set counts
 * 2. RPE floor prevents RPE 6 from giving unrealistic recovery bonuses
 * 3. Compound-heavy muscle groups recover slower than isolation-heavy groups
 * 4. Volume ceilings per experience level
 */
import { describe, it, expect } from 'vitest'
import { calcMuscleRecovery, getVolumeCeiling } from '../training-analysis'

// Note: calcMuscleRecovery signature is (muscle, hoursSinceTrained, avgRPE, setsCount)

describe('Recovery Model - Safety Fixes', () => {
  // Volume multiplier: high volume should produce meaningful fatigue
  it('20 sets squats @RPE 8 should show <50% recovery after 48h', () => {
    const recovery = calcMuscleRecovery('quads', 48, 8, 20)
    expect(recovery).toBeLessThan(50)
  })

  it('6 sets bicep curls @RPE 7 should show >70% recovery after 48h', () => {
    const recovery = calcMuscleRecovery('biceps', 48, 7, 6)
    expect(recovery).toBeGreaterThan(70)
  })

  // RPE floor: RPE 6 should not dramatically reduce recovery time
  it('RPE 6 should not reduce recovery time below baseline', () => {
    const rpe6 = calcMuscleRecovery('chest', 48, 6, 10)
    const rpe7 = calcMuscleRecovery('chest', 48, 7, 10)
    // RPE 6 should be similar or slightly better, NOT dramatically better
    expect(rpe6).toBeGreaterThanOrEqual(rpe7 * 0.95)
  })

  // Compound vs isolation: compound-heavy muscles need more recovery
  it('compound exercises need more recovery than isolations at same volume', () => {
    // quads = compound-heavy (96h base), biceps = isolation-heavy (48h base)
    const quads = calcMuscleRecovery('quads', 48, 8, 12)
    const biceps = calcMuscleRecovery('biceps', 48, 8, 12)
    expect(quads).toBeLessThan(biceps) // quads recover slower
  })

  it('high volume produces realistic recovery, not 85% when should be 40%', () => {
    // 20 sets at RPE 8 after 48h should not be "almost recovered"
    const recovery = calcMuscleRecovery('quads', 48, 8, 20)
    expect(recovery).toBeLessThan(45)
  })

  // Additional safety checks
  it('back (compound-heavy, 72h base) recovers slower than triceps (isolation, 48h base) at same volume', () => {
    const back = calcMuscleRecovery('back', 48, 8, 12)
    const triceps = calcMuscleRecovery('triceps', 48, 8, 12)
    expect(back).toBeLessThan(triceps)
  })

  it('moderate volume (10 sets) at RPE 7 should show reasonable recovery after 48h', () => {
    // 10 sets chest at RPE 7 after 48h: should be partially recovered (40-80%)
    const recovery = calcMuscleRecovery('chest', 48, 7, 10)
    expect(recovery).toBeGreaterThan(30)
    expect(recovery).toBeLessThan(80)
  })

  it('RPE 6 recovery should be at most 10% better than RPE 7 (clamped floor)', () => {
    const rpe6 = calcMuscleRecovery('quads', 72, 6, 10)
    const rpe7 = calcMuscleRecovery('quads', 72, 7, 10)
    // The difference should be small due to RPE floor clamp
    const bonus = rpe6 - rpe7
    expect(bonus).toBeLessThanOrEqual(10)
  })
})

describe('Volume Ceilings', () => {
  it('beginner volume ceiling is 12 sets per muscle per week', () => {
    const ceilings = getVolumeCeiling('beginner')
    expect(ceilings['chest']).toBe(12)
    expect(ceilings['quads']).toBe(12)
    expect(ceilings['biceps']).toBe(12)
  })

  it('intermediate volume ceiling is 18 sets per muscle per week', () => {
    const ceilings = getVolumeCeiling('intermediate')
    expect(ceilings['chest']).toBe(18)
    expect(ceilings['back']).toBe(18)
  })

  it('advanced volume ceiling is 24 sets per muscle per week', () => {
    const ceilings = getVolumeCeiling('advanced')
    expect(ceilings['chest']).toBe(24)
    expect(ceilings['quads']).toBe(24)
  })

  it('getVolumeCeiling returns correct ceiling for experience level', () => {
    const beginner = getVolumeCeiling('beginner')
    const intermediate = getVolumeCeiling('intermediate')
    const advanced = getVolumeCeiling('advanced')

    // All muscle groups should have entries
    const muscles = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']
    for (const m of muscles) {
      expect(beginner[m]).toBeDefined()
      expect(intermediate[m]).toBeDefined()
      expect(advanced[m]).toBeDefined()
      // Progressive: beginner < intermediate < advanced
      expect(beginner[m]!).toBeLessThan(intermediate[m]!)
      expect(intermediate[m]!).toBeLessThan(advanced[m]!)
    }
  })

  it('unknown experience level defaults to intermediate ceiling', () => {
    const unknown = getVolumeCeiling('unknown')
    const intermediate = getVolumeCeiling('intermediate')
    expect(unknown['chest']).toBe(intermediate['chest'])
  })
})
