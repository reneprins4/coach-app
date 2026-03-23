/**
 * Recovery Science Validation Tests
 *
 * These tests encode the scientific standard for muscle recovery times
 * based on Israetel (2023) and related literature. If the implementation
 * deviates from established recovery science, these tests FAIL.
 */
import { describe, it, expect } from 'vitest'
import { RECOVERY_HOURS, calcMuscleRecovery } from '../../lib/training-analysis'

describe('Recovery Hours (Israetel 2023)', () => {
  it('quads: 72-96h (large muscle, high systemic fatigue)', () => {
    expect(RECOVERY_HOURS.quads).toBeGreaterThanOrEqual(72)
    expect(RECOVERY_HOURS.quads).toBeLessThanOrEqual(96)
  })

  it('chest: 48-72h', () => {
    expect(RECOVERY_HOURS.chest).toBeGreaterThanOrEqual(48)
    expect(RECOVERY_HOURS.chest).toBeLessThanOrEqual(72)
  })

  it('back: 48-96h', () => {
    expect(RECOVERY_HOURS.back).toBeGreaterThanOrEqual(48)
    expect(RECOVERY_HOURS.back).toBeLessThanOrEqual(96)
  })

  it('hamstrings: 48-72h', () => {
    expect(RECOVERY_HOURS.hamstrings).toBeGreaterThanOrEqual(48)
    expect(RECOVERY_HOURS.hamstrings).toBeLessThanOrEqual(72)
  })

  it('glutes: 48-72h', () => {
    expect(RECOVERY_HOURS.glutes).toBeGreaterThanOrEqual(48)
    expect(RECOVERY_HOURS.glutes).toBeLessThanOrEqual(72)
  })

  it('biceps: 24-48h (small muscle)', () => {
    expect(RECOVERY_HOURS.biceps).toBeGreaterThanOrEqual(24)
    expect(RECOVERY_HOURS.biceps).toBeLessThanOrEqual(48)
  })

  it('triceps: 24-48h', () => {
    expect(RECOVERY_HOURS.triceps).toBeGreaterThanOrEqual(24)
    expect(RECOVERY_HOURS.triceps).toBeLessThanOrEqual(48)
  })

  it('shoulders: 48-72h', () => {
    expect(RECOVERY_HOURS.shoulders).toBeGreaterThanOrEqual(48)
    expect(RECOVERY_HOURS.shoulders).toBeLessThanOrEqual(72)
  })

  it('core: 24-48h', () => {
    expect(RECOVERY_HOURS.core).toBeGreaterThanOrEqual(24)
    expect(RECOVERY_HOURS.core).toBeLessThanOrEqual(48)
  })

  it('recovery is 0-100%, monotonically increasing with time', () => {
    // At time 0, recovery should be 0%
    const at0 = calcMuscleRecovery('chest', 0, 7, 6)
    expect(at0).toBe(0)

    // Recovery must increase monotonically over time
    let prevRecovery = 0
    for (const hours of [6, 12, 24, 36, 48, 60, 72, 96, 120]) {
      const recovery = calcMuscleRecovery('chest', hours, 7, 6)
      expect(recovery).toBeGreaterThanOrEqual(prevRecovery)
      prevRecovery = recovery
    }

    // Eventually reaches 100%
    const atLong = calcMuscleRecovery('chest', 200, 7, 6)
    expect(atLong).toBe(100)
  })

  it('higher RPE = slower recovery', () => {
    const hours = 48
    const sets = 6
    const recoveryLowRPE = calcMuscleRecovery('chest', hours, 6, sets)
    const recoveryHighRPE = calcMuscleRecovery('chest', hours, 9, sets)
    expect(recoveryLowRPE).toBeGreaterThanOrEqual(recoveryHighRPE)
  })

  it('more sets = slower recovery', () => {
    const hours = 48
    const rpe = 7
    const recoveryFewSets = calcMuscleRecovery('chest', hours, rpe, 4)
    const recoveryManySets = calcMuscleRecovery('chest', hours, rpe, 12)
    expect(recoveryFewSets).toBeGreaterThanOrEqual(recoveryManySets)
  })
})
