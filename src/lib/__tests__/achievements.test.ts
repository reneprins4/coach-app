import { describe, it, expect } from 'vitest'
import { createWorkout } from '../../__tests__/helpers'
import {
  detectAchievements,
  checkNewAchievements,
  calculateStreak,
  buildAchievementContext,
  ACHIEVEMENTS,
} from '../achievements'
import type { AchievementContext } from '../achievements'

// ---- Helper: build a minimal context with overrides ----
function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    workouts: [],
    totalVolume: 0,
    prs: 0,
    bodyweight: 80,
    bestLifts: {},
    streak: 0,
    memberSinceDays: 0,
    ...overrides,
  }
}

// ---- Helper: create workouts on specific dates ----
function workoutOnDate(daysAgo: number, sets?: Parameters<typeof createWorkout>[1]) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(12, 0, 0, 0) // normalize to noon
  return createWorkout({ created_at: date.toISOString() }, sets)
}

describe('Achievement Detection', () => {
  // ── Consistency ──────────────────────────────────────────────────────────

  it('detects "first_workout" after 1 workout', () => {
    const result = detectAchievements(ctx({ workouts: [workoutOnDate(0)] }))
    expect(result).toContain('first_workout')
  })

  it('detects "streak_3" after 3 consecutive training days', () => {
    const result = detectAchievements(ctx({ streak: 3 }))
    expect(result).toContain('streak_3')
  })

  it('detects "streak_7" after 7 consecutive training days', () => {
    const result = detectAchievements(ctx({ streak: 7 }))
    expect(result).toContain('streak_7')
  })

  it('does not detect "streak_3" with streak < 3', () => {
    const result = detectAchievements(ctx({ streak: 2 }))
    expect(result).not.toContain('streak_3')
  })

  it('detects "ten_workouts" after exactly 10 workouts', () => {
    const workouts = Array.from({ length: 10 }, (_, i) => workoutOnDate(i))
    const result = detectAchievements(ctx({ workouts }))
    expect(result).toContain('ten_workouts')
  })

  it('detects "fifty_workouts" after 50 workouts', () => {
    const workouts = Array.from({ length: 50 }, (_, i) => workoutOnDate(i % 30))
    const result = detectAchievements(ctx({ workouts }))
    expect(result).toContain('fifty_workouts')
  })

  // ── Strength ─────────────────────────────────────────────────────────────

  it('detects "first_pr" when any PR exists', () => {
    const result = detectAchievements(ctx({ prs: 1 }))
    expect(result).toContain('first_pr')
  })

  it('detects "ten_prs" after 10 different PRs', () => {
    const result = detectAchievements(ctx({ prs: 10 }))
    expect(result).toContain('ten_prs')
  })

  it('detects "bodyweight_bench" when bench PR >= bodyweight', () => {
    const result = detectAchievements(ctx({
      bodyweight: 80,
      bestLifts: { 'Flat Barbell Bench Press': 80 },
    }))
    expect(result).toContain('bodyweight_bench')
  })

  it('does not detect "bodyweight_bench" when bench < bodyweight', () => {
    const result = detectAchievements(ctx({
      bodyweight: 80,
      bestLifts: { 'Flat Barbell Bench Press': 70 },
    }))
    expect(result).not.toContain('bodyweight_bench')
  })

  it('detects "plate_club" when any lift reaches 100kg', () => {
    const result = detectAchievements(ctx({
      bestLifts: { 'Barbell Squat': 100 },
    }))
    expect(result).toContain('plate_club')
  })

  it('does not detect "plate_club" when no lift reaches 100kg', () => {
    const result = detectAchievements(ctx({
      bestLifts: { 'Barbell Squat': 95 },
    }))
    expect(result).not.toContain('plate_club')
  })

  // ── Volume ───────────────────────────────────────────────────────────────

  it('detects "volume_10k" when total volume exceeds 10000kg', () => {
    const result = detectAchievements(ctx({ totalVolume: 10000 }))
    expect(result).toContain('volume_10k')
  })

  it('does not detect "volume_10k" when total volume is below 10000kg', () => {
    const result = detectAchievements(ctx({ totalVolume: 9999 }))
    expect(result).not.toContain('volume_10k')
  })

  it('detects "volume_100k" when total volume exceeds 100000kg', () => {
    const result = detectAchievements(ctx({ totalVolume: 100000 }))
    expect(result).toContain('volume_100k')
  })

  it('detects "volume_1m" when total volume exceeds 1000000kg', () => {
    const result = detectAchievements(ctx({ totalVolume: 1000000 }))
    expect(result).toContain('volume_1m')
  })
})

describe('checkNewAchievements', () => {
  it('returns only newly unlocked badges', () => {
    const context = ctx({ workouts: [workoutOnDate(0)], prs: 1 })
    const alreadyUnlocked = ['first_workout']
    const newOnes = checkNewAchievements(context, alreadyUnlocked)
    expect(newOnes.map(a => a.id)).toContain('first_pr')
    expect(newOnes.map(a => a.id)).not.toContain('first_workout')
  })

  it('excludes already-unlocked badges', () => {
    const context = ctx({ workouts: [workoutOnDate(0)], prs: 1 })
    const alreadyUnlocked = ['first_workout', 'first_pr']
    const newOnes = checkNewAchievements(context, alreadyUnlocked)
    expect(newOnes).toHaveLength(0)
  })

  it('returns empty array when no new achievements', () => {
    const context = ctx() // nothing achieved
    const newOnes = checkNewAchievements(context, [])
    expect(newOnes).toHaveLength(0)
  })
})

describe('calculateStreak', () => {
  it('returns 0 for empty workouts', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('returns 1 when only trained today', () => {
    const workouts = [workoutOnDate(0)]
    expect(calculateStreak(workouts)).toBe(1)
  })

  it('returns 3 for three consecutive days', () => {
    const workouts = [workoutOnDate(0), workoutOnDate(1), workoutOnDate(2)]
    expect(calculateStreak(workouts)).toBe(3)
  })

  it('does not count gaps > 1 day', () => {
    // Trained today, yesterday, and 4 days ago (gap of 2 days)
    const workouts = [workoutOnDate(0), workoutOnDate(1), workoutOnDate(4)]
    expect(calculateStreak(workouts)).toBe(2)
  })

  it('counts multiple workouts on same day as 1', () => {
    const workouts = [workoutOnDate(0), workoutOnDate(0), workoutOnDate(1)]
    expect(calculateStreak(workouts)).toBe(2)
  })

  it('returns 7 for a full week streak', () => {
    const workouts = Array.from({ length: 7 }, (_, i) => workoutOnDate(i))
    expect(calculateStreak(workouts)).toBe(7)
  })

  it('returns 0 if no workout today or yesterday', () => {
    const workouts = [workoutOnDate(3), workoutOnDate(4)]
    expect(calculateStreak(workouts)).toBe(0)
  })
})

describe('buildAchievementContext', () => {
  it('computes totalVolume from all workout sets', () => {
    const workouts = [
      createWorkout({}, [
        { weight_kg: 100, reps: 5 },  // 500
        { weight_kg: 80, reps: 10 },  // 800
      ]),
    ]
    const context = buildAchievementContext(workouts, 80, null)
    expect(context.totalVolume).toBe(1300)
  })

  it('computes bestLifts across all workouts', () => {
    const workouts = [
      createWorkout({}, [
        { exercise: 'Flat Barbell Bench Press', weight_kg: 80, reps: 5 },
        { exercise: 'Flat Barbell Bench Press', weight_kg: 90, reps: 3 },
      ]),
      createWorkout({}, [
        { exercise: 'Flat Barbell Bench Press', weight_kg: 85, reps: 5 },
      ]),
    ]
    const context = buildAchievementContext(workouts, 80, null)
    expect(context.bestLifts['Flat Barbell Bench Press']).toBe(90)
  })

  it('computes streak from workout dates', () => {
    const workouts = [workoutOnDate(0), workoutOnDate(1), workoutOnDate(2)]
    const context = buildAchievementContext(workouts, 80, null)
    expect(context.streak).toBe(3)
  })

  it('computes memberSinceDays', () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const context = buildAchievementContext([], 80, thirtyDaysAgo.toISOString())
    expect(context.memberSinceDays).toBeGreaterThanOrEqual(29)
    expect(context.memberSinceDays).toBeLessThanOrEqual(31)
  })

  it('handles null memberSince gracefully', () => {
    const context = buildAchievementContext([], 80, null)
    expect(context.memberSinceDays).toBe(0)
  })
})

describe('ACHIEVEMENTS registry', () => {
  it('has unique IDs', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every achievement has required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy()
      expect(a.icon).toBeTruthy()
      expect(a.nameKey).toBeTruthy()
      expect(a.descriptionKey).toBeTruthy()
      expect(['consistency', 'strength', 'volume', 'dedication']).toContain(a.category)
      expect(typeof a.check).toBe('function')
    }
  })
})
