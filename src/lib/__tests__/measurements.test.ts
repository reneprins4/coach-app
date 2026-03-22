import { describe, it, expect } from 'vitest'
import {
  calculateTrend,
  formatMeasurement,
  MEASUREMENT_TYPES,
  validateMeasurement,
  groupByType,
} from '../measurements'
import type { Measurement } from '../measurements'

describe('Body Measurements', () => {
  describe('MEASUREMENT_TYPES', () => {
    it('includes weight, waist, chest, arms, hips, thighs', () => {
      const types = MEASUREMENT_TYPES.map(m => m.type)
      expect(types).toContain('weight')
      expect(types).toContain('waist')
      expect(types).toContain('chest')
      expect(types).toContain('arms')
      expect(types).toContain('hips')
      expect(types).toContain('thighs')
      expect(types).toHaveLength(6)
    })
  })

  describe('validateMeasurement', () => {
    it('rejects negative values', () => {
      expect(validateMeasurement('weight', -5)).not.toBeNull()
    })

    it('rejects zero', () => {
      expect(validateMeasurement('weight', 0)).not.toBeNull()
    })

    it('accepts normal weight (50-200kg)', () => {
      expect(validateMeasurement('weight', 80)).toBeNull()
      expect(validateMeasurement('weight', 50)).toBeNull()
      expect(validateMeasurement('weight', 200)).toBeNull()
    })

    it('accepts normal waist (50-150cm)', () => {
      expect(validateMeasurement('waist', 80)).toBeNull()
      expect(validateMeasurement('waist', 50)).toBeNull()
      expect(validateMeasurement('waist', 150)).toBeNull()
    })

    it('rejects unreasonable values (>500)', () => {
      expect(validateMeasurement('weight', 501)).not.toBeNull()
      expect(validateMeasurement('waist', 600)).not.toBeNull()
    })
  })

  describe('calculateTrend', () => {
    it('returns "up" when last > first by >1%', () => {
      expect(calculateTrend([100, 102, 105])).toBe('up')
    })

    it('returns "down" when last < first by >1%', () => {
      expect(calculateTrend([100, 98, 95])).toBe('down')
    })

    it('returns "stable" when change < 1%', () => {
      expect(calculateTrend([100, 100.5, 100.2])).toBe('stable')
    })

    it('returns null for fewer than 2 data points', () => {
      expect(calculateTrend([])).toBeNull()
      expect(calculateTrend([100])).toBeNull()
    })
  })

  describe('groupByType', () => {
    const measurements: Measurement[] = [
      { id: '1', user_id: 'u1', type: 'weight', value: 80, date: '2026-03-20', created_at: '2026-03-20T10:00:00Z' },
      { id: '2', user_id: 'u1', type: 'waist', value: 85, date: '2026-03-19', created_at: '2026-03-19T10:00:00Z' },
      { id: '3', user_id: 'u1', type: 'weight', value: 79, date: '2026-03-18', created_at: '2026-03-18T10:00:00Z' },
      { id: '4', user_id: 'u1', type: 'waist', value: 84, date: '2026-03-20', created_at: '2026-03-20T10:00:00Z' },
    ]

    it('groups measurements correctly', () => {
      const grouped = groupByType(measurements)
      expect(grouped.weight).toHaveLength(2)
      expect(grouped.waist).toHaveLength(2)
      expect(grouped.chest).toHaveLength(0)
    })

    it('sorts entries by date ascending', () => {
      const grouped = groupByType(measurements)
      // weight: id 3 (Mar 18) should come before id 1 (Mar 20)
      expect(grouped.weight[0]!.date).toBe('2026-03-18')
      expect(grouped.weight[1]!.date).toBe('2026-03-20')
    })
  })

  describe('formatMeasurement', () => {
    it('shows kg for weight type', () => {
      expect(formatMeasurement('weight', 80)).toBe('80 kg')
    })

    it('shows cm for other types', () => {
      expect(formatMeasurement('waist', 85)).toBe('85 cm')
      expect(formatMeasurement('chest', 100)).toBe('100 cm')
      expect(formatMeasurement('arms', 35)).toBe('35 cm')
    })

    it('shows cm for hips type', () => {
      expect(formatMeasurement('hips', 95)).toBe('95 cm')
    })

    it('shows cm for thighs type', () => {
      expect(formatMeasurement('thighs', 55)).toBe('55 cm')
    })

    it('formats decimal values correctly', () => {
      expect(formatMeasurement('weight', 80.5)).toBe('80.5 kg')
      expect(formatMeasurement('waist', 85.3)).toBe('85.3 cm')
    })
  })

  // ---- Validate exact boundaries (mutant killers) ----

  describe('validateMeasurement boundary precision', () => {
    // value <= 0 check
    it('value 0 is invalid (boundary: <= 0)', () => {
      expect(validateMeasurement('weight', 0)).not.toBeNull()
    })

    it('value -0.1 is invalid', () => {
      expect(validateMeasurement('weight', -0.1)).not.toBeNull()
    })

    it('value 0.1 is checked against type-specific ranges', () => {
      // 0.1 > 0, passes first check
      // weight: 0.1 < 20 -> should fail weight range check
      expect(validateMeasurement('weight', 0.1)).not.toBeNull()
    })

    // value > 500 check
    it('value 500 is NOT rejected by the >500 check but fails range check for weight', () => {
      // 500 is not > 500, so the >500 gate passes. Then weight check: 500 > 300 -> fail
      expect(validateMeasurement('weight', 500)).not.toBeNull()
      // But the error message should be the weight range message, NOT "seems unreasonable"
      expect(validateMeasurement('weight', 500)).toBe('Weight should be between 20 and 300 kg')
    })

    it('value 500 for non-weight passes >500 check but fails range check', () => {
      // 500 for waist: passes >500 check (500 is not > 500), then 500 > 300 -> fail
      expect(validateMeasurement('waist', 500)).toBe('Measurement should be between 10 and 300 cm')
    })

    it('value exactly 500 is distinguished from 500.1 (>500 vs >=500)', () => {
      // If mutant changes > to >=, 500 would get "Value seems unreasonable" instead of range error
      const result500 = validateMeasurement('waist', 500)
      const result501 = validateMeasurement('waist', 500.1)
      expect(result500).not.toBe(result501)
      expect(result501).toBe('Value seems unreasonable')
      // 500 should NOT be "Value seems unreasonable"
      expect(result500).not.toBe('Value seems unreasonable')
    })

    it('value 500.1 is rejected by the >500 check', () => {
      expect(validateMeasurement('weight', 500.1)).toBe('Value seems unreasonable')
    })

    it('value 501 is rejected by the >500 check', () => {
      expect(validateMeasurement('weight', 501)).toBe('Value seems unreasonable')
    })

    // Weight-specific range: 20-300
    it('weight 19.9 is invalid (below 20)', () => {
      expect(validateMeasurement('weight', 19.9)).not.toBeNull()
    })

    it('weight 20 is valid (exact lower bound)', () => {
      expect(validateMeasurement('weight', 20)).toBeNull()
    })

    it('weight 300 is valid (exact upper bound)', () => {
      expect(validateMeasurement('weight', 300)).toBeNull()
    })

    it('weight 300.1 is invalid (above 300)', () => {
      expect(validateMeasurement('weight', 300.1)).not.toBeNull()
    })

    // Non-weight range: 10-300
    it('waist 9.9 is invalid (below 10)', () => {
      expect(validateMeasurement('waist', 9.9)).not.toBeNull()
    })

    it('waist 10 is valid (exact lower bound)', () => {
      expect(validateMeasurement('waist', 10)).toBeNull()
    })

    it('waist 300 is valid (exact upper bound)', () => {
      expect(validateMeasurement('waist', 300)).toBeNull()
    })

    it('waist 300.1 is invalid (above 300)', () => {
      expect(validateMeasurement('waist', 300.1)).not.toBeNull()
    })

    it('chest 9 is invalid', () => {
      expect(validateMeasurement('chest', 9)).not.toBeNull()
    })

    it('chest 10 is valid', () => {
      expect(validateMeasurement('chest', 10)).toBeNull()
    })

    // Error message content
    it('returns "Value must be greater than zero" for zero', () => {
      expect(validateMeasurement('weight', 0)).toBe('Value must be greater than zero')
    })

    it('returns "Value seems unreasonable" for >500', () => {
      expect(validateMeasurement('waist', 600)).toBe('Value seems unreasonable')
    })

    it('returns weight-specific message for out-of-range weight', () => {
      expect(validateMeasurement('weight', 10)).toBe('Weight should be between 20 and 300 kg')
    })

    it('returns measurement-specific message for out-of-range non-weight', () => {
      expect(validateMeasurement('waist', 5)).toBe('Measurement should be between 10 and 300 cm')
    })

    // All measurement types pass validation in valid range
    it('arms 35 is valid', () => {
      expect(validateMeasurement('arms', 35)).toBeNull()
    })

    it('hips 95 is valid', () => {
      expect(validateMeasurement('hips', 95)).toBeNull()
    })

    it('thighs 55 is valid', () => {
      expect(validateMeasurement('thighs', 55)).toBeNull()
    })
  })

  // ---- Trend exact thresholds (mutant killers) ----

  describe('calculateTrend boundary precision', () => {
    it('0.9% change is "stable" (under 1% threshold)', () => {
      // 100 -> 100.9: change = 0.9%
      expect(calculateTrend([100, 100.9])).toBe('stable')
    })

    it('1.1% change up is "up" (over 1% threshold)', () => {
      // 100 -> 101.1: change = 1.1%
      expect(calculateTrend([100, 101.1])).toBe('up')
    })

    it('-1.1% change is "down" (over 1% threshold)', () => {
      // 100 -> 98.9: change = -1.1%
      expect(calculateTrend([100, 98.9])).toBe('down')
    })

    it('exact 1.0% change is "stable" (not strictly > 1)', () => {
      // 100 -> 101: change = exactly 1.0%, which is NOT > 1, so stable
      expect(calculateTrend([100, 101])).toBe('stable')
    })

    it('exact -1.0% change is "stable" (not strictly < -1)', () => {
      // 100 -> 99: change = exactly -1.0%, which is NOT < -1, so stable
      expect(calculateTrend([100, 99])).toBe('stable')
    })

    it('1.01% change is "up" (just over threshold)', () => {
      // 100 -> 101.01: change = 1.01%
      expect(calculateTrend([100, 101.01])).toBe('up')
    })

    it('-1.01% change is "down" (just over threshold)', () => {
      // 100 -> 98.99: change = -1.01%
      expect(calculateTrend([100, 98.99])).toBe('down')
    })

    it('trend uses first and last values, ignoring middle', () => {
      // First=100, last=105 -> 5% up, middle values irrelevant
      expect(calculateTrend([100, 50, 105])).toBe('up')
    })

    it('handles first value of 0 with last > 0 as "up" (not division by zero)', () => {
      // If the first===0 guard is removed (mutated to false), code would do (50-0)/0 * 100 = Infinity
      // which is > 1, so it would still return 'up'. But for 0->0 case:
      expect(calculateTrend([0, 50])).toBe('up')
    })

    it('handles first value of 0 with last = 0 as "stable" (not NaN)', () => {
      // If first===0 guard is removed, code does (0-0)/0 * 100 = NaN
      // NaN > 1 is false, NaN < -1 is false, so it falls through to 'stable'
      // This means the mutant also returns 'stable' - same result, mutant survives.
      // To kill the mutant: we need a case where removing the guard changes behavior.
      // [0, 50]: without guard -> (50-0)/0 * 100 = Infinity > 1 -> 'up'. Same as with guard.
      // [0, -5]: without guard -> (-5-0)/0 * 100 = -Infinity < -1 -> 'down'. With guard -> -5 > 0? No, -5 <= 0 -> 'stable'
      expect(calculateTrend([0, 0])).toBe('stable')
    })

    it('first value 0 with negative last returns "stable" (guarded path)', () => {
      // With the first===0 guard: last(-5) > 0 is false, so returns 'stable'
      // Without guard (mutant): changePct = (-5-0)/0 * 100 = -Infinity < -1, returns 'down'
      // This difference kills the mutant!
      expect(calculateTrend([0, -5])).toBe('stable')
    })

    it('returns null for exactly 1 value', () => {
      expect(calculateTrend([42])).toBeNull()
    })

    it('returns null for empty array', () => {
      expect(calculateTrend([])).toBeNull()
    })

    it('works with exactly 2 values', () => {
      expect(calculateTrend([100, 110])).toBe('up')
    })
  })

  // ---- groupByType precision (mutant killers) ----

  describe('groupByType precision', () => {
    it('handles empty array', () => {
      const grouped = groupByType([])
      expect(grouped.weight).toEqual([])
      expect(grouped.waist).toEqual([])
      expect(grouped.chest).toEqual([])
      expect(grouped.arms).toEqual([])
      expect(grouped.hips).toEqual([])
      expect(grouped.thighs).toEqual([])
    })

    it('handles single measurement', () => {
      const m: Measurement = { id: '1', user_id: 'u1', type: 'weight', value: 80, date: '2026-03-20', created_at: '2026-03-20T10:00:00Z' }
      const grouped = groupByType([m])
      expect(grouped.weight).toHaveLength(1)
      expect(grouped.weight[0]!.value).toBe(80)
    })

    it('sorts measurements within group by date ascending', () => {
      const measurements: Measurement[] = [
        { id: '1', user_id: 'u1', type: 'weight', value: 82, date: '2026-03-22', created_at: '2026-03-22T10:00:00Z' },
        { id: '2', user_id: 'u1', type: 'weight', value: 80, date: '2026-03-20', created_at: '2026-03-20T10:00:00Z' },
        { id: '3', user_id: 'u1', type: 'weight', value: 81, date: '2026-03-21', created_at: '2026-03-21T10:00:00Z' },
      ]
      const grouped = groupByType(measurements)
      expect(grouped.weight[0]!.date).toBe('2026-03-20')
      expect(grouped.weight[1]!.date).toBe('2026-03-21')
      expect(grouped.weight[2]!.date).toBe('2026-03-22')
    })

    it('groups all six measurement types correctly', () => {
      const measurements: Measurement[] = [
        { id: '1', user_id: 'u1', type: 'weight', value: 80, date: '2026-03-20', created_at: '' },
        { id: '2', user_id: 'u1', type: 'waist', value: 85, date: '2026-03-20', created_at: '' },
        { id: '3', user_id: 'u1', type: 'chest', value: 100, date: '2026-03-20', created_at: '' },
        { id: '4', user_id: 'u1', type: 'arms', value: 35, date: '2026-03-20', created_at: '' },
        { id: '5', user_id: 'u1', type: 'hips', value: 95, date: '2026-03-20', created_at: '' },
        { id: '6', user_id: 'u1', type: 'thighs', value: 55, date: '2026-03-20', created_at: '' },
      ]
      const grouped = groupByType(measurements)
      expect(grouped.weight).toHaveLength(1)
      expect(grouped.waist).toHaveLength(1)
      expect(grouped.chest).toHaveLength(1)
      expect(grouped.arms).toHaveLength(1)
      expect(grouped.hips).toHaveLength(1)
      expect(grouped.thighs).toHaveLength(1)
    })

    it('uses localeCompare for date sorting (string comparison)', () => {
      const measurements: Measurement[] = [
        { id: '1', user_id: 'u1', type: 'waist', value: 86, date: '2026-12-01', created_at: '' },
        { id: '2', user_id: 'u1', type: 'waist', value: 85, date: '2026-01-15', created_at: '' },
      ]
      const grouped = groupByType(measurements)
      expect(grouped.waist[0]!.date).toBe('2026-01-15')
      expect(grouped.waist[1]!.date).toBe('2026-12-01')
    })
  })

  // ---- MEASUREMENT_TYPES unit verification ----

  describe('MEASUREMENT_TYPES unit precision', () => {
    it('weight type has unit "kg"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'weight')
      expect(w!.unit).toBe('kg')
    })

    it('waist type has unit "cm"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'waist')
      expect(w!.unit).toBe('cm')
    })

    it('chest type has unit "cm"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'chest')
      expect(w!.unit).toBe('cm')
    })

    it('arms type has unit "cm"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'arms')
      expect(w!.unit).toBe('cm')
    })

    it('hips type has unit "cm"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'hips')
      expect(w!.unit).toBe('cm')
    })

    it('thighs type has unit "cm"', () => {
      const w = MEASUREMENT_TYPES.find(m => m.type === 'thighs')
      expect(w!.unit).toBe('cm')
    })

    it('each type has a labelKey matching "measurements.<type>"', () => {
      for (const m of MEASUREMENT_TYPES) {
        expect(m.labelKey).toBe(`measurements.${m.type}`)
      }
    })
  })
})
