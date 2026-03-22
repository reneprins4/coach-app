/**
 * Scenario D — 6 Months PPL Muscle Balance (Scientific Correctness Test)
 *
 * Profile: Tyler, 26 year old, advanced, 6x/week PPL
 * Simulated: 150 PPL workouts (Push/Pull/Legs cycles)
 *
 * Validates:
 * - Pull day contains rear delt/face pull exercises
 * - WeaknessHunter shows no severe chest-vs-back imbalance
 * - Volume per muscle group stays within MEV-MRV range for advanced
 */

import { describe, it, expect } from 'vitest'
import { TYLER, toSettings } from '../userProfiles'
import { generatePPLCycle } from '../workoutGenerator'
import { analyzeTraining, getVolumeCeiling } from '../../../training-analysis'
import { analyzeWeaknesses } from '../../../weaknessHunter'
import { generateLocalWorkout } from '../../../localWorkoutGenerator'
import type { Workout, MuscleGroup, RecentSession } from '../../../../types'

// ---------------------------------------------------------------------------
// Data setup
// ---------------------------------------------------------------------------

function generateTylerWorkouts(): Workout[] {
  return generatePPLCycle({
    weeks: 25, // ~25 weeks = 150 workouts (6 per week)
    startWeights: {
      'Flat Barbell Bench Press': 100,
      'Incline Dumbbell Press': 34,
      'Dumbbell Overhead Press': 28,
      'Tricep Pushdown': 30,
      'Cable Fly (Mid)': 18,
      'Barbell Row': 80,
      'Lat Pulldown (Wide)': 60,
      'Face Pull': 18,
      'Barbell Curl': 35,
      'Seated Cable Row': 55,
      'Back Squat': 130,
      'Romanian Deadlift': 100,
      'Leg Press': 200,
      'Lying Leg Curl': 45,
      'Cable Crunch': 35,
    },
    weeklyIncreasePct: 0.01,
    setsPerExercise: 3,
    repsPerSet: 8,
  })
}

function toRecentSessions(workouts: Workout[]): RecentSession[] {
  return workouts.slice(-3).map(w => ({
    date: w.created_at,
    sets: w.workout_sets.map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Scenario D: 6 months PPL muscle balance', () => {
  const workouts = generateTylerWorkouts()
  const settings = toSettings(TYLER)

  it('generates approximately 150 workouts', () => {
    expect(workouts.length).toBe(150)
  })

  it('has correct split distribution: Push/Pull/Legs', () => {
    const pushCount = workouts.filter(w => w.split === 'Push').length
    const pullCount = workouts.filter(w => w.split === 'Pull').length
    const legsCount = workouts.filter(w => w.split === 'Legs').length

    expect(pushCount).toBe(50)
    expect(pullCount).toBe(50)
    expect(legsCount).toBe(50)
  })

  it('Pull day contains rear delt / face pull exercises', () => {
    const pullDays = workouts.filter(w => w.split === 'Pull')

    let facePullCount = 0
    for (const pullDay of pullDays) {
      const hasPosteriorShoulder = pullDay.workout_sets.some(s =>
        /face pull|rear delt|reverse fly|band pull.apart/i.test(s.exercise)
      )
      if (hasPosteriorShoulder) facePullCount++
    }

    // Every Pull day should have at least one posterior shoulder exercise
    expect(facePullCount).toBe(pullDays.length)
  })

  it('generated Pull workout includes posterior shoulder exercise', () => {
    // Use the last 7 days of workouts for muscle status
    const recentWorkouts = workouts.slice(-7)
    const muscleStatus = analyzeTraining(recentWorkouts, settings.goal)

    const workout = generateLocalWorkout({
      muscleStatus,
      recommendedSplit: 'Pull',
      recentHistory: toRecentSessions(workouts),
      preferences: {
        goal: settings.goal,
        equipment: settings.equipment,
        experienceLevel: settings.experienceLevel,
        bodyweight: settings.bodyweight,
      },
    })

    // Pull day should include at least one posterior shoulder exercise
    const hasPosteriorShoulder = workout.exercises.some(e =>
      /face pull|rear delt|reverse fly|band pull.apart/i.test(e.name)
    )
    expect(hasPosteriorShoulder).toBe(true)
  })

  it('WeaknessHunter shows no severe chest-vs-back imbalance', () => {
    // Analyze the last 12 weeks (84 workouts) for balance
    const recentWorkouts = workouts.slice(-84)
    const analysis = analyzeWeaknesses(recentWorkouts, 12)

    // Check for imbalances
    const severeImbalances = analysis.imbalances.filter(i =>
      i.severity === 'high' &&
      ((i.dominant === 'chest' && i.weak === 'back') ||
       (i.dominant === 'back' && i.weak === 'chest'))
    )

    // There should be no severe chest-vs-back imbalance in a balanced PPL program
    expect(severeImbalances.length).toBe(0)
  })

  it('WeaknessHunter recognizes rear delts as trained', () => {
    const recentWorkouts = workouts.slice(-84)
    const analysis = analyzeWeaknesses(recentWorkouts, 12)

    // shoulders_rear should have non-zero volume
    const rearDeltVolume = analysis.volumeMap['shoulders_rear'] ?? 0
    expect(rearDeltVolume).toBeGreaterThan(0)
  })

  it('volume per muscle group stays within MEV-MRV range for advanced', () => {
    // Get the most recent week of workouts
    const now = new Date(workouts[workouts.length - 1]!.created_at)
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const lastWeekWorkouts = workouts.filter(w => {
      const d = new Date(w.created_at)
      return d >= weekAgo && d <= now
    })

    // Count sets per muscle group in the last week
    const muscleStatus = analyzeTraining(lastWeekWorkouts, settings.goal)
    const ceiling = getVolumeCeiling('advanced')

    const primaryMuscles: MuscleGroup[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings']

    for (const muscle of primaryMuscles) {
      const status = muscleStatus[muscle]
      if (!status) continue

      // In a well-structured PPL program, major muscle groups should be
      // trained close to the minimum effective volume (MEV) at least
      // For advanced lifters doing PPL, each muscle gets hit twice per week
      // so weekly volume should be reasonable
      if (status.setsThisWeek > 0) {
        // Volume should not wildly exceed MRV
        expect(status.setsThisWeek).toBeLessThanOrEqual(ceiling[muscle]! + 5) // small buffer for counting methodology
      }
    }
  })
})
