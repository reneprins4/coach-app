/**
 * Scenario B — Vacation/Break False Positive Test
 *
 * Profile: Marcus, 34 year old, advanced, 4 weeks not trained
 * Simulated: 80 workouts, then 28-day gap, then 5 return workouts
 *
 * Validates:
 * - No plateau detected on any exercise after returning
 * - Performance forecast shows 'break' status (not 'plateau')
 * - Fatigue detector does NOT trigger on frequency drop from vacation
 */

import { describe, it, expect } from 'vitest'
import { MARCUS } from '../userProfiles'
import {
  generateLinearProgression,
  generateVacationGap,
} from '../workoutGenerator'
import { detectPlateaus } from '../../../plateauDetector'
import { detectFatigue } from '../../../fatigueDetector'
import { calculateForecast } from '../../../performanceForecast'
import type { Workout, ForecastSession } from '../../../../types'

// ---------------------------------------------------------------------------
// Data setup
// ---------------------------------------------------------------------------

/** Marcus's exercises for a Push/Pull split rotation */
const MARCUS_EXERCISES = [
  'Flat Barbell Bench Press',
  'Back Squat',
  'Barbell Row',
  'Barbell Overhead Press',
]

function generateMarcusHistory(): { all: Workout[]; beforeVacation: Workout[] } {
  // Timeline: 20 weeks training, 4 weeks vacation, 2 weeks return
  // Total span = ~26 weeks. Place everything in the past ending ~1 week ago.
  const totalWeeksBack = 26
  const beforeStart = new Date(Date.now() - totalWeeksBack * 7 * 24 * 60 * 60 * 1000)

  // Phase 1: 80 workouts over 20 weeks, 4 sessions/week, good progression
  const beforeVacation = generateLinearProgression({
    exercises: MARCUS_EXERCISES,
    weeks: 20,
    sessionsPerWeek: 4,
    startWeights: {
      'Flat Barbell Bench Press': 100,
      'Back Squat': 140,
      'Barbell Row': 80,
      'Barbell Overhead Press': 60,
    },
    weeklyIncreasePct: 0.015, // 1.5% per week (stronger growth to avoid false plateau)
    setsPerExercise: 3,
    repsPerSet: 6,
    rpe: 7.5,
    split: 'Push',
    startDate: beforeStart,
  })

  // Phase 2: 5 return workouts over ~2 weeks after 28-day break
  // Slightly lower weights (detraining effect) but progressing
  const returnStart = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000)
  const returnWorkouts = generateLinearProgression({
    exercises: MARCUS_EXERCISES,
    weeks: 2,
    sessionsPerWeek: 3,
    startWeights: {
      'Flat Barbell Bench Press': 95, // slight detraining
      'Back Squat': 130,
      'Barbell Row': 75,
      'Barbell Overhead Press': 55,
    },
    weeklyIncreasePct: 0.03,
    setsPerExercise: 3,
    repsPerSet: 6,
    rpe: 7,
    split: 'Push',
    startDate: returnStart,
  }).slice(0, 5) // only 5 return workouts

  const all = generateVacationGap(beforeVacation, 28, returnWorkouts)
  return { all, beforeVacation }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario B: Vacation/break false positive', () => {
  const { all: workouts, beforeVacation } = generateMarcusHistory()

  it('generates workouts with a gap (before + after)', () => {
    // Should have 80 before + 5 after
    expect(workouts.length).toBe(85)

    // Verify there is a gap of at least 25 days between consecutive workouts
    const dates = workouts.map(w => new Date(w.created_at).getTime()).sort((a, b) => a - b)
    let maxGap = 0
    for (let i = 1; i < dates.length; i++) {
      const gap = (dates[i]! - dates[i - 1]!) / (1000 * 60 * 60 * 24)
      maxGap = Math.max(maxGap, gap)
    }
    expect(maxGap).toBeGreaterThanOrEqual(25) // 28-day vacation gap
  })

  it('no plateau detected on any exercise after returning', () => {
    const plateaus = detectPlateaus(workouts)

    // The plateau detector should use getRecentTrainingWeeks which filters
    // out data before a >2 week gap. After the gap, Marcus only has 2 weeks
    // of return data which is < 3 weeks minimum for plateau detection.
    // Therefore no exercises should be flagged as plateau.
    const marcusPlateaus = plateaus.filter(p =>
      MARCUS_EXERCISES.some(e => p.exercise === e)
    )
    expect(marcusPlateaus.length).toBe(0)
  })

  it('performance forecast shows "break" status for pre-vacation data', () => {
    // Build ForecastSession data for bench press from ONLY the before-vacation workouts.
    // Since the before-vacation period ended >28 days ago (vacation gap),
    // the forecast should detect daysSinceLastSession > 21 and return 'break'.
    const benchSessions: ForecastSession[] = beforeVacation
      .filter(w => w.workout_sets.some(s => /bench/i.test(s.exercise)))
      .map(w => {
        const benchSets = w.workout_sets.filter(s => /bench/i.test(s.exercise))
        const bestE1rm = Math.max(
          ...benchSets.map(s => {
            const weight = s.weight_kg ?? 0
            const reps = s.reps ?? 1
            return reps === 1 ? weight : weight * (1 + reps / 30)
          })
        )
        return {
          date: w.created_at.slice(0, 10),
          fullDate: w.created_at,
          bestE1rm,
        }
      })

    expect(benchSessions.length).toBeGreaterThanOrEqual(4)

    // The last before-vacation session is > 28 days ago (vacation gap + return period)
    const lastSessionDate = new Date(benchSessions[benchSessions.length - 1]!.fullDate!)
    const daysSince = Math.floor((Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysSince).toBeGreaterThan(21)

    const forecast = calculateForecast(benchSessions)
    expect(forecast.status).toBe('break')
  })

  it('fatigue detector does NOT trigger on frequency drop from vacation', () => {
    // detectFatigue looks at the last N weeks from now.
    // With 5 return workouts in the last 2 weeks, RPE and volume are consistent.
    const fatigue = detectFatigue(workouts, 3, parseInt(MARCUS.frequency))

    // No RPE drift signals (Marcus returns with controlled RPE)
    const rpeSignals = fatigue.signals.filter(s => s.type === 'rpe_drift')
    expect(rpeSignals.length).toBe(0)

    // No volume drop signals (sets per workout are consistent)
    const volumeSignals = fatigue.signals.filter(s => s.type === 'volume_drop')
    expect(volumeSignals.length).toBe(0)
  })
})
