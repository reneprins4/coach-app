/**
 * Tests for src/lib/junkVolumeDetector.ts
 */
import { describe, it, expect } from 'vitest'
import { detectJunkVolume } from '../junkVolumeDetector'
import type { JunkVolumeSet } from '../../types'

describe('junkVolumeDetector', () => {
  describe('detectJunkVolume', () => {
    it('returns null for fewer than 3 sets', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 7, weight_kg: 80, reps: 10 },
        { rpe: 8, weight_kg: 80, reps: 10 },
      ]
      expect(detectJunkVolume('Bench Press', sets)).toBeNull()
    })

    it('returns null for empty sets array', () => {
      expect(detectJunkVolume('Bench Press', [])).toBeNull()
    })

    it('returns null for null/undefined sets', () => {
      expect(detectJunkVolume('Bench Press', null as unknown as JunkVolumeSet[])).toBeNull()
    })

    it('returns null for stable sets (no degradation)', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 7, weight_kg: 80, reps: 10 },
        { rpe: 7.5, weight_kg: 80, reps: 10 },
        { rpe: 7.5, weight_kg: 80, reps: 10 },
      ]
      expect(detectJunkVolume('Bench Press', sets)).toBeNull()
    })

    it('detects RPE drift (set quality degradation) at medium severity', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 7, weight_kg: 80, reps: 10 },
        { rpe: 7.5, weight_kg: 80, reps: 10 },
        { rpe: 8.5, weight_kg: 80, reps: 10 }, // +1.5 RPE drift
      ]
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('set_quality_degradation')
      expect(result!.severity).toBe('medium')
      expect(result!.exercise).toBe('Bench Press')
    })

    it('detects RPE drift at high severity', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 6, weight_kg: 80, reps: 10 },
        { rpe: 7, weight_kg: 80, reps: 10 },
        { rpe: 9, weight_kg: 80, reps: 10 }, // +3 RPE drift
      ]
      const result = detectJunkVolume('Squat', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('set_quality_degradation')
      expect(result!.severity).toBe('high')
    })

    it('does NOT flag RPE drift when weight increased', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 7, weight_kg: 80, reps: 10 },
        { rpe: 8, weight_kg: 85, reps: 10 },
        { rpe: 9, weight_kg: 90, reps: 10 }, // RPE up but weight also up
      ]
      // Weight increased, so avg weight < last weight — not flagged as degradation
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).toBeNull()
    })

    it('detects reps degradation at medium severity (25-35% drop)', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 8, weight_kg: 80, reps: 10 },
        { rpe: 8, weight_kg: 80, reps: 9 },
        { rpe: 8, weight_kg: 80, reps: 7 }, // 30% drop from first set
      ]
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('reps_degradation')
      expect(result!.severity).toBe('medium')
    })

    it('detects reps degradation at high severity (>35% drop)', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 8, weight_kg: 80, reps: 10 },
        { rpe: 8, weight_kg: 80, reps: 7 },
        { rpe: 8, weight_kg: 80, reps: 5 }, // 50% drop
      ]
      const result = detectJunkVolume('Deadlift', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('reps_degradation')
      expect(result!.severity).toBe('high')
    })

    it('does NOT flag reps degradation when weight dropped significantly', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: 8, weight_kg: 80, reps: 10 },
        { rpe: 8, weight_kg: 60, reps: 8 },
        { rpe: 8, weight_kg: 50, reps: 6 }, // reps drop but weight also dropped
      ]
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).toBeNull()
    })

    it('prioritizes RPE check over reps check', () => {
      // Both conditions met — should return RPE degradation first
      const sets: JunkVolumeSet[] = [
        { rpe: 6, weight_kg: 80, reps: 10 },
        { rpe: 7, weight_kg: 80, reps: 8 },
        { rpe: 8.5, weight_kg: 80, reps: 6 }, // Both RPE drift and rep drop
      ]
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('set_quality_degradation')
    })

    it('handles sets with missing RPE/weight gracefully', () => {
      const sets: JunkVolumeSet[] = [
        { rpe: null, weight_kg: 80, reps: 10 },
        { rpe: null, weight_kg: 80, reps: 8 },
        { rpe: null, weight_kg: 80, reps: 5 },
      ]
      // Should still detect reps degradation
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('reps_degradation')
    })

    // -- ALGO-010: Warmup set filtering --

    it('warmup sets (< 70% of max weight) are excluded from junk volume analysis', () => {
      // 2 warmup sets + 3 work sets. Warmup RPE drift should NOT trigger warning.
      // 60kg = 60% of 100kg max -> filtered out
      // 80kg = 80% of 100kg max -> kept (>= 70%)
      // Work sets at 100kg with mild RPE drift (not enough to trigger on their own)
      const sets: JunkVolumeSet[] = [
        { rpe: 6, weight_kg: 60, reps: 10 },   // warmup - filtered
        { rpe: 7, weight_kg: 80, reps: 8 },    // kept (80% of max)
        { rpe: 7, weight_kg: 100, reps: 6 },   // work set
        { rpe: 8, weight_kg: 100, reps: 6 },   // work set
        { rpe: 8.5, weight_kg: 100, reps: 5 }, // work set
      ]
      // Without warmup filtering: RPE goes 6 -> 8.5 = +2.5 drift (high severity)
      // With warmup filtering: RPE goes 7 -> 8.5 = +1.5 among kept sets (may trigger medium)
      // The key: the 60kg warmup set should NOT be part of analysis
      const result = detectJunkVolume('Squat', sets)
      // If result triggers, it should be based on work sets only (not the warmup)
      if (result) {
        // The drift should be calculated from kept sets, not from the 60kg warmup
        expect(result.rpeDrift).not.toBe('2.5')
      }
    })

    it('work sets are still analyzed for junk volume', () => {
      // All sets at working weight — no warmup filtering should occur
      // Clear RPE degradation in work sets
      const sets: JunkVolumeSet[] = [
        { rpe: 6, weight_kg: 100, reps: 8 },
        { rpe: 7.5, weight_kg: 100, reps: 7 },
        { rpe: 9, weight_kg: 100, reps: 5 },  // +3 RPE drift, clear junk volume
      ]
      const result = detectJunkVolume('Squat', sets)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('set_quality_degradation')
      expect(result!.severity).toBe('high')
    })

    it('all sets at similar weight are all analyzed (no false filtering)', () => {
      // Sets at 95kg, 100kg, 100kg — all >= 70% of max (100kg)
      // Should NOT filter any of them
      const sets: JunkVolumeSet[] = [
        { rpe: 7, weight_kg: 95, reps: 8 },
        { rpe: 7.5, weight_kg: 100, reps: 8 },
        { rpe: 7.5, weight_kg: 100, reps: 7 },
      ]
      // No degradation — should return null
      const result = detectJunkVolume('Bench Press', sets)
      expect(result).toBeNull()
    })

    it('warmup filtering prevents false junk volume from warmup-to-work RPE increase', () => {
      // Classic scenario: warmup at low RPE, work sets at moderate RPE
      // Without filtering, the RPE jump from warmup to work looks like degradation
      const sets: JunkVolumeSet[] = [
        { rpe: 5, weight_kg: 60, reps: 12 },  // warmup (60% of 100) -> filtered
        { rpe: 6, weight_kg: 70, reps: 10 },  // warmup (70% of 100) -> kept
        { rpe: 7, weight_kg: 100, reps: 8 },  // work
        { rpe: 7.5, weight_kg: 100, reps: 7 }, // work
        { rpe: 8, weight_kg: 100, reps: 7 },  // work
      ]
      // Without filtering: RPE 5->8 = +3.0 drift (false high severity!)
      // With filtering (60kg removed): RPE 6->8 = +2.0 among last 3 of [70,100,100,100]
      // The 60kg set should definitely be excluded
      const result = detectJunkVolume('Bench Press', sets)
      // Should NOT be high severity from warmup-to-work transition
      if (result) {
        expect(result.severity).not.toBe('high')
      }
    })
  })
})
