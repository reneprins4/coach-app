import { describe, it, expect } from 'vitest'
import {
  toDisplayWeight,
  toKg,
  formatWeight,
  getWeightStep,
  formatVolume,
} from '../unitConversion'

describe('unitConversion', () => {
  describe('toDisplayWeight', () => {
    it('returns kg unchanged when unit is kg', () => {
      expect(toDisplayWeight(100, 'kg')).toBe(100)
    })

    it('converts kg to lbs', () => {
      expect(toDisplayWeight(100, 'lbs')).toBeCloseTo(220.5, 0)
    })

    it('handles zero', () => {
      expect(toDisplayWeight(0, 'lbs')).toBe(0)
    })
  })

  describe('toKg', () => {
    it('returns value unchanged when unit is kg', () => {
      expect(toKg(100, 'kg')).toBe(100)
    })

    it('converts lbs to kg', () => {
      expect(toKg(220, 'lbs')).toBeCloseTo(99.79, 0)
    })

    it('handles zero', () => {
      expect(toKg(0, 'lbs')).toBe(0)
    })
  })

  describe('formatWeight', () => {
    it('formats kg correctly', () => {
      expect(formatWeight(60, 'kg')).toBe('60kg')
    })

    it('formats lbs correctly', () => {
      expect(formatWeight(60, 'lbs')).toBe('132.3lbs')
    })
  })

  describe('getWeightStep', () => {
    it('returns 2.5 for kg', () => {
      expect(getWeightStep('kg')).toBe(2.5)
    })

    it('returns 5 for lbs', () => {
      expect(getWeightStep('lbs')).toBe(5)
    })
  })

  describe('round-trip conversion', () => {
    it('kg -> lbs -> kg is approximately equal', () => {
      const original = 100
      const displayed = toDisplayWeight(original, 'lbs')
      const backToKg = toKg(displayed, 'lbs')
      expect(backToKg).toBeCloseTo(original, 0)
    })

    it('works for various weights', () => {
      for (const w of [20, 60, 100, 150, 200]) {
        const roundTrip = toKg(toDisplayWeight(w, 'lbs'), 'lbs')
        expect(roundTrip).toBeCloseTo(w, 0)
      }
    })
  })

  describe('formatVolume', () => {
    it('formats kg volume', () => {
      expect(formatVolume(500, 'kg')).toBe('500kg')
      expect(formatVolume(1500, 'kg')).toBe('1.5t')
    })

    it('formats lbs volume', () => {
      const result = formatVolume(500, 'lbs')
      expect(result).toMatch(/lbs$/)
    })

    it('handles zero', () => {
      expect(formatVolume(0, 'kg')).toBe('0kg')
      expect(formatVolume(0, 'lbs')).toBe('0lbs')
    })
  })
})
