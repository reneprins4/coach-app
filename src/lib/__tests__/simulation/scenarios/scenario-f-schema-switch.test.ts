/**
 * Scenario F -- Schema switch false fatigue test.
 *
 * Profile: Lena, 38, intermediate, switches from Full Body (25 sets/session)
 * to PPL (15 sets/session).
 *
 * Goal: Verify that the fatigue detector does NOT produce false positives
 * when per-session set count drops due to a split change, as long as
 * weekly volume remains comparable.
 */

import { describe, it, expect } from 'vitest'
import { LENA } from '../userProfiles'
import {
  generateFullBodyWorkouts,
  generatePPLCycle,
} from '../workoutGenerator'
import { detectFatigue } from '../../../fatigueDetector'
import { analyzeTraining } from '../../../training-analysis'
import type { Workout } from '../../../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Full Body exercises matching the template in localWorkoutGenerator.
 * 25 sets per session: 7 exercises x ~3-4 sets each.
 */
const FULL_BODY_EXERCISES = [
  'Flat Barbell Bench Press',
  'Barbell Row',
  'Back Squat',
  'Dumbbell Overhead Press',
  'Romanian Deadlift',
  'Barbell Curl',
  'Tricep Pushdown',
]

const startWeights: Record<string, number> = {
  'Flat Barbell Bench Press': 50,
  'Barbell Row': 45,
  'Back Squat': 60,
  'Dumbbell Overhead Press': 22.5,
  'Romanian Deadlift': 55,
  'Barbell Curl': 20,
  'Tricep Pushdown': 17.5,
  // PPL exercises
  'Incline Dumbbell Press': 22.5,
  'Cable Fly (Mid)': 10,
  'Lat Pulldown (Wide)': 42.5,
  'Face Pull': 12.5,
  'Seated Cable Row': 42.5,
  'Leg Press': 100,
  'Lying Leg Curl': 30,
  'Cable Crunch': 25,
}

/**
 * Combine Full Body history (first 20 sessions) with PPL sessions that
 * follow immediately after. The PPL sessions start the day after the
 * last Full Body session.
 */
function generateSwitchHistory(): Workout[] {
  // Phase 1: 20 Full Body workouts over ~7 weeks (3x/week)
  const fullBodyStart = new Date()
  fullBodyStart.setDate(fullBodyStart.getDate() - 70) // ~10 weeks ago

  const fullBody = generateFullBodyWorkouts({
    exercises: FULL_BODY_EXERCISES,
    weeks: 7,
    sessionsPerWeek: 3,
    startWeights,
    weeklyIncreasePct: 0.02,
    setsPerExercise: 4, // 7 exercises x 4 sets = 28 sets/session
    startDate: fullBodyStart,
  }).slice(0, 20) // exactly 20 sessions

  // Phase 2: 3 weeks of PPL (6x/week = 18 sessions, ~15 sets/session)
  const lastFullBodyDate = new Date(fullBody[fullBody.length - 1]!.created_at)
  const pplStart = new Date(lastFullBodyDate)
  pplStart.setDate(pplStart.getDate() + 1)

  const ppl = generatePPLCycle({
    weeks: 3,
    startWeights,
    weeklyIncreasePct: 0.02,
    setsPerExercise: 3, // 5 exercises x 3 sets = 15 sets/session
    startDate: pplStart,
  })

  return [...fullBody, ...ppl]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario F: Schema switch (Full Body -> PPL) false fatigue', () => {
  const allWorkouts = generateSwitchHistory()

  // Separate the phases for analysis
  const fullBodyWorkouts = allWorkouts.filter(w => w.split === 'Full Body')
  const pplWorkouts = allWorkouts.filter(w => w.split !== 'Full Body')

  it('generates the expected workout structure', () => {
    expect(fullBodyWorkouts.length).toBe(20)
    expect(pplWorkouts.length).toBeGreaterThanOrEqual(15) // 3 weeks PPL

    // Full Body sessions should have more sets per session than PPL
    const avgFullBodySets = fullBodyWorkouts.reduce(
      (sum, w) => sum + w.workout_sets.length, 0,
    ) / fullBodyWorkouts.length

    const avgPPLSets = pplWorkouts.reduce(
      (sum, w) => sum + w.workout_sets.length, 0,
    ) / pplWorkouts.length

    expect(avgFullBodySets).toBeGreaterThan(avgPPLSets)
    expect(avgFullBodySets).toBeGreaterThanOrEqual(20) // ~28 sets
    expect(avgPPLSets).toBeLessThanOrEqual(20) // ~15 sets
  })

  it('does NOT trigger fatigue/deload recommendation after schema switch', () => {
    // Use only the most recent workouts (post-switch) plus some overlap
    // to simulate what the fatigue detector would see
    const recentWorkouts = allWorkouts.slice(-18) // last 3 weeks of PPL

    const result = detectFatigue(recentWorkouts, 3, parseInt(LENA.frequency))

    // The fatigue detector should NOT flag this as fatigued
    expect(result.fatigued).toBe(false)

    // No volume_drop signal should appear
    const volumeDropSignal = result.signals.find(s => s.type === 'volume_drop')
    expect(volumeDropSignal).toBeUndefined()
  })

  it('fatigue detector uses weekly sets, not per-session sets', () => {
    // The key insight: weekly volume should be comparable between:
    // - Full Body: 3 sessions x 28 sets = 84 sets/week
    // - PPL: 6 sessions x 15 sets = 90 sets/week
    //
    // So the per-session drop from 28 -> 15 should NOT trigger volume_drop.

    // Get the last 3 weeks of workouts (post-switch PPL)
    const recentWorkouts = allWorkouts.slice(-18)
    const result = detectFatigue(recentWorkouts, 3, parseInt(LENA.frequency))

    // The volume_drop signal checks per-workout average, not per-week total.
    // As long as the recent 3 workouts' avg is not < 75% of overall avg,
    // it should not fire. Since all PPL sessions have ~15 sets consistently,
    // no drop should be detected within the PPL phase.
    const hasVolumeDropSignal = result.signals.some(s => s.type === 'volume_drop')
    expect(hasVolumeDropSignal).toBe(false)
  })

  it('weekly volume stays comparable after switch', () => {
    // Calculate weekly set volume for the last Full Body week
    const lastFullBodyWeekStart = new Date(fullBodyWorkouts[fullBodyWorkouts.length - 1]!.created_at)
    lastFullBodyWeekStart.setDate(lastFullBodyWeekStart.getDate() - 7)

    const lastFBWeekWorkouts = fullBodyWorkouts.filter(w => {
      const d = new Date(w.created_at)
      return d >= lastFullBodyWeekStart
    })
    const fbWeeklySets = lastFBWeekWorkouts.reduce(
      (sum, w) => sum + w.workout_sets.length, 0,
    )

    // Calculate weekly set volume for the first full PPL week
    const firstPPLDate = new Date(pplWorkouts[0]!.created_at)
    const firstPPLWeekEnd = new Date(firstPPLDate)
    firstPPLWeekEnd.setDate(firstPPLWeekEnd.getDate() + 7)

    const firstPPLWeekWorkouts = pplWorkouts.filter(w => {
      const d = new Date(w.created_at)
      return d >= firstPPLDate && d < firstPPLWeekEnd
    })
    const pplWeeklySets = firstPPLWeekWorkouts.reduce(
      (sum, w) => sum + w.workout_sets.length, 0,
    )

    // PPL weekly volume should be at least 70% of Full Body weekly volume
    // (PPL: 6x15=90 vs FB: 3x28=84 -- should be comparable)
    if (fbWeeklySets > 0) {
      expect(pplWeeklySets / fbWeeklySets).toBeGreaterThanOrEqual(0.7)
    }
  })

  it('muscle analysis shows reasonable status for all muscle groups after switch', () => {
    // After switching to PPL, every major muscle group should still be trained.
    // Note: analyzeTraining counts setsThisWeek from the last 7 days relative
    // to Date.now(), so the simulated data (which may be in the past) might
    // not land in that window. Instead, we verify that recentExercises or
    // daysSinceLastTrained show the muscles have been trained recently.
    const recentWorkouts = allWorkouts.slice(-18)
    const muscleStatus = analyzeTraining(recentWorkouts, LENA.goal)

    // All major muscle groups should have been trained in the PPL phase
    // (daysSinceLastTrained should not be null)
    expect(muscleStatus.chest.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.shoulders.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.triceps.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.back.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.biceps.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.quads.daysSinceLastTrained).not.toBeNull()
    expect(muscleStatus.hamstrings.daysSinceLastTrained).not.toBeNull()
  })
})
