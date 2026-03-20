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
  })
})
