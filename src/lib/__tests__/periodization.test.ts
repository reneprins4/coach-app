/**
 * Tests for src/lib/periodization.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}))

import {
  PHASES,
  getCurrentBlock,
  getCurrentWeekTarget,
  getBlockProgress,
  startBlock,
  clearBlock,
} from '../periodization'
import { createTrainingBlock } from '../../__tests__/helpers'

const BLOCK_KEY = 'coach-training-block'

describe('periodization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('PHASES', () => {
    it('has all four phases defined', () => {
      expect(PHASES).toHaveProperty('accumulation')
      expect(PHASES).toHaveProperty('intensification')
      expect(PHASES).toHaveProperty('strength')
      expect(PHASES).toHaveProperty('deload')
    })

    it('accumulation has 4 weeks with final deload', () => {
      const phase = PHASES.accumulation
      expect(phase.weeks).toBe(4)
      expect(phase.weekTargets).toHaveLength(4)
      expect(phase.weekTargets[3]!.isDeload).toBe(true)
    })

    it('deload has 1 week that is always deload', () => {
      const phase = PHASES.deload
      expect(phase.weeks).toBe(1)
      expect(phase.weekTargets[0]!.isDeload).toBe(true)
      expect(phase.weekTargets[0]!.rpe).toBe(5)
    })

    it('strength has 3 weeks', () => {
      expect(PHASES.strength.weeks).toBe(3)
      expect(PHASES.strength.weekTargets).toHaveLength(3)
    })

    it('all phases have weekTargets matching their week count', () => {
      for (const [, config] of Object.entries(PHASES)) {
        expect(config.weekTargets.length).toBe(config.weeks)
      }
    })
  })

  describe('getCurrentBlock', () => {
    it('returns null when no block is stored', () => {
      expect(getCurrentBlock()).toBeNull()
    })

    it('returns null and clears corrupted data', () => {
      localStorage.setItem(BLOCK_KEY, 'not-json')
      expect(getCurrentBlock()).toBeNull()
      expect(localStorage.getItem(BLOCK_KEY)).toBeNull()
    })

    it('returns null for invalid block structure', () => {
      localStorage.setItem(BLOCK_KEY, JSON.stringify({ foo: 'bar' }))
      expect(getCurrentBlock()).toBeNull()
    })

    it('returns null for unknown phase', () => {
      localStorage.setItem(BLOCK_KEY, JSON.stringify({
        startDate: new Date().toISOString(),
        phase: 'nonexistent',
      }))
      expect(getCurrentBlock()).toBeNull()
    })

    it('calculates currentWeek correctly for day 0', () => {
      const now = new Date()
      localStorage.setItem(BLOCK_KEY, JSON.stringify({
        id: 'test',
        phase: 'accumulation',
        startDate: now.toISOString(),
        createdAt: now.toISOString(),
      }))
      const block = getCurrentBlock()
      expect(block).not.toBeNull()
      expect(block!.currentWeek).toBe(1)
    })

    it('calculates currentWeek correctly for day 8 (week 2)', () => {
      const start = new Date()
      start.setDate(start.getDate() - 8)
      localStorage.setItem(BLOCK_KEY, JSON.stringify({
        id: 'test',
        phase: 'accumulation',
        startDate: start.toISOString(),
        createdAt: start.toISOString(),
      }))
      const block = getCurrentBlock()
      expect(block!.currentWeek).toBe(2)
    })

    it('caps currentWeek at phase maximum', () => {
      const start = new Date()
      start.setDate(start.getDate() - 100) // way past 4 weeks
      localStorage.setItem(BLOCK_KEY, JSON.stringify({
        id: 'test',
        phase: 'accumulation',
        startDate: start.toISOString(),
        createdAt: start.toISOString(),
      }))
      const block = getCurrentBlock()
      expect(block!.currentWeek).toBe(4) // max for accumulation
    })
  })

  describe('getCurrentWeekTarget', () => {
    it('returns null for null block', () => {
      expect(getCurrentWeekTarget(null)).toBeNull()
    })

    it('returns week 1 target for new block', () => {
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 1 })
      const target = getCurrentWeekTarget(block)
      expect(target).not.toBeNull()
      expect(target!.week).toBe(1)
      expect(target!.rpe).toBe(7)
      expect(target!.isDeload).toBe(false)
    })

    it('returns deload target for week 4 of accumulation', () => {
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 4 })
      const target = getCurrentWeekTarget(block)
      expect(target!.isDeload).toBe(true)
      expect(target!.rpe).toBe(5)
    })

    it('clamps to last week if currentWeek exceeds targets', () => {
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 5 })
      const target = getCurrentWeekTarget(block)
      expect(target).not.toBeNull()
      expect(target!.isDeload).toBe(true)
    })

    it('returns correct intensification week 3 target', () => {
      const block = createTrainingBlock({ phase: 'intensification', currentWeek: 3 })
      const target = getCurrentWeekTarget(block)
      expect(target!.rpe).toBe(8.5)
      expect(target!.repRange).toEqual([5, 6])
    })
  })

  describe('getBlockProgress', () => {
    it('returns null for null block', () => {
      expect(getBlockProgress(null)).toBeNull()
    })

    it('returns correct progress for week 1 of 4', () => {
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 1 })
      const progress = getBlockProgress(block)
      expect(progress!.currentWeek).toBe(1)
      expect(progress!.totalWeeks).toBe(4)
      expect(progress!.pct).toBe(25)
      expect(progress!.isLastWeek).toBe(false)
    })

    it('isLastWeek is true on final week', () => {
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 4 })
      const progress = getBlockProgress(block)
      expect(progress!.isLastWeek).toBe(true)
      expect(progress!.pct).toBe(100)
    })

    it('handles deload (1 week phase)', () => {
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 1 })
      const progress = getBlockProgress(block)
      expect(progress!.totalWeeks).toBe(1)
      expect(progress!.pct).toBe(100)
      expect(progress!.isLastWeek).toBe(true)
    })
  })

  describe('startBlock', () => {
    it('stores a new block in localStorage', async () => {
      await startBlock('accumulation', null)
      const raw = localStorage.getItem(BLOCK_KEY)
      expect(raw).toBeTruthy()
      const block = JSON.parse(raw!)
      expect(block.phase).toBe('accumulation')
      expect(block.id).toBeTruthy()
    })

    it('stores fullPlan when provided', async () => {
      const plan = ['accumulation', 'intensification', 'deload']
      await startBlock('accumulation', null, plan)
      const block = JSON.parse(localStorage.getItem(BLOCK_KEY)!)
      expect(block.fullPlan).toEqual(plan)
    })
  })

  describe('clearBlock', () => {
    it('removes block from localStorage', async () => {
      localStorage.setItem(BLOCK_KEY, '{"phase":"test"}')
      await clearBlock(null)
      expect(localStorage.getItem(BLOCK_KEY)).toBeNull()
    })
  })
})
