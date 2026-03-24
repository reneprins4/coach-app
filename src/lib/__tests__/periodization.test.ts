/**
 * Tests for src/lib/periodization.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock supabase — controllable per test via mockSingle
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
const mockUpsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
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
  loadBlock,
  isBlockExpired,
  getBlockExpiryInfo,
} from '../periodization'
import { createTrainingBlock } from '../../__tests__/helpers'

const BLOCK_KEY = 'coach-training-block'

describe('periodization', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockUpsert.mockResolvedValue({ error: null })
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

  describe('Multi-device sync (DATA-002)', () => {
    const oldTimestamp = '2026-03-20T10:00:00.000Z'
    const newTimestamp = '2026-03-22T10:00:00.000Z'

    function makeStoredBlock(lastModified: string) {
      return {
        id: 'block-sync',
        phase: 'accumulation',
        startDate: '2026-03-15T00:00:00.000Z',
        createdAt: '2026-03-15T00:00:00.000Z',
        fullPlan: null,
        lastModified,
      }
    }

    it('loadBlock prefers Supabase when its lastModified is newer', async () => {
      // localStorage has old data
      localStorage.setItem(BLOCK_KEY, JSON.stringify(makeStoredBlock(oldTimestamp)))
      // Supabase has newer data
      mockSingle.mockResolvedValue({
        data: { block: makeStoredBlock(newTimestamp) },
        error: null,
      })

      const block = await loadBlock('user-1')
      expect(block).not.toBeNull()
      expect(block!.lastModified).toBe(newTimestamp)
    })

    it('loadBlock prefers localStorage when its lastModified is newer', async () => {
      // localStorage has newer data
      localStorage.setItem('coach-current-user', 'user-1')
      localStorage.setItem(BLOCK_KEY, JSON.stringify(makeStoredBlock(newTimestamp)))
      // Supabase has older data
      mockSingle.mockResolvedValue({
        data: { block: makeStoredBlock(oldTimestamp) },
        error: null,
      })

      const block = await loadBlock('user-1')
      expect(block).not.toBeNull()
      expect(block!.lastModified).toBe(newTimestamp)
    })

    it('loadBlock syncs newer localStorage data back to Supabase', async () => {
      // localStorage has newer data
      localStorage.setItem('coach-current-user', 'user-1')
      localStorage.setItem(BLOCK_KEY, JSON.stringify(makeStoredBlock(newTimestamp)))
      // Supabase has older data
      mockSingle.mockResolvedValue({
        data: { block: makeStoredBlock(oldTimestamp) },
        error: null,
      })

      await loadBlock('user-1')
      // Should upsert to Supabase with the newer block
      expect(mockUpsert).toHaveBeenCalled()
    })

    it('missing lastModified treats data as epoch (fallback to Supabase)', async () => {
      // localStorage has block without lastModified (legacy data)
      const legacyBlock = { ...makeStoredBlock(newTimestamp) }
      delete (legacyBlock as Record<string, unknown>).lastModified
      localStorage.setItem(BLOCK_KEY, JSON.stringify(legacyBlock))

      // Supabase has block with lastModified
      mockSingle.mockResolvedValue({
        data: { block: makeStoredBlock(oldTimestamp) },
        error: null,
      })

      const block = await loadBlock('user-1')
      expect(block).not.toBeNull()
      // Supabase block (with any lastModified) beats legacy block (no lastModified = epoch)
      expect(block!.lastModified).toBe(oldTimestamp)
    })

    it('loadBlock falls back to localStorage when Supabase fails', async () => {
      localStorage.setItem(BLOCK_KEY, JSON.stringify(makeStoredBlock(oldTimestamp)))
      mockSingle.mockRejectedValue(new Error('network error'))

      const block = await loadBlock('user-1')
      expect(block).not.toBeNull()
      expect(block!.lastModified).toBe(oldTimestamp)
    })
  })

  describe('startBlock sets lastModified', () => {
    it('startBlock sets lastModified timestamp', async () => {
      const before = new Date().toISOString()
      await startBlock('accumulation', null)
      const raw = localStorage.getItem(BLOCK_KEY)
      const block = JSON.parse(raw!)
      expect(block.lastModified).toBeTruthy()
      expect(block.lastModified >= before).toBe(true)
    })
  })

  describe('isBlockExpired (ALGO-012)', () => {
    it('returns false when within phase weeks', () => {
      // accumulation = 4 weeks, block started 2 weeks ago -> not expired
      const start = new Date()
      start.setDate(start.getDate() - 14) // 2 weeks ago
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 14,
      })
      expect(isBlockExpired(block)).toBe(false)
    })

    it('returns false within 2-week grace period', () => {
      // accumulation = 4 weeks, block started 5 weeks ago -> within grace
      const start = new Date()
      start.setDate(start.getDate() - 35) // 5 weeks ago
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 35,
      })
      expect(isBlockExpired(block)).toBe(false)
    })

    it('returns false at exactly 2 weeks overdue (boundary)', () => {
      // accumulation = 4 weeks, block started 6 weeks ago -> exactly at grace limit
      const start = new Date()
      start.setDate(start.getDate() - 42) // 6 weeks ago = 4 + 2
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 42,
      })
      expect(isBlockExpired(block)).toBe(false)
    })

    it('returns true when 3+ weeks overdue', () => {
      // accumulation = 4 weeks, block started 8 weeks ago -> 4 weeks overdue
      const start = new Date()
      start.setDate(start.getDate() - 56) // 8 weeks ago
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 56,
      })
      expect(isBlockExpired(block)).toBe(true)
    })

    it('returns true for strength phase (3 weeks) when overdue', () => {
      // strength = 3 weeks, 3 + 2 grace = 5 weeks max, 6 weeks elapsed -> expired
      const start = new Date()
      start.setDate(start.getDate() - 43) // ~6.1 weeks
      const block = createTrainingBlock({
        phase: 'strength',
        startDate: start.toISOString(),
        daysElapsed: 43,
      })
      expect(isBlockExpired(block)).toBe(true)
    })
  })

  describe('getBlockExpiryInfo (ALGO-012)', () => {
    it('returns correct weeksOverdue when block is overdue', () => {
      // accumulation = 4 weeks, 8 weeks elapsed -> 4 weeks overdue
      const start = new Date()
      start.setDate(start.getDate() - 56) // 8 weeks
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 56,
      })
      const info = getBlockExpiryInfo(block)
      expect(info.expired).toBe(true)
      expect(info.weeksOverdue).toBe(4)
    })

    it('returns weeksOverdue 0 when not expired', () => {
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: new Date().toISOString(),
        daysElapsed: 0,
      })
      const info = getBlockExpiryInfo(block)
      expect(info.expired).toBe(false)
      expect(info.weeksOverdue).toBe(0)
    })

    it('returns weeksOverdue 0 within grace period', () => {
      const start = new Date()
      start.setDate(start.getDate() - 35) // 5 weeks, within 4+2 grace
      const block = createTrainingBlock({
        phase: 'accumulation',
        startDate: start.toISOString(),
        daysElapsed: 35,
      })
      const info = getBlockExpiryInfo(block)
      expect(info.expired).toBe(false)
      expect(info.weeksOverdue).toBe(0)
    })
  })
})
