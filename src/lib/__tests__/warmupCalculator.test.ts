/**
 * Tests for src/lib/warmupCalculator.ts
 */
import { describe, it, expect } from 'vitest'
import { isCompound, calculateWarmupSets, generateWarmupSets, BAR_WEIGHT, COMPOUND_EXERCISES } from '../warmupCalculator'

describe('warmupCalculator', () => {
  describe('isCompound', () => {
    it('returns true for exercises containing compound keywords', () => {
      expect(isCompound('Back Squat')).toBe(true)
      expect(isCompound('Bench Press')).toBe(true)
      expect(isCompound('Deadlift')).toBe(true)
      expect(isCompound('Barbell Row')).toBe(true)
      expect(isCompound('Overhead Press')).toBe(true)
      expect(isCompound('Lat Pulldown')).toBe(true)
    })

    it('returns false for isolation exercises', () => {
      expect(isCompound('Bicep Curl')).toBe(false)
      expect(isCompound('Lateral Raise')).toBe(false)
      expect(isCompound('Tricep Pushdown')).toBe(false)
      expect(isCompound('Leg Extension')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(isCompound('BENCH PRESS')).toBe(true)
      expect(isCompound('back squat')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(isCompound('')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isCompound(null as unknown as string)).toBe(false)
      expect(isCompound(undefined as unknown as string)).toBe(false)
    })
  })

  describe('BAR_WEIGHT', () => {
    it('is 20kg', () => {
      expect(BAR_WEIGHT).toBe(20)
    })
  })

  describe('COMPOUND_EXERCISES', () => {
    it('contains expected keywords', () => {
      expect(COMPOUND_EXERCISES).toContain('squat')
      expect(COMPOUND_EXERCISES).toContain('bench')
      expect(COMPOUND_EXERCISES).toContain('deadlift')
      expect(COMPOUND_EXERCISES).toContain('press')
      expect(COMPOUND_EXERCISES).toContain('row')
      expect(COMPOUND_EXERCISES).toContain('pull')
    })
  })

  describe('calculateWarmupSets', () => {
    it('returns empty array for 0 working weight', () => {
      expect(calculateWarmupSets(0)).toEqual([])
    })

    it('returns empty array for working weight <= bar weight', () => {
      expect(calculateWarmupSets(20)).toEqual([])
      expect(calculateWarmupSets(15)).toEqual([])
    })

    it('always starts with bar-only warmup set at 20kg x10', () => {
      const sets = calculateWarmupSets(100)
      expect(sets[0]).toEqual({
        weight_kg: 20,
        reps: 10,
        label: 'Warmup',
        isBarOnly: true,
      })
    })

    it('generates correct warmup sets for 100kg working weight', () => {
      const sets = calculateWarmupSets(100)
      // Bar: 20kg x10
      // 40%: 40kg x8
      // 60%: 60kg x5
      // 80%: 80kg x3
      // 90%: 90kg x1 (>80kg)
      expect(sets.length).toBe(5)
      expect(sets[0]!.weight_kg).toBe(20) // bar
      expect(sets[1]!.weight_kg).toBe(40) // 40%
      expect(sets[2]!.weight_kg).toBe(60) // 60%
      expect(sets[3]!.weight_kg).toBe(80) // 80%
      expect(sets[4]!.weight_kg).toBe(90) // 90%
    })

    it('skips 90% set when working weight <= 80kg', () => {
      const sets = calculateWarmupSets(80)
      const has90pct = sets.some(s => s.reps === 1)
      expect(has90pct).toBe(false)
    })

    it('includes 90% set when working weight > 80kg', () => {
      const sets = calculateWarmupSets(100)
      const has90pct = sets.some(s => s.reps === 1)
      expect(has90pct).toBe(true)
    })

    it('rounds weights to nearest 2.5kg', () => {
      const sets = calculateWarmupSets(67)
      for (const set of sets) {
        expect(set.weight_kg % 2.5).toBe(0)
      }
    })

    it('does not include duplicate weight warmup sets', () => {
      // For a low weight like 30kg, some percentages will overlap with bar
      const sets = calculateWarmupSets(30)
      // First set should be bar only
      expect(sets[0]!.isBarOnly).toBe(true)
      // Other sets should have weights > bar
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i]!.weight_kg).toBeGreaterThan(BAR_WEIGHT)
      }
    })

    it('generates progressive weights (each higher than previous)', () => {
      const sets = calculateWarmupSets(120)
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i]!.weight_kg).toBeGreaterThan(sets[i - 1]!.weight_kg)
      }
    })

    it('generates decreasing reps as weight increases', () => {
      const sets = calculateWarmupSets(100)
      // 10, 8, 5, 3, 1 — each subsequent set should have fewer or equal reps
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i]!.reps).toBeLessThanOrEqual(sets[i - 1]!.reps)
      }
    })
  })

  describe('generateWarmupSets (exercise-aware)', () => {
    it('generates warm-up progression for 100kg squat: bar(20kg)→50kg→70kg→85kg', () => {
      const warmups = generateWarmupSets('Barbell Squat', 100)
      expect(warmups.length).toBeGreaterThanOrEqual(3)
      expect(warmups[0]!.weight_kg).toBe(20) // bar only
      expect(warmups[warmups.length - 1]!.weight_kg).toBeLessThan(100)
    })

    it('bar-only first set for weights above 40kg', () => {
      const warmups = generateWarmupSets('Back Squat', 60)
      expect(warmups[0]!.weight_kg).toBe(BAR_WEIGHT)
      expect(warmups[0]!.isBarOnly).toBe(true)
    })

    it('no warm-up sets for isolation exercises like bicep curl', () => {
      const warmups = generateWarmupSets('Bicep Curl', 30)
      expect(warmups).toEqual([])
    })

    it('warm-up weights rounded to nearest 2.5kg', () => {
      const warmups = generateWarmupSets('Bench Press', 73)
      for (const s of warmups) {
        expect(s.weight_kg % 2.5).toBe(0)
      }
    })

    it('warm-up reps decrease as weight increases (10→6→4→2)', () => {
      const warmups = generateWarmupSets('Barbell Squat', 120)
      // Full progression: bar x10, ~50% x6, ~70% x4, ~85% x2
      expect(warmups.length).toBe(4)
      expect(warmups[0]!.reps).toBe(10)
      expect(warmups[1]!.reps).toBe(6)
      expect(warmups[2]!.reps).toBe(4)
      expect(warmups[3]!.reps).toBe(2)
    })

    it('light working weights ≤30kg get only 1-2 warm-up sets', () => {
      const warmups = generateWarmupSets('Overhead Press', 25)
      expect(warmups.length).toBeLessThanOrEqual(2)
    })

    it('warm-up sets have isWarmup: true flag', () => {
      const warmups = generateWarmupSets('Back Squat', 100)
      for (const s of warmups) {
        expect(s.isWarmup).toBe(true)
      }
    })

    it('60kg bench: bar→40kg→50kg progression', () => {
      const warmups = generateWarmupSets('Bench Press', 60)
      // Medium weight (30-60kg): bar + ~70%
      expect(warmups.length).toBe(2)
      expect(warmups[0]!.weight_kg).toBe(20) // bar
      expect(warmups[1]!.weight_kg).toBe(42.5) // 70% of 60 = 42, rounded to 42.5
    })

    it('140kg deadlift: bar→70kg→97.5kg→120kg progression', () => {
      const warmups = generateWarmupSets('Deadlift', 140)
      // Heavy weight (>60kg): full progression bar, ~50%, ~70%, ~85%
      expect(warmups.length).toBe(4)
      expect(warmups[0]!.weight_kg).toBe(20) // bar
      expect(warmups[1]!.weight_kg).toBe(70) // 50% of 140
      expect(warmups[2]!.weight_kg).toBe(97.5) // 70% of 140 = 98 → 97.5
      expect(warmups[3]!.weight_kg).toBe(120) // 85% of 140 = 119 → 120 (rounded to 2.5)
    })

    it('returns empty for working weight at or below bar weight', () => {
      const warmups = generateWarmupSets('Back Squat', 20)
      expect(warmups).toEqual([])
    })

    it('returns empty for zero or negative weight', () => {
      expect(generateWarmupSets('Bench Press', 0)).toEqual([])
      expect(generateWarmupSets('Bench Press', -5)).toEqual([])
    })

    it('all warm-up weights are less than working weight', () => {
      const warmups = generateWarmupSets('Back Squat', 80)
      for (const s of warmups) {
        expect(s.weight_kg).toBeLessThan(80)
      }
    })

    it('generates progressive weights (each higher than previous)', () => {
      const warmups = generateWarmupSets('Back Squat', 120)
      for (let i = 1; i < warmups.length; i++) {
        expect(warmups[i]!.weight_kg).toBeGreaterThan(warmups[i - 1]!.weight_kg)
      }
    })
  })
})
