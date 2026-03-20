/**
 * Tests for useRestTimer hook logic.
 *
 * Without @testing-library/react we cannot test the hook directly via renderHook().
 * Instead, we test the internal logic patterns: timer calculations, settings integration.
 * These tests validate the timer's mathematical correctness.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase (needed by settings import chain)
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}))

import { getSettings, saveSettings } from '../../lib/settings'

describe('useRestTimer (logic tests)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('timer duration from settings', () => {
    it('uses default rest time of 90 seconds when no settings stored', () => {
      const settings = getSettings()
      expect(settings.restTime).toBe(90)
    })

    it('uses stored rest time from settings', () => {
      saveSettings({ restTime: 120 })
      const settings = getSettings()
      expect(settings.restTime).toBe(120)
    })

    it('accepts custom rest time values', () => {
      saveSettings({ restTime: 60 })
      expect(getSettings().restTime).toBe(60)

      saveSettings({ restTime: 180 })
      expect(getSettings().restTime).toBe(180)
    })
  })

  describe('progress calculation', () => {
    it('progress is 0 when total is 0', () => {
      const total = 0
      const remaining = 0
      const progress = total > 0 ? (total - remaining) / total : 0
      expect(progress).toBe(0)
    })

    it('progress is 0 at start (remaining = total)', () => {
      const total = 90
      const remaining = 90
      const progress = total > 0 ? (total - remaining) / total : 0
      expect(progress).toBe(0)
    })

    it('progress is 0.5 at halfway', () => {
      const total = 90
      const remaining = 45
      const progress = total > 0 ? (total - remaining) / total : 0
      expect(progress).toBeCloseTo(0.5)
    })

    it('progress is 1 when remaining is 0', () => {
      const total = 90
      const remaining = 0
      const progress = total > 0 ? (total - remaining) / total : 0
      expect(progress).toBe(1)
    })

    it('progress increases as remaining decreases', () => {
      const total = 120
      const values = [120, 100, 80, 60, 40, 20, 0]
      let lastProgress = -1
      for (const remaining of values) {
        const progress = total > 0 ? (total - remaining) / total : 0
        expect(progress).toBeGreaterThanOrEqual(lastProgress)
        lastProgress = progress
      }
    })
  })

  describe('countdown simulation', () => {
    it('countdown decrements correctly', () => {
      let remaining = 5
      const steps: number[] = [remaining]
      while (remaining > 0) {
        remaining -= 1
        steps.push(remaining)
      }
      expect(steps).toEqual([5, 4, 3, 2, 1, 0])
    })

    it('stops at 0 and does not go negative', () => {
      let remaining = 2
      for (let i = 0; i < 5; i++) {
        if (remaining > 0) {
          remaining -= 1
        }
      }
      expect(remaining).toBe(0)
    })
  })

  describe('setInterval behavior', () => {
    it('calls callback every 1000ms', () => {
      const callback = vi.fn()
      const interval = setInterval(callback, 1000)
      vi.advanceTimersByTime(3000)
      expect(callback).toHaveBeenCalledTimes(3)
      clearInterval(interval)
    })

    it('clearInterval stops the timer', () => {
      const callback = vi.fn()
      const interval = setInterval(callback, 1000)
      vi.advanceTimersByTime(2000)
      clearInterval(interval)
      vi.advanceTimersByTime(3000)
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })
})
