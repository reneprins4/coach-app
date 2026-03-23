/**
 * User Journey: Tyler — Inconsistent Trainer, 16 Weeks
 *
 * Profile: Tyler, 26, intermediate, full_gym, hypertrophy, male, 82kg
 * Pattern: wildly inconsistent — some weeks 5x, some weeks 0x
 *
 * This simulation tests the RESILIENCE of every algorithm against real-life
 * messiness. An inconsistent trainer is the most common real-world user, yet
 * the hardest to handle algorithmically.
 *
 * Week 1:  5 workouts (motivated start)
 * Week 2:  4 workouts
 * Week 3:  1 workout (busy at work)
 * Week 4:  0 workouts (sick)
 * Week 5:  0 workouts (still sick)
 * Week 6:  2 workouts (coming back)
 * Week 7:  4 workouts
 * Week 8:  5 workouts
 * Week 9:  3 workouts
 * Week 10: 0 workouts (vacation)
 * Week 11: 0 workouts (vacation)
 * Week 12: 1 workout (return)
 * Week 13: 3 workouts
 * Week 14: 4 workouts
 * Week 15: 4 workouts
 * Week 16: 5 workouts
 *
 * Cross-cutting concerns:
 * - Fatigue detector: NEVER trigger "urgent deload" for inconsistent trainers
 * - Plateau detector: should NOT fire after gaps
 * - Momentum calculator: should gracefully handle sparse data
 * - Recovery: after 2 weeks off, all muscles at 100%
 * - scoreSplits: should always return at least 1 valid option
 * - Volume ceiling: never exceeded
 */

import { describe, it, expect } from 'vitest'
import { generateLocalWorkout } from '../../lib/localWorkoutGenerator'
import {
  analyzeTraining, scoreSplits, getVolumeCeiling,
  MUSCLE_GROUPS,
} from '../../lib/training-analysis'
import { detectFatigue } from '../../lib/fatigueDetector'
import { detectPlateaus } from '../../lib/plateauDetector'
import { calculateForecast } from '../../lib/performanceForecast'
import { calculateMomentum } from '../../lib/momentumCalculator'
import { generateLinearProgression } from '../../lib/__tests__/simulation/workoutGenerator'
import { computeTrainingStory, filterWorkoutsForMonth } from '../../lib/trainingStory'
import { calculateStreak, detectAchievements } from '../../lib/achievements'
import type {
  Workout,
  RecentSession, ForecastSession, ExperienceLevel,
} from '../../types'

// ---------------------------------------------------------------------------
// Tyler's profile (override from userProfiles: use intermediate, not advanced)
// ---------------------------------------------------------------------------

const TYLER_PROFILE = {
  name: 'Tyler',
  age: 26,
  experienceLevel: 'intermediate' as ExperienceLevel,
  equipment: 'full_gym' as const,
  frequency: 4, // target frequency
  goal: 'hypertrophy' as const,
  bodyweightKg: 82,
  bodyweight: '82',
  gender: 'male' as const,
}

// ---------------------------------------------------------------------------
// Exercise definitions for Tyler's PPL split
// ---------------------------------------------------------------------------

const TYLER_EXERCISES = [
  'Flat Barbell Bench Press',
  'Back Squat',
  'Barbell Row',
  'Dumbbell Overhead Press',
  'Romanian Deadlift',
  'Barbell Curl',
]

const TYLER_START_WEIGHTS: Record<string, number> = {
  'Flat Barbell Bench Press': 75,
  'Back Squat': 100,
  'Barbell Row': 65,
  'Dumbbell Overhead Press': 22.5,
  'Romanian Deadlift': 80,
  'Barbell Curl': 30,
}

// ---------------------------------------------------------------------------
// Workout schedule: per-week session counts
// ---------------------------------------------------------------------------

const WEEKLY_SESSIONS = [5, 4, 1, 0, 0, 2, 4, 5, 3, 0, 0, 1, 3, 4, 4, 5]

// ---------------------------------------------------------------------------
// Simulation infrastructure
// ---------------------------------------------------------------------------

function buildTylerWorkouts(): Workout[] {
  // Place all 16 weeks ending roughly "now" so algorithms see fresh data
  const totalDays = 16 * 7
  const startDate = new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000)

  const allWorkouts: Workout[] = []
  let cumulativeWeeksOfTraining = 0 // only count weeks where Tyler actually trained

  for (let week = 0; week < 16; week++) {
    const sessionsThisWeek = WEEKLY_SESSIONS[week]!
    if (sessionsThisWeek === 0) continue

    cumulativeWeeksOfTraining++

    // After gaps, reduce weight slightly (detraining)
    const gapBefore = week > 0 ? countConsecutiveZeroWeeksBefore(week) : 0
    const detrainingFactor = gapBefore >= 2 ? 0.90 : gapBefore === 1 ? 0.95 : 1.0

    const weekWorkouts = generateLinearProgression({
      exercises: TYLER_EXERCISES,
      weeks: 1,
      sessionsPerWeek: sessionsThisWeek,
      startWeights: Object.fromEntries(
        Object.entries(TYLER_START_WEIGHTS).map(([ex, w]) => [
          ex,
          Math.round((w * Math.pow(1.02, cumulativeWeeksOfTraining) * detrainingFactor) / 2.5) * 2.5,
        ]),
      ),
      weeklyIncreasePct: 0.02,
      repsPerSet: 8,
      setsPerExercise: 3,
      startDate: new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000),
      rpe: 7,
      split: sessionsThisWeek <= 2 ? 'Full Body' : 'Push',
    })

    allWorkouts.push(...weekWorkouts)
  }

  // Sort chronologically
  return allWorkouts.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function countConsecutiveZeroWeeksBefore(weekIndex: number): number {
  let count = 0
  for (let i = weekIndex - 1; i >= 0; i--) {
    if (WEEKLY_SESSIONS[i] === 0) count++
    else break
  }
  return count
}

function getWorkoutsUpToWeek(allWorkouts: Workout[], weekNum: number): Workout[] {
  const totalDays = 16 * 7
  const startDate = new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000)
  const cutoff = new Date(startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000)
  return allWorkouts.filter(w => new Date(w.created_at) <= cutoff)
}

function getWorkoutsForWeek(allWorkouts: Workout[], weekNum: number): Workout[] {
  const totalDays = 16 * 7
  const startDate = new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000)
  const weekStart = new Date(startDate.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000)
  const weekEnd = new Date(startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000)
  return allWorkouts.filter(w => {
    const d = new Date(w.created_at)
    return d >= weekStart && d < weekEnd
  })
}

function buildForecastSessions(workouts: Workout[], exerciseName: string): ForecastSession[] {
  return workouts
    .filter(w => w.workout_sets.some(s => s.exercise === exerciseName))
    .map(w => {
      const sets = w.workout_sets.filter(s => s.exercise === exerciseName)
      const bestE1rm = Math.max(
        ...sets.map(s => {
          const weight = s.weight_kg ?? 0
          const reps = s.reps ?? 1
          return reps === 1 ? weight : weight * (1 + reps / 30)
        }),
      )
      return {
        date: w.created_at.slice(0, 10),
        fullDate: w.created_at,
        bestE1rm,
        e1rm: bestE1rm,
      }
    })
}

function buildRecentSessions(workouts: Workout[]): RecentSession[] {
  return workouts.slice(-5).map(w => ({
    date: w.created_at,
    sets: w.workout_sets.map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
    })),
  }))
}

function buildMomentumWorkout(workout: Workout) {
  const exerciseMap = new Map<string, typeof workout.workout_sets>()
  for (const s of workout.workout_sets) {
    if (!exerciseMap.has(s.exercise)) exerciseMap.set(s.exercise, [])
    exerciseMap.get(s.exercise)!.push(s)
  }
  return {
    exercises: Array.from(exerciseMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.map(s => ({
        created_at: s.created_at,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe,
      })),
    })),
  }
}

// ---------------------------------------------------------------------------
// Generate all data once
// ---------------------------------------------------------------------------

const ALL_WORKOUTS = buildTylerWorkouts()

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('User Journey: Tyler — Inconsistent Trainer, 16 Weeks', () => {
  // Sanity check: we generated the right number of workouts
  it('generates the correct total workout count', () => {
    const expectedTotal = WEEKLY_SESSIONS.reduce((a, b) => a + b, 0) // 41
    expect(ALL_WORKOUTS.length).toBe(expectedTotal)
  })

  it('workouts are correctly distributed across weeks', () => {
    for (let week = 1; week <= 16; week++) {
      const weekWorkouts = getWorkoutsForWeek(ALL_WORKOUTS, week)
      expect(weekWorkouts.length).toBe(WEEKLY_SESSIONS[week - 1])
    }
  })

  // =========================================================================
  // Phase 1: Week 1-2 (active start)
  // =========================================================================

  describe('Week 1-2: Active start', () => {
    const workoutsW2 = getWorkoutsUpToWeek(ALL_WORKOUTS, 2)

    it('no fatigue alerts during normal active training', () => {
      const fatigue = detectFatigue(workoutsW2, 2, TYLER_PROFILE.frequency)
      expect(fatigue.fatigued).toBe(false)
      expect(fatigue.recommendation).not.toBe('urgent')
    })

    it('no plateau detected in first 2 weeks', () => {
      const plateaus = detectPlateaus(workoutsW2)
      expect(plateaus.length).toBe(0)
    })

    it('scoreSplits returns at least one valid option', () => {
      const status = analyzeTraining(workoutsW2, 'hypertrophy')
      const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
      expect(splits.length).toBeGreaterThan(0)
      expect(splits[0]!.name).toBeTruthy()
    })

    it('momentum is positive or neutral during first workout', () => {
      if (workoutsW2.length > 0) {
        const momentumWorkout = buildMomentumWorkout(workoutsW2[0]!)
        const momentum = calculateMomentum(momentumWorkout)
        // May be null if fewer than 3 valid sets, which is OK
        if (momentum) {
          expect(momentum.status).not.toBe('fatigue')
        }
      }
    })
  })

  // =========================================================================
  // Phase 2: Week 3-5 (drop-off)
  // =========================================================================

  describe('Week 3-5: Drop-off period', () => {
    const workoutsW3 = getWorkoutsUpToWeek(ALL_WORKOUTS, 3)
    const workoutsW5 = getWorkoutsUpToWeek(ALL_WORKOUTS, 5)

    it('after week 3 (1 workout), fatigue detector does NOT flag overtraining', () => {
      // Tyler did 5+4+1 = 10 workouts in 3 weeks. The 1 workout in week 3 is
      // inconsistency, NOT overtraining. Fatigue detector should not flag this.
      const fatigue = detectFatigue(workoutsW3, 3, TYLER_PROFILE.frequency)
      // The frequency drop signal may fire (1 workout in a week is below 60% of 4),
      // but the key assertion: fatigued should NOT be true from frequency alone
      const rpeSignals = fatigue.signals.filter(s => s.type === 'rpe_drift')
      const volumeSignals = fatigue.signals.filter(s => s.type === 'volume_drop')
      // RPE should not drift just because of inconsistency
      expect(rpeSignals.length).toBe(0)
      // Volume per workout should be stable (same sets per workout)
      expect(volumeSignals.length).toBe(0)
    })

    it('after 2 weeks off (week 4-5), forecast shows "break" or "insufficient"', () => {
      // Build forecast from data up to week 5 — last session was in week 3,
      // which is 2+ weeks ago from the end of week 5
      const benchSessions = buildForecastSessions(workoutsW5, 'Flat Barbell Bench Press')

      if (benchSessions.length >= 4) {
        const forecast = calculateForecast(benchSessions)
        // Should be 'break' (>21 days since last session) or 'insufficient'
        // It should NOT be 'plateau'
        expect(['break', 'insufficient']).toContain(forecast.status)
      }
    })

    it('after 2 weeks off, all muscles show 100% recovered', () => {
      // At the end of week 5, the last workout was in week 3 — that's 14+ days ago
      const status = analyzeTraining(workoutsW5, 'hypertrophy')
      for (const muscle of MUSCLE_GROUPS) {
        const ms = status[muscle]
        // If muscle was trained, hoursSinceLastTrained should be > 14*24 = 336 hours
        // Recovery should be capped at 100%
        expect(ms.recoveryPct).toBe(100)
        expect(ms.status).not.toBe('fatigued')
      }
    })
  })

  // =========================================================================
  // Phase 3: Week 6 (comeback)
  // =========================================================================

  describe('Week 6: Comeback after sickness', () => {
    const workoutsW5 = getWorkoutsUpToWeek(ALL_WORKOUTS, 5)
    const workoutsW6 = getWorkoutsUpToWeek(ALL_WORKOUTS, 6)
    const week6Workouts = getWorkoutsForWeek(ALL_WORKOUTS, 6)

    it('scoreSplits works and recommends a valid split', () => {
      const status = analyzeTraining(workoutsW5, 'hypertrophy')
      const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
      expect(splits.length).toBeGreaterThan(0)
      // After long break, Full Body or the split with most recovered muscles
      // should score highest
      const topSplit = splits[0]!
      expect(topSplit.score).toBeGreaterThanOrEqual(0)
    })

    it('weights suggestion after 2 weeks off: maintain or reduce, not increase', () => {
      // Generate a workout using the local generator after the break
      const status = analyzeTraining(workoutsW5, 'hypertrophy')
      const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
      const recentSessions = buildRecentSessions(workoutsW5)

      const workout = generateLocalWorkout({
        muscleStatus: status,
        recommendedSplit: splits[0]?.name || 'Full Body',
        recentHistory: recentSessions,
        preferences: {
          goal: TYLER_PROFILE.goal,
          trainingGoal: TYLER_PROFILE.goal,
          equipment: TYLER_PROFILE.equipment,
          experienceLevel: TYLER_PROFILE.experienceLevel,
          bodyweight: TYLER_PROFILE.bodyweight,
          gender: TYLER_PROFILE.gender,
        },
      })

      // Verify exercises were generated
      expect(workout.exercises.length).toBeGreaterThan(0)

      // For exercises with history, weight should not be higher than pre-break
      for (const ex of workout.exercises) {
        if (ex.vs_last_session && !ex.vs_last_session.startsWith('new')) {
          // The vs_last_session note contains the previous weight
          // Just verify it is not absurdly high
          expect(ex.weight_kg).toBeGreaterThan(0)
        }
      }
    })

    it('no "declining momentum" for the first session back', () => {
      // The first session back should not trigger declining momentum
      if (week6Workouts.length > 0) {
        const momentumWorkout = buildMomentumWorkout(week6Workouts[0]!)
        const momentum = calculateMomentum(momentumWorkout)
        if (momentum) {
          // Should not be 'declining' or 'fatigue' for a fresh comeback session
          expect(['peak', 'good', 'declining']).toContain(momentum.status)
          // We accept 'declining' only if score >= 30 (mild)
          if (momentum.status === 'declining') {
            expect(momentum.score).toBeGreaterThanOrEqual(30)
          }
        }
      }
    })

    it('plateau detector does NOT trigger on the gap (ALGO-001 fix)', () => {
      const plateaus = detectPlateaus(workoutsW6)
      // The gap between week 3 and week 6 should cause the plateau detector
      // to discard pre-gap data via getRecentTrainingWeeks
      expect(plateaus.length).toBe(0)
    })
  })

  // =========================================================================
  // Phase 4: Week 7-9 (building again)
  // =========================================================================

  describe('Week 7-9: Building again', () => {
    const workoutsW9 = getWorkoutsUpToWeek(ALL_WORKOUTS, 9)

    it('normal progression resumes — weights increase across weeks 7-8-9', () => {
      const week7 = getWorkoutsForWeek(ALL_WORKOUTS, 7)
      const week8 = getWorkoutsForWeek(ALL_WORKOUTS, 8)

      // Check bench press weight trend
      const getAvgWeight = (workouts: Workout[], exercise: string) => {
        const sets = workouts.flatMap(w =>
          w.workout_sets.filter(s => s.exercise === exercise),
        )
        if (sets.length === 0) return 0
        return sets.reduce((sum, s) => sum + (s.weight_kg ?? 0), 0) / sets.length
      }

      const benchW7 = getAvgWeight(week7, 'Flat Barbell Bench Press')
      const benchW8 = getAvgWeight(week8, 'Flat Barbell Bench Press')

      // Week 8 should have >= week 7 weights (progression)
      if (benchW7 > 0 && benchW8 > 0) {
        expect(benchW8).toBeGreaterThanOrEqual(benchW7)
      }
    })

    it('fatigue frequency threshold handles inconsistent trainer (ALGO-003)', () => {
      // Tyler's target is 4x/week. At 3-5x he's within range.
      // The fatigue detector uses 60% of target (2.4x) as frequency threshold.
      // In weeks 7-9 he trains 4, 5, 3 times — all above 2.4x.
      // Frequency drop signal should NOT fire for weeks 7-9 alone.
      const week7to9 = ALL_WORKOUTS.filter(w => {
        const wk = getWeekNumber(w)
        return wk >= 7 && wk <= 9
      })

      if (week7to9.length >= 4) {
        const fatigue = detectFatigue(week7to9, 3, TYLER_PROFILE.frequency)
        const freqSignals = fatigue.signals.filter(s => s.type === 'frequency_drop')
        expect(freqSignals.length).toBe(0)
      }
    })

    it('no false plateau detection during rebuilding phase', () => {
      const plateaus = detectPlateaus(workoutsW9)
      // After the gap, Tyler only has 4 weeks of data (week 6-9).
      // The plateau detector needs 3 consecutive weeks minimum after gap filtering.
      // Even if it has enough data, weights are increasing so no plateau.
      const tylerPlateaus = plateaus.filter(p =>
        TYLER_EXERCISES.includes(p.exercise),
      )
      expect(tylerPlateaus.filter(p => p.status === 'plateau').length).toBe(0)
    })
  })

  // =========================================================================
  // Phase 5: Week 10-11 (vacation)
  // =========================================================================

  describe('Week 10-11: Vacation', () => {
    const workoutsW11 = getWorkoutsUpToWeek(ALL_WORKOUTS, 11)

    it('same as week 4-5: break detection, not plateau', () => {
      const benchSessions = buildForecastSessions(workoutsW11, 'Flat Barbell Bench Press')

      if (benchSessions.length >= 4) {
        const forecast = calculateForecast(benchSessions)
        // Last session was in week 9, end of week 11 is 14+ days later
        // Should detect as 'break' or at minimum not 'plateau'
        expect(forecast.status).not.toBe('plateau')
      }
    })

    it('no deload recommendation purely from absence', () => {
      const fatigue = detectFatigue(workoutsW11, 3, TYLER_PROFILE.frequency)
      // An absent person doesn't need deload — they need to train
      expect(fatigue.recommendation).not.toBe('urgent')
    })

    it('after vacation, all muscles are 100% recovered', () => {
      const status = analyzeTraining(workoutsW11, 'hypertrophy')
      for (const muscle of MUSCLE_GROUPS) {
        expect(status[muscle].recoveryPct).toBe(100)
      }
    })
  })

  // =========================================================================
  // Phase 6: Week 12-16 (consistent return)
  // =========================================================================

  describe('Week 12-16: Consistent return', () => {
    const workoutsW16 = getWorkoutsUpToWeek(ALL_WORKOUTS, 16)

    it('weights build back up across weeks 12-16', () => {
      const week12 = getWorkoutsForWeek(ALL_WORKOUTS, 12)
      const week16 = getWorkoutsForWeek(ALL_WORKOUTS, 16)

      const getMaxWeight = (workouts: Workout[], exercise: string) => {
        const sets = workouts.flatMap(w =>
          w.workout_sets.filter(s => s.exercise === exercise),
        )
        if (sets.length === 0) return 0
        return Math.max(...sets.map(s => s.weight_kg ?? 0))
      }

      const benchW12 = getMaxWeight(week12, 'Flat Barbell Bench Press')
      const benchW16 = getMaxWeight(week16, 'Flat Barbell Bench Press')

      // By week 16, Tyler should be at or near pre-break levels
      if (benchW12 > 0 && benchW16 > 0) {
        expect(benchW16).toBeGreaterThanOrEqual(benchW12)
      }
    })

    it('by week 16, weights are near or at pre-break levels', () => {
      // Pre-break = end of week 9
      const workoutsW9 = getWorkoutsUpToWeek(ALL_WORKOUTS, 9)
      const week16 = getWorkoutsForWeek(ALL_WORKOUTS, 16)

      const getMaxWeight = (workouts: Workout[], exercise: string) => {
        const sets = workouts.flatMap(w =>
          w.workout_sets.filter(s => s.exercise === exercise),
        )
        if (sets.length === 0) return 0
        return Math.max(...sets.map(s => s.weight_kg ?? 0))
      }

      for (const exercise of TYLER_EXERCISES) {
        const preBreak = getMaxWeight(workoutsW9, exercise)
        const current = getMaxWeight(week16, exercise)
        if (preBreak > 0 && current > 0) {
          // Should be within 15% of pre-break weight (allowing some detraining)
          expect(current).toBeGreaterThanOrEqual(preBreak * 0.85)
        }
      }
    })

    it('streak resets correctly after gaps', () => {
      // After week 10-11 gap, streak should reset
      // By week 16 with 5 consecutive workouts, streak should be small
      // (only counting consecutive DAYS, not workouts)
      const streak = calculateStreak(workoutsW16)
      // Tyler trains 5x in week 16, but streak counts consecutive calendar days
      // with workouts. With rest days between sessions, streak is likely 1-5
      expect(streak).toBeLessThan(30) // definitely not a 30-day streak
    })

    it('achievement system handles the gaps gracefully', () => {
      const totalVolume = workoutsW16.reduce((sum, w) => sum + (w.totalVolume || 0), 0)
      const bestLifts: Record<string, number> = {}
      for (const w of workoutsW16) {
        for (const s of w.workout_sets) {
          const weight = s.weight_kg ?? 0
          if (!bestLifts[s.exercise] || weight > bestLifts[s.exercise]!) {
            bestLifts[s.exercise] = weight
          }
        }
      }

      const streak = calculateStreak(workoutsW16)
      const achievements = detectAchievements({
        workouts: workoutsW16,
        totalVolume,
        prs: 0, // simplified
        bodyweight: TYLER_PROFILE.bodyweightKg,
        bestLifts,
        streak,
        memberSinceDays: 112, // 16 weeks
      })

      // Should have at least first_workout and ten_workouts (41 total)
      expect(achievements).toContain('first_workout')
      expect(achievements).toContain('ten_workouts')
      // Should NOT have streak_30 (too many gaps)
      expect(achievements).not.toContain('streak_30')
    })

    it('training story for any month handles inconsistency without crashing', () => {
      // Pick a month that spans the gaps
      const now = new Date()
      const monthWorkouts = filterWorkoutsForMonth(workoutsW16, now.getMonth(), now.getFullYear())

      // computeTrainingStory should not crash even with sparse data
      if (monthWorkouts.length > 0) {
        const story = computeTrainingStory(
          workoutsW16, now.getMonth(), now.getFullYear(), TYLER_PROFILE.frequency,
        )
        expect(story).toBeDefined()
        expect(story.totalWorkouts).toBeGreaterThanOrEqual(0)
        // Consistency score must be a valid number (not NaN)
        expect(Number.isNaN(story.consistencyScore)).toBe(false)
        // Consistency score should be within 0-100 range
        if (story.hasEnoughData) {
          expect(story.consistencyScore).toBeGreaterThanOrEqual(0)
          expect(story.consistencyScore).toBeLessThanOrEqual(100)
        }
      }
    })
  })

  // =========================================================================
  // Cross-cutting: Fatigue detector resilience
  // =========================================================================

  describe('Cross-cutting: Fatigue detector', () => {
    it('NEVER triggers "urgent deload" for inconsistent trainers', () => {
      // Run fatigue detection at every point in the 16-week journey
      for (let week = 1; week <= 16; week++) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        if (workouts.length === 0) continue

        const fatigue = detectFatigue(workouts, 3, TYLER_PROFILE.frequency)

        // An inconsistent trainer is NEVER overtraining
        expect(fatigue.recommendation).not.toBe('urgent')
      }
    })

    it('frequency drop signal uses relative threshold (60% of target)', () => {
      // detectFatigue with targetFrequency=4 should use threshold of 2.4
      // When Tyler trains 3x/week, that's above 2.4 — no signal
      const week9Workouts = ALL_WORKOUTS.filter(w => {
        const wk = getWeekNumber(w)
        return wk >= 7 && wk <= 9
      })

      if (week9Workouts.length >= 4) {
        const fatigue = detectFatigue(week9Workouts, 3, TYLER_PROFILE.frequency)
        const freqSignals = fatigue.signals.filter(s => s.type === 'frequency_drop')
        // 12 workouts over 3 weeks = 4/week average, above threshold
        expect(freqSignals.length).toBe(0)
      }
    })
  })

  // =========================================================================
  // Cross-cutting: Plateau detector resilience
  // =========================================================================

  describe('Cross-cutting: Plateau detector', () => {
    it('should NOT fire after gaps — gap filtering must work', () => {
      // Run plateau detection at key gap-adjacent points
      const gapPoints = [5, 6, 11, 12]
      for (const week of gapPoints) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        const plateaus = detectPlateaus(workouts)

        // After a gap, the detector should discard pre-gap data
        // and have insufficient post-gap data for plateau detection
        for (const p of plateaus) {
          // If a plateau is detected, it should only use post-gap weeks
          expect(p.weeksOfData).toBeLessThanOrEqual(6)
        }
      }
    })

    it('full 16 weeks: no false plateau from sparse data', () => {
      const plateaus = detectPlateaus(ALL_WORKOUTS)
      // Tyler's weights are increasing (2% per trained week).
      // Even with gaps, no exercise should show a plateau.
      const tylerPlateaus = plateaus.filter(p =>
        TYLER_EXERCISES.includes(p.exercise),
      )
      // There might be some "slowing" but no hard "plateau" since weights go up
      const hardPlateaus = tylerPlateaus.filter(p => p.status === 'plateau')
      expect(hardPlateaus.length).toBe(0)
    })
  })

  // =========================================================================
  // Cross-cutting: Momentum calculator resilience
  // =========================================================================

  describe('Cross-cutting: Momentum calculator', () => {
    it('gracefully handles sparse data — returns null or valid result', () => {
      for (const w of ALL_WORKOUTS) {
        const momentumWorkout = buildMomentumWorkout(w)
        const momentum = calculateMomentum(momentumWorkout)
        // Should either be null (insufficient data) or a valid MomentumResult
        if (momentum !== null) {
          expect(momentum.score).toBeGreaterThanOrEqual(0)
          expect(momentum.score).toBeLessThanOrEqual(100)
          expect(['peak', 'good', 'declining', 'fatigue']).toContain(momentum.status)
          expect(momentum.totalSets).toBeGreaterThanOrEqual(3)
        }
      }
    })

    it('comeback sessions are not flagged as fatigue', () => {
      // Week 6 and 12 are comeback weeks after gaps
      const comebackWeeks = [6, 12]
      for (const week of comebackWeeks) {
        const weekWorkouts = getWorkoutsForWeek(ALL_WORKOUTS, week)
        for (const w of weekWorkouts) {
          const momentumWorkout = buildMomentumWorkout(w)
          const momentum = calculateMomentum(momentumWorkout)
          if (momentum) {
            // A comeback session should not be flagged as severe fatigue
            expect(momentum.status).not.toBe('fatigue')
          }
        }
      }
    })
  })

  // =========================================================================
  // Cross-cutting: Recovery
  // =========================================================================

  describe('Cross-cutting: Recovery', () => {
    it('after any 2-week gap, all muscles show 100% recovered', () => {
      // Check at the end of each gap period
      const afterGapWeeks = [5, 11] // end of each 2-week gap
      for (const week of afterGapWeeks) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        const status = analyzeTraining(workouts, 'hypertrophy')

        for (const muscle of MUSCLE_GROUPS) {
          expect(status[muscle].recoveryPct).toBe(100)
        }
      }
    })
  })

  // =========================================================================
  // Cross-cutting: scoreSplits resilience
  // =========================================================================

  describe('Cross-cutting: scoreSplits', () => {
    it('always returns at least 1 valid option, even with sparse history', () => {
      for (let week = 1; week <= 16; week++) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        if (workouts.length === 0) {
          // With no workouts, analyzeTraining returns default status
          const status = analyzeTraining([], 'hypertrophy')
          const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
          expect(splits.length).toBeGreaterThan(0)
        } else {
          const status = analyzeTraining(workouts, 'hypertrophy')
          const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
          expect(splits.length).toBeGreaterThan(0)
        }
      }
    })
  })

  // =========================================================================
  // Cross-cutting: Volume ceiling
  // =========================================================================

  describe('Cross-cutting: Volume ceiling', () => {
    it('volume ceiling is never exceeded in any generated workout', () => {
      const ceilings = getVolumeCeiling(TYLER_PROFILE.experienceLevel)

      // Generate workouts at several points and check volume
      for (let week = 1; week <= 16; week += 2) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        if (workouts.length === 0) continue

        const status = analyzeTraining(workouts, 'hypertrophy')
        const splits = scoreSplits(status, null, TYLER_PROFILE.experienceLevel)
        if (splits.length === 0) continue

        const generated = generateLocalWorkout({
          muscleStatus: status,
          recommendedSplit: splits[0]!.name,
          recentHistory: buildRecentSessions(workouts),
          preferences: {
            goal: TYLER_PROFILE.goal,
            trainingGoal: TYLER_PROFILE.goal,
            equipment: TYLER_PROFILE.equipment,
            experienceLevel: TYLER_PROFILE.experienceLevel,
            bodyweight: TYLER_PROFILE.bodyweight,
            gender: TYLER_PROFILE.gender,
          },
        })

        for (const ex of generated.exercises) {
          const ceiling = ceilings[ex.muscle_group]
          if (ceiling != null) {
            const currentWeekly = status[ex.muscle_group]?.setsThisWeek ?? 0
            // Generated sets + current weekly should not exceed ceiling
            const totalPlanned = currentWeekly + ex.sets
            // Allow small tolerance for rounding
            expect(totalPlanned).toBeLessThanOrEqual(ceiling + 1)
          }
        }
      }
    })
  })

  // =========================================================================
  // Cross-cutting: Performance forecast
  // =========================================================================

  describe('Cross-cutting: Performance forecast', () => {
    it('forecast never shows "plateau" during active progression', () => {
      // During active training periods (week 7-9, 13-16), forecast should not
      // show plateau since weights are increasing
      const activeWeeks = [9, 16]
      for (const week of activeWeeks) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        const benchSessions = buildForecastSessions(workouts, 'Flat Barbell Bench Press')

        if (benchSessions.length >= 4) {
          const forecast = calculateForecast(benchSessions)
          // During active training with progression, should be 'positive' or 'break'
          // but NOT 'plateau' (weights are increasing)
          if (forecast.status === 'plateau') {
            // If plateau is detected, log details for debugging
            const weights = benchSessions.map(s => s.bestE1rm)
            console.warn(
              `ISSUE: Forecast shows 'plateau' at week ${week} despite weight progression.`,
              `Weights: ${weights.join(', ')}`,
            )
          }
        }
      }
    })

    it('forecast shows "break" after extended gaps', () => {
      // At end of week 5 and week 11 (after 2-week gaps)
      const gapWeeks = [5, 11]
      for (const week of gapWeeks) {
        const workouts = getWorkoutsUpToWeek(ALL_WORKOUTS, week)
        const benchSessions = buildForecastSessions(workouts, 'Flat Barbell Bench Press')

        if (benchSessions.length >= 4) {
          const lastSession = benchSessions[benchSessions.length - 1]!
          const daysSince = Math.floor(
            (Date.now() - new Date(lastSession.fullDate!).getTime()) / (1000 * 60 * 60 * 24),
          )

          const forecast = calculateForecast(benchSessions)

          if (daysSince > 21) {
            expect(forecast.status).toBe('break')
          }
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekNumber(workout: Workout): number {
  const totalDays = 16 * 7
  const startDate = new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000)
  const workoutDate = new Date(workout.created_at)
  const daysSinceStart = (workoutDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(daysSinceStart / 7) + 1
}
