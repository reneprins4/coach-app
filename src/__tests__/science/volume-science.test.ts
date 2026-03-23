/**
 * Hypertrophy Volume Target Validation Tests
 *
 * These tests encode the scientific standard for weekly set targets
 * based on Israetel (2023) MEV/MAV ranges. If the implementation
 * deviates from established volume landmarks, these tests FAIL.
 */
import { describe, it, expect } from 'vitest'
import { SET_TARGETS_BY_GOAL, MUSCLE_GROUPS, getVolumeCeiling } from '../../lib/training-analysis'

const hyp = SET_TARGETS_BY_GOAL.hypertrophy

describe('Hypertrophy Volume Targets (Israetel 2023)', () => {
  it('all muscles: mev < min < max', () => {
    for (const muscle of MUSCLE_GROUPS) {
      const t = hyp[muscle]
      expect(t.mev).toBeLessThan(t.min)
      expect(t.min).toBeLessThan(t.max)
    }
  })

  it('large muscles have higher max than small muscles', () => {
    // Large: quads, back, chest. Small: biceps, triceps, core
    const largeMax = Math.min(hyp.quads.max, hyp.back.max, hyp.chest.max)
    const smallMax = Math.max(hyp.biceps.max, hyp.triceps.max, hyp.core.max)
    expect(largeMax).toBeGreaterThan(smallMax)
  })

  it('glute MEV is 0-4 (low due to compound carryover)', () => {
    // Israetel: glutes get substantial volume from squats/deadlifts
    // MEV is low because compounds already provide significant stimulus
    expect(hyp.glutes.mev).toBeGreaterThanOrEqual(0)
    expect(hyp.glutes.mev).toBeLessThanOrEqual(4)
  })

  it('shoulder max is 18-22 (high for side/rear delts)', () => {
    // Israetel: side and rear delts can tolerate very high volumes
    // because they recover quickly and are small muscles with low systemic fatigue
    expect(hyp.shoulders.max).toBeGreaterThanOrEqual(18)
    expect(hyp.shoulders.max).toBeLessThanOrEqual(22)
  })

  it('core min is 4-6 (low due to compound carryover)', () => {
    // Core gets significant indirect work from squats, deadlifts, rows, etc.
    // Direct core work minimum is low
    expect(hyp.core.min).toBeGreaterThanOrEqual(4)
    expect(hyp.core.min).toBeLessThanOrEqual(6)
  })

  it('volume ceiling: beginner < intermediate < advanced', () => {
    const beginnerCeiling = getVolumeCeiling('beginner')
    const intermediateCeiling = getVolumeCeiling('intermediate')
    const advancedCeiling = getVolumeCeiling('advanced')

    for (const muscle of MUSCLE_GROUPS) {
      expect(beginnerCeiling[muscle]).toBeLessThan(intermediateCeiling[muscle]!)
      expect(intermediateCeiling[muscle]).toBeLessThan(advancedCeiling[muscle]!)
    }
  })

  it('beginner ceiling is 50-70% of advanced', () => {
    const beginnerCeiling = getVolumeCeiling('beginner')
    const advancedCeiling = getVolumeCeiling('advanced')

    for (const muscle of MUSCLE_GROUPS) {
      const ratio = beginnerCeiling[muscle]! / advancedCeiling[muscle]!
      expect(ratio).toBeGreaterThanOrEqual(0.50)
      expect(ratio).toBeLessThanOrEqual(0.70)
    }
  })
})
