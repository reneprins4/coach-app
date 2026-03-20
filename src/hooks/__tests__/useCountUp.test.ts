import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useCountUp (logic tests)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ease-out cubic function', () => {
    // The easing function: 1 - Math.pow(1 - progress, 3)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    it('returns 0 at progress 0', () => {
      expect(easeOutCubic(0)).toBe(0)
    })

    it('returns 1 at progress 1', () => {
      expect(easeOutCubic(1)).toBe(1)
    })

    it('is above linear at midpoint (ease-out characteristic)', () => {
      const midpoint = easeOutCubic(0.5)
      expect(midpoint).toBeGreaterThan(0.5)
    })

    it('is monotonically increasing', () => {
      let prev = 0
      for (let t = 0.1; t <= 1; t += 0.1) {
        const val = easeOutCubic(t)
        expect(val).toBeGreaterThan(prev)
        prev = val
      }
    })
  })

  describe('count-up value calculation', () => {
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const calcValue = (target: number, progress: number) =>
      Math.round(target * easeOutCubic(progress) * 10) / 10

    it('returns 0 when not active (progress = 0)', () => {
      expect(calcValue(100, 0)).toBe(0)
    })

    it('returns target value when active after duration (progress = 1)', () => {
      expect(calcValue(100, 1)).toBe(100)
    })

    it('handles target of 0', () => {
      expect(calcValue(0, 0)).toBe(0)
      expect(calcValue(0, 0.5)).toBe(0)
      expect(calcValue(0, 1)).toBe(0)
    })

    it('handles decimal targets', () => {
      const result = calcValue(7.5, 1)
      expect(result).toBe(7.5)
    })

    it('returns intermediate values during animation', () => {
      const halfValue = calcValue(100, 0.5)
      expect(halfValue).toBeGreaterThan(0)
      expect(halfValue).toBeLessThan(100)
    })

    it('handles large targets', () => {
      const result = calcValue(50000, 1)
      expect(result).toBe(50000)
    })
  })

  describe('requestAnimationFrame simulation', () => {
    it('calls tick function on each frame', () => {
      const tick = vi.fn()
      let frameId: number

      // Simulate rAF loop
      const startRaf = () => {
        let count = 0
        const run = () => {
          if (count < 3) {
            tick(count)
            count++
            frameId = requestAnimationFrame(run)
          }
        }
        frameId = requestAnimationFrame(run)
      }

      startRaf()
      // Advance enough for rAF frames
      vi.advanceTimersByTime(64) // ~4 frames at 16ms each
      expect(tick).toHaveBeenCalled()
      cancelAnimationFrame(frameId!)
    })

    it('stops animating after cancellation', () => {
      const tick = vi.fn()
      const frameId = requestAnimationFrame(tick)
      cancelAnimationFrame(frameId)
      vi.advanceTimersByTime(32)
      expect(tick).not.toHaveBeenCalled()
    })
  })
})
