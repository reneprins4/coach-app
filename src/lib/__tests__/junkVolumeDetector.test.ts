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
  })
})
