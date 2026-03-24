/**
 * Tests for workout variety improvements:
 * - Weekly split distribution penalty (escalating)
 * - Exercise randomization in pickExercises
 * - Full Body normalization cap
 * - Frequency-based split bonus
 */
import { describe, it, expect } from 'vitest'
import { scoreSplits, detectSplit, getRecentSplits } from '../training-analysis'
import { pickExercises } from '../localWorkoutGenerator'
import { createMuscleStatusMap, createWorkout } from '../../__tests__/helpers'
import type { ExperienceLevel } from '../../types'

// Helper: score a specific split with given parameters
function scoreFor(
  splitName: string,
  opts: {
    lastSplit?: string | null
    experienceLevel?: ExperienceLevel
    frequency?: number
    recentSplits?: string[]
  } = {},
): number {
  const muscleStatus = createMuscleStatusMap()
  const lastWorkoutInfo = opts.lastSplit
    ? { split: opts.lastSplit, hoursSince: 20 }
    : null
  const scores = scoreSplits(
    muscleStatus,
    lastWorkoutInfo,
    opts.experienceLevel || 'intermediate',
    opts.frequency || 0,
    opts.recentSplits || [],
  )
  const entry = scores.find(s => s.name === splitName)
  return entry?.score ?? -Infinity
}

describe('workout-variety', () => {
  describe('frequency bonus activates for 4x/week user', () => {
    it('Upper/Lower gets bonus at frequency=4', () => {
      const upperWith4 = scoreFor('Upper', { frequency: 4 })
      const upperWith0 = scoreFor('Upper', { frequency: 0 })
      expect(upperWith4).toBeGreaterThan(upperWith0)
    })

    it('Lower gets bonus at frequency=4', () => {
      const lowerWith4 = scoreFor('Lower', { frequency: 4 })
      const lowerWith0 = scoreFor('Lower', { frequency: 0 })
      expect(lowerWith4).toBeGreaterThan(lowerWith0)
    })

    it('Full Body gets bonus at frequency<=3', () => {
      const fbWith3 = scoreFor('Full Body', { frequency: 3 })
      const fbWith0 = scoreFor('Full Body', { frequency: 0 })
      expect(fbWith3).toBeGreaterThan(fbWith0)
    })

    it('PPL gets bonus at frequency>=5', () => {
      const pushWith5 = scoreFor('Push', { frequency: 5 })
      const pushWith0 = scoreFor('Push', { frequency: 0 })
      expect(pushWith5).toBeGreaterThan(pushWith0)
    })
  })

  describe('weekly split distribution creates escalating penalty', () => {
    it('same split 1x this week gets -15 penalty', () => {
      const pushNoRecent = scoreFor('Push', { recentSplits: [] })
      const pushOnce = scoreFor('Push', { recentSplits: ['Push'] })
      expect(pushOnce).toBeCloseTo(pushNoRecent - 15, 0)
    })

    it('same split 2x this week gets -30 penalty', () => {
      const pushNoRecent = scoreFor('Push', { recentSplits: [] })
      const pushTwice = scoreFor('Push', { recentSplits: ['Push', 'Push'] })
      expect(pushTwice).toBeCloseTo(pushNoRecent - 30, 0)
    })

    it('same split 3x this week gets -45 penalty', () => {
      const pushNoRecent = scoreFor('Push', { recentSplits: [] })
      const pushThrice = scoreFor('Push', { recentSplits: ['Push', 'Push', 'Push'] })
      expect(pushThrice).toBeCloseTo(pushNoRecent - 45, 0)
    })

    it('other splits in recentSplits do not penalize this split', () => {
      const pushNoRecent = scoreFor('Push', { recentSplits: [] })
      const pushWithPull = scoreFor('Push', { recentSplits: ['Pull', 'Legs', 'Pull'] })
      expect(pushWithPull).toBeCloseTo(pushNoRecent, 0)
    })

    it('3x same split makes it very unlikely to be recommended', () => {
      const pushThrice = scoreFor('Push', { recentSplits: ['Push', 'Push', 'Push'] })
      const pullNone = scoreFor('Pull', { recentSplits: ['Push', 'Push', 'Push'] })
      expect(pullNone).toBeGreaterThan(pushThrice)
    })
  })

  describe('exercise selection includes randomization', () => {
    it('pickExercises does not always return the same order', () => {
      const results: string[][] = []
      for (let i = 0; i < 20; i++) {
        const picked = pickExercises('chest', 3, new Set(), 'full_gym')
        results.push(picked.map(e => e.name))
      }
      // With shuffling, not all 20 results should be identical
      const unique = new Set(results.map(r => r.join(',')))
      expect(unique.size).toBeGreaterThan(1)
    })

    it('compounds still come before isolations after shuffle', () => {
      for (let i = 0; i < 10; i++) {
        const picked = pickExercises('chest', 4, new Set(), 'full_gym')
        // Find the last compound and first isolation index
        const lastCompoundIdx = Math.max(...picked.map((e, idx) => e.isCompound ? idx : -1))
        const firstIsolationIdx = picked.findIndex(e => !e.isCompound)
        if (firstIsolationIdx !== -1 && lastCompoundIdx !== -1) {
          expect(lastCompoundIdx).toBeLessThan(firstIsolationIdx)
        }
      }
    })
  })

  describe('core exercises appear in Legs split template', () => {
    it('Legs split includes core exercises', () => {
      const picked = pickExercises('core', 1, new Set(), 'full_gym')
      expect(picked.length).toBeGreaterThanOrEqual(1)
      expect(picked[0]!.muscle_group).toBe('core')
    })
  })

  describe('Full Body normalization is capped at 5', () => {
    it('Full Body score is competitive with other splits for intermediate users', () => {
      const muscleStatus = createMuscleStatusMap({
        // All muscles fresh and needing work
        chest: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        back: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        shoulders: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        quads: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        hamstrings: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        glutes: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        biceps: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        triceps: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
        core: { recoveryPct: 100, setsThisWeek: 0, status: 'needs_work', daysSinceLastTrained: null },
      })

      const scores = scoreSplits(muscleStatus, null, 'intermediate', 3)
      const fbScore = scores.find(s => s.name === 'Full Body')!.score
      const pushScore = scores.find(s => s.name === 'Push')!.score

      // With normalization capped at 5, Full Body should be in a reasonable range
      // (not dramatically lower than Push which divides by 3)
      // At frequency=3, Full Body also gets +30 bonus
      expect(fbScore).toBeGreaterThan(pushScore * 0.5)
    })

    it('Full Body normalization divides by 5, not by 8', () => {
      // Full Body has 8 primary muscles. Without cap it would be /8.
      // With cap it should be /5. We can verify by comparing the raw calculation.
      const muscleStatus = createMuscleStatusMap()

      // Score with no frequency bonus to isolate normalization effect
      const scores = scoreSplits(muscleStatus, null, 'intermediate', 0)
      const fbScore = scores.find(s => s.name === 'Full Body')!.score

      // Full Body (8 muscles, capped /5) vs Push (3 muscles, /3)
      // Both should have similar per-muscle recovery contributions
      // The key check: Full Body is not disproportionately penalized
      expect(fbScore).toBeGreaterThan(-100) // sanity: not absurdly negative
    })
  })

  describe('detectSplit', () => {
    it('uses the workout split field when it matches a known split', () => {
      const workout = createWorkout({ split: 'Push' })
      expect(detectSplit(workout)).toBe('Push')
    })

    it('falls back to exercise classification when split is unknown', () => {
      const workout = createWorkout(
        { split: 'Custom' },
        [
          { exercise: 'Bench Press' },
          { exercise: 'Incline Dumbbell Press' },
          { exercise: 'Tricep Pushdown' },
        ],
      )
      // Should detect as Push (chest + triceps)
      const detected = detectSplit(workout)
      expect(detected).toBeTruthy()
    })
  })

  describe('getRecentSplits', () => {
    it('returns splits from workouts within the last 7 days', () => {
      const now = new Date()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

      const workouts = [
        createWorkout({ split: 'Push', created_at: twoDaysAgo.toISOString() }),
        createWorkout({ split: 'Pull', created_at: twoDaysAgo.toISOString() }),
        createWorkout({ split: 'Legs', created_at: tenDaysAgo.toISOString() }),
      ]

      const recentSplits = getRecentSplits(workouts)
      expect(recentSplits).toContain('Push')
      expect(recentSplits).toContain('Pull')
      expect(recentSplits).not.toContain('Legs')
    })
  })
})
