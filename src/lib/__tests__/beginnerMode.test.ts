import { describe, it, expect } from 'vitest'
import { isBeginnerMode, mapSimpleRpeToNumeric, getSimpleRpeLabel } from '../beginnerMode'

describe('Beginner Mode', () => {
  describe('isBeginnerMode', () => {
    it('returns true for "complete_beginner"', () => {
      expect(isBeginnerMode('complete_beginner')).toBe(true)
    })

    it('returns true for "beginner"', () => {
      expect(isBeginnerMode('beginner')).toBe(true)
    })

    it('returns false for "intermediate"', () => {
      expect(isBeginnerMode('intermediate')).toBe(false)
    })

    it('returns false for "advanced"', () => {
      expect(isBeginnerMode('advanced')).toBe(false)
    })
  })

  describe('mapSimpleRpeToNumeric', () => {
    it('maps Easy to 6', () => {
      expect(mapSimpleRpeToNumeric('easy')).toBe(6)
    })

    it('maps Medium to 7.5', () => {
      expect(mapSimpleRpeToNumeric('medium')).toBe(7.5)
    })

    it('maps Hard to 9', () => {
      expect(mapSimpleRpeToNumeric('hard')).toBe(9)
    })
  })

  describe('getSimpleRpeLabel', () => {
    it('returns "easy" for RPE <= 6.5', () => {
      expect(getSimpleRpeLabel(6)).toBe('easy')
      expect(getSimpleRpeLabel(6.5)).toBe('easy')
    })

    it('returns "medium" for RPE 6.5-8', () => {
      expect(getSimpleRpeLabel(7)).toBe('medium')
      expect(getSimpleRpeLabel(7.5)).toBe('medium')
      expect(getSimpleRpeLabel(8)).toBe('medium')
    })

    it('returns "hard" for RPE > 8', () => {
      expect(getSimpleRpeLabel(8.5)).toBe('hard')
      expect(getSimpleRpeLabel(9)).toBe('hard')
      expect(getSimpleRpeLabel(10)).toBe('hard')
    })
  })
})
