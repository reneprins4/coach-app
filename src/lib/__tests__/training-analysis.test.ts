/**
 * Tests for src/lib/training-analysis.ts
 */
import { describe, it, expect } from 'vitest'
import { scoreSplits } from '../training-analysis'
import { createMuscleStatusMap } from '../../__tests__/helpers'
import type { ExperienceLevel } from '../../types'

function scoreFor(
  splitName: string,
  lastSplit: string | null,
  experienceLevel: ExperienceLevel = 'intermediate',
): number {
  const muscleStatus = createMuscleStatusMap()
  const lastWorkoutInfo = lastSplit
    ? { split: lastSplit, hoursSince: 20 }
    : null
  const scores = scoreSplits(muscleStatus, lastWorkoutInfo, experienceLevel)
  const entry = scores.find(s => s.name === splitName)
  return entry?.score ?? -Infinity
}

describe('training-analysis', () => {
  describe('scoreSplits', () => {
    // --- ENGINE-009: PPL can recommend same split 2x in a row ---

    it('same split as yesterday gets a score penalty', () => {
      const pushAfterPush = scoreFor('Push', 'Push')
      const pushAfterPull = scoreFor('Push', 'Pull')
      // Doing Push after Push should score lower than Push after Pull
      expect(pushAfterPush).toBeLessThan(pushAfterPull)
    })

    it('different split than yesterday gets no penalty', () => {
      const pullAfterPush = scoreFor('Pull', 'Push')
      const pullNoHistory = scoreFor('Pull', null)
      // Pull after Push should not be penalized — score should be similar to no history
      expect(pullAfterPush).toBeCloseTo(pullNoHistory, 0)
    })
  })
})
