/**
 * Today's Workout Generator — Zero API Cost
 *
 * Picks the best split based on recovery scores and generates
 * a complete workout using the local generator. No network calls.
 */

import { analyzeTraining, scoreSplits, getRecentSplits } from './training-analysis'
import { generateLocalWorkout } from './localWorkoutGenerator'
import { getSettings } from './settings'
import { getCurrentBlock } from './periodization'
import { buildWorkoutPreferences } from './workoutPreferences'
import type { Workout, AIWorkoutResponse, RecentSession } from '../types'

export interface TodaysWorkoutSuggestion {
  split: string
  exercises: AIWorkoutResponse['exercises']
  exerciseCount: number
  estimatedDuration: number
  reasoning: string
}

/**
 * Generate a "Today's Workout" suggestion based on the user's training
 * history, recovery status, and settings. Fully local, zero cost.
 *
 * Returns null if the user has fewer than 3 workouts (insufficient data).
 */
export function generateTodaysWorkout(workouts: Workout[]): TodaysWorkoutSuggestion | null {
  if (workouts.length < 3) return null

  const settings = getSettings()
  const muscleStatus = analyzeTraining(workouts.slice(0, 30), settings.trainingGoal || 'hypertrophy')

  // Build last workout info for split scoring (avoids recommending same split as yesterday)
  const lastWorkout = workouts[0]
  const lastWorkoutInfo = lastWorkout
    ? {
        split: lastWorkout.split,
        hoursSince: (Date.now() - new Date(lastWorkout.created_at).getTime()) / 3600000,
      }
    : null

  const recentSplits = getRecentSplits(workouts)
  const splits = scoreSplits(
    muscleStatus,
    lastWorkoutInfo,
    settings.experienceLevel || 'intermediate',
    0,
    recentSplits,
  )

  // Pick the highest-scoring split
  const bestSplit = splits[0]
  if (!bestSplit) return null

  const block = getCurrentBlock()
  const preferences = buildWorkoutPreferences(settings, block)

  // Build recent history from last 5 workouts for progressive overload
  const recentHistory: RecentSession[] = workouts.slice(0, 5).map(w => ({
    date: w.created_at,
    sets: (w.workout_sets || []).map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight_kg || 0,
      reps: s.reps || 0,
      duration_seconds: s.duration_seconds ?? null,
      rpe: s.rpe ?? null,
    })),
  }))

  const workout = generateLocalWorkout({
    muscleStatus,
    recommendedSplit: bestSplit.name,
    recentHistory,
    preferences: {
      trainingGoal: settings.trainingGoal || 'hypertrophy',
      experienceLevel: settings.experienceLevel || 'intermediate',
      equipment: settings.equipment || 'full_gym',
      bodyweight: settings.bodyweight || '80',
      time: settings.time || 60,
      energy: 'medium',
      goal: settings.goal || 'hypertrophy',
      isDeload: preferences.isDeload,
      targetRPE: preferences.targetRPE,
      targetRepRange: preferences.targetRepRange,
      focusedMuscles: settings.priorityMuscles || [],
    },
  })

  // generateLocalWorkout already handles injury filtering internally,
  // so no second filter pass is needed here. A second pass would risk
  // duplicating rehab exercises or excluding rehab exercises that match
  // their own injury's exclusion patterns.

  return {
    split: bestSplit.name,
    exercises: workout.exercises,
    exerciseCount: workout.exercises.length,
    estimatedDuration: workout.estimated_duration_min || 60,
    reasoning: bestSplit.reasoning || `${bestSplit.name} recommended based on recovery`,
  }
}
