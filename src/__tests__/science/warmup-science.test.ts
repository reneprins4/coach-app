/**
 * Warmup Protocol Validation Tests
 *
 * These tests encode the scientific standard for warmup protocols
 * based on NSCA guidelines. If the implementation deviates from
 * established warmup science, these tests FAIL.
 */
import { describe, it, expect } from 'vitest'
import { generateWarmupSets, BAR_WEIGHT } from '../../lib/warmupCalculator'

describe('Warmup Protocol (NSCA)', () => {
  it('starts with empty bar', () => {
    const sets = generateWarmupSets('Back Squat', 100)
    expect(sets.length).toBeGreaterThan(0)
    expect(sets[0]!.weight_kg).toBe(BAR_WEIGHT)
    expect(sets[0]!.isBarOnly).toBe(true)
  })

  it('progressive percentages (50%, 70%, 85%)', () => {
    const sets = generateWarmupSets('Back Squat', 100)
    // For 100kg: bar(20), 50%(50), 70%(70), 85%(85)
    expect(sets.length).toBe(4)

    // Each warmup set should be progressively heavier
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i]!.weight_kg).toBeGreaterThan(sets[i - 1]!.weight_kg)
    }

    // Approximate percentages (within rounding tolerance of 2.5kg)
    expect(sets[1]!.weight_kg).toBeCloseTo(50, 0)  // ~50%
    expect(sets[2]!.weight_kg).toBeCloseTo(70, 0)  // ~70%
    expect(sets[3]!.weight_kg).toBeCloseTo(85, 0)  // ~85%
  })

  it('reps decrease as weight increases', () => {
    const sets = generateWarmupSets('Back Squat', 120)
    // Reps should be 10, 6, 4, 2 (decreasing)
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i]!.reps).toBeLessThanOrEqual(sets[i - 1]!.reps)
    }
  })

  it('no warmup for isolations', () => {
    const sets = generateWarmupSets('Bicep Curl', 30)
    expect(sets).toEqual([])

    const sets2 = generateWarmupSets('Lateral Raise', 15)
    expect(sets2).toEqual([])
  })
})
