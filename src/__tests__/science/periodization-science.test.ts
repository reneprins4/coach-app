/**
 * Phase Structure Validation Tests
 *
 * These tests encode the scientific standard for periodization phases
 * based on Helms (2014), Israetel, and related literature. If the
 * implementation deviates from established periodization science,
 * these tests FAIL.
 */
import { describe, it, expect } from 'vitest'
import { PHASES } from '../../lib/periodization'

describe('Phase Structure (Helms 2014, Israetel)', () => {
  it('accumulation: 3-6 weeks, RPE 7-8, reps 8-15', () => {
    const phase = PHASES.accumulation
    expect(phase.weeks).toBeGreaterThanOrEqual(3)
    expect(phase.weeks).toBeLessThanOrEqual(6)

    const workWeeks = phase.weekTargets.filter(w => !w.isDeload)
    for (const wt of workWeeks) {
      expect(wt.rpe).toBeGreaterThanOrEqual(7)
      expect(wt.rpe).toBeLessThanOrEqual(8)
      expect(wt.repRange[0]).toBeGreaterThanOrEqual(8)
      expect(wt.repRange[1]).toBeLessThanOrEqual(15)
    }
  })

  it('intensification: 3-5 weeks, RPE 7.5-8.5, reps 4-8', () => {
    const phase = PHASES.intensification
    expect(phase.weeks).toBeGreaterThanOrEqual(3)
    expect(phase.weeks).toBeLessThanOrEqual(5)

    const workWeeks = phase.weekTargets.filter(w => !w.isDeload)
    for (const wt of workWeeks) {
      expect(wt.rpe).toBeGreaterThanOrEqual(7.5)
      expect(wt.rpe).toBeLessThanOrEqual(8.5)
      expect(wt.repRange[0]).toBeGreaterThanOrEqual(4)
      expect(wt.repRange[1]).toBeLessThanOrEqual(8)
    }
  })

  it('strength: 2-4 weeks, RPE 8-9.5, reps 1-5', () => {
    const phase = PHASES.strength
    expect(phase.weeks).toBeGreaterThanOrEqual(2)
    expect(phase.weeks).toBeLessThanOrEqual(4)

    const workWeeks = phase.weekTargets.filter(w => !w.isDeload)
    for (const wt of workWeeks) {
      expect(wt.rpe).toBeGreaterThanOrEqual(8)
      expect(wt.rpe).toBeLessThanOrEqual(9.5)
      expect(wt.repRange[0]).toBeGreaterThanOrEqual(1)
      expect(wt.repRange[1]).toBeLessThanOrEqual(5)
    }
  })

  it('RPE increases across non-deload weeks within each phase', () => {
    for (const [_name, phase] of Object.entries(PHASES)) {
      const workWeeks = phase.weekTargets.filter(w => !w.isDeload)
      for (let i = 1; i < workWeeks.length; i++) {
        expect(workWeeks[i]!.rpe).toBeGreaterThanOrEqual(workWeeks[i - 1]!.rpe)
      }
    }
  })

  it('deload RPE is consistently 5-6 across ALL phases', () => {
    for (const [_name, phase] of Object.entries(PHASES)) {
      const deloadWeeks = phase.weekTargets.filter(w => w.isDeload)
      for (const dw of deloadWeeks) {
        expect(dw.rpe).toBeGreaterThanOrEqual(5)
        expect(dw.rpe).toBeLessThanOrEqual(6)
      }
    }
  })

  it('each phase has a deload week', () => {
    for (const [_name, phase] of Object.entries(PHASES)) {
      const deloadWeeks = phase.weekTargets.filter(w => w.isDeload)
      expect(deloadWeeks.length).toBeGreaterThanOrEqual(1)
    }
  })
})
