/**
 * Smart Workout Cache — localStorage-backed
 *
 * Pre-generates a Gemini workout in the background when the Dashboard loads.
 * Both Dashboard "Start" and Trainen tab consume the same cache entry.
 *
 * Cache key is a deterministic hash of everything that affects the workout:
 * split, date, workout count, injuries, equipment, goal, experience, time.
 *
 * TTL: 4 hours. Invalidated on workout finish, injury change, or settings change.
 *
 * NOTE: Two cache layers exist:
 * 1. This localStorage cache (4h TTL) — shared between Dashboard and Trainen tab
 * 2. aiCache inside generateScientificWorkout (2h TTL) — AI-specific response cache
 * Both are invalidated by invalidateWorkoutCache(). The AI cache also auto-expires.
 */

import { analyzeTraining, scoreSplits, getRecentSplits, detectSplit } from './training-analysis'
import { getSettings, parseFrequency } from './settings'
import { getCurrentBlock } from './periodization'
import { buildWorkoutPreferences } from './workoutPreferences'
import { generateScientificWorkout } from './ai'
import { loadInjuries } from './injuryRecovery'
import type { Workout, AIWorkoutResponse, MuscleStatusMap } from '../types'

// ---- Constants ----

export const CACHE_KEY = 'kravex-workout-cache'
export const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

// ---- Types ----

export interface WorkoutPreview {
  split: string
  estimatedDuration: number
  reasoning: string
  muscleContext: Array<{ muscle: string; recoveryPct: number; status: string }>
  isDeload: boolean
  trainingPhase: string | null
}

interface CachedWorkout {
  contextHash: string
  workout: AIWorkoutResponse
  cachedAt: number
}

// ---- Context Hash ----

/**
 * Build a deterministic hash string from all parameters that affect workout generation.
 * If any of these change, the cache should be invalidated (miss).
 */
export function buildContextHash(params: {
  split: string
  date: string        // YYYY-MM-DD
  // workoutCount is included as a rough proxy for training history changes.
  // The primary invalidation mechanism is invalidateWorkoutCache() called after finishWorkout.
  workoutCount: number
  injuryCount: number
  equipment: string
  trainingGoal: string
  experienceLevel: string
  time: number
  trainingPhase?: string | null
  blockWeek?: number | null
  energy?: string
  focusedMuscles?: string[]
  frequency?: number
}): string {
  const raw = `${params.split}|${params.date}|${params.workoutCount}|${params.injuryCount}|${params.equipment}|${params.trainingGoal}|${params.experienceLevel}|${params.time}|${params.trainingPhase || ''}|${params.blockWeek || 0}|${params.energy || 'medium'}|${(params.focusedMuscles || []).sort().join(',')}|${params.frequency || 4}`
  return raw
}

// ---- Cache Operations ----

/**
 * Store a generated workout in localStorage with the context hash for validation.
 */
export function cacheWorkout(contextHash: string, workout: AIWorkoutResponse): void {
  const entry: CachedWorkout = {
    contextHash,
    workout,
    cachedAt: Date.now(),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

/**
 * Retrieve a cached workout if:
 * 1. The context hash matches (same conditions)
 * 2. The entry is within TTL (4 hours)
 *
 * Returns null on miss, expiry, or corrupt data.
 */
export function getCachedWorkout(contextHash: string): AIWorkoutResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry: CachedWorkout = JSON.parse(raw)

    if (entry.contextHash !== contextHash) return null
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null

    return entry.workout
  } catch {
    return null
  }
}

/**
 * Force-invalidate the cache.
 * Call after: finishing a workout, changing injuries, changing settings.
 */
export function invalidateWorkoutCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // non-fatal
  }
}

// ---- Preview (instant, no API call) ----

/**
 * Generate a lightweight preview of today's recommended workout.
 * Uses training analysis to pick the best split and provide muscle context,
 * but does NOT generate exercises (no API call, no local generator).
 *
 * Returns null if fewer than 3 workouts (insufficient data).
 */
export function generateWorkoutPreview(workouts: Workout[], blockOverride?: import('../types').TrainingBlock | null): WorkoutPreview | null {
  if (workouts.length < 3) return null

  const settings = getSettings()
  const muscleStatus = analyzeTraining(
    workouts.slice(0, 30),
    settings.trainingGoal || 'hypertrophy',
  ) as MuscleStatusMap

  const lastWorkout = workouts[0]
  const lastWorkoutInfo = lastWorkout
    ? {
        split: lastWorkout.split || detectSplit(lastWorkout) || '',
        hoursSince: (Date.now() - new Date(lastWorkout.created_at).getTime()) / 3600000,
      }
    : null

  const recentSplits = getRecentSplits(workouts)
  const splits = scoreSplits(
    muscleStatus,
    lastWorkoutInfo,
    settings.experienceLevel || 'intermediate',
    parseFrequency(settings.frequency),
    recentSplits,
  )

  const bestSplit = splits[0]
  if (!bestSplit) return null

  const block = blockOverride !== undefined ? blockOverride : getCurrentBlock()
  const preferences = buildWorkoutPreferences(settings, block)

  // Build muscle context: relevant muscles for the split, sorted by recovery
  const splitMuscleMap: Record<string, string[]> = {
    'Push':      ['chest', 'shoulders', 'triceps', 'core'],
    'Pull':      ['back', 'biceps', 'core'],
    'Legs':      ['quads', 'hamstrings', 'glutes', 'core'],
    'Upper':     ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core'],
    'Lower':     ['quads', 'hamstrings', 'glutes', 'core'],
    'Full Body': ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'],
  }

  const relevantMuscles = splitMuscleMap[bestSplit.name] || Object.keys(muscleStatus)
  const muscleContext = relevantMuscles
    .filter(m => muscleStatus[m as keyof typeof muscleStatus])
    .map(m => {
      const ms = muscleStatus[m as keyof typeof muscleStatus]!
      return {
        muscle: m,
        recoveryPct: ms.recoveryPct ?? 100,
        status: ms.status,
      }
    })
    .sort((a, b) => a.recoveryPct - b.recoveryPct)

  return {
    split: bestSplit.name,
    estimatedDuration: settings.time || 60,
    reasoning: bestSplit.reasoning || `${bestSplit.name} recommended based on recovery`,
    muscleContext,
    isDeload: preferences.isDeload ?? false,
    trainingPhase: preferences.trainingPhase ?? null,
  }
}

// ---- Full Generation (async, Gemini + cache + fallback) ----

/**
 * Generate a complete workout with exercises.
 *
 * Flow:
 * 1. Build context from training analysis + settings + injuries
 * 2. Build context hash → check localStorage cache
 * 3. Cache hit → return instantly (no API call)
 * 4. Cache miss → call generateScientificWorkout (Gemini + local fallback)
 * 5. Cache the result → return
 */
export async function generateFullWorkout(
  workouts: Workout[],
  userId: string | null,
  overrides?: { split?: string; time?: number; energy?: string; focusedMuscles?: string[] },
): Promise<AIWorkoutResponse | null> {
  // Guard: not enough history for meaningful split recommendation
  if (workouts.length < 1) return null

  const settings = getSettings()
  const muscleStatus = analyzeTraining(
    workouts.slice(0, 30),
    settings.trainingGoal || 'hypertrophy',
  ) as MuscleStatusMap

  const lastWorkout = workouts[0]
  const lastWorkoutInfo = lastWorkout
    ? {
        split: lastWorkout.split || detectSplit(lastWorkout) || '',
        hoursSince: (Date.now() - new Date(lastWorkout.created_at).getTime()) / 3600000,
      }
    : null

  const recentSplits = getRecentSplits(workouts)
  const splits = scoreSplits(
    muscleStatus,
    lastWorkoutInfo,
    settings.experienceLevel || 'intermediate',
    parseFrequency(settings.frequency),
    recentSplits,
  )

  const recommendedSplit = overrides?.split || splits[0]?.name || 'Full Body'
  const time = overrides?.time ?? settings.time ?? 60
  const injuries = loadInjuries().filter(i => i.status !== 'resolved')
  const block = getCurrentBlock()

  // Build context hash
  const contextHash = buildContextHash({
    split: recommendedSplit,
    date: new Date().toISOString().slice(0, 10),
    workoutCount: workouts.length,
    injuryCount: injuries.length,
    equipment: settings.equipment || 'full_gym',
    trainingGoal: settings.trainingGoal || 'hypertrophy',
    experienceLevel: settings.experienceLevel || 'intermediate',
    time,
    trainingPhase: block?.phase || null,
    blockWeek: block?.currentWeek || null,
    energy: overrides?.energy || 'medium',
    focusedMuscles: overrides?.focusedMuscles || [],
    frequency: parseFrequency(settings.frequency),
  })

  // Check cache
  const cached = getCachedWorkout(contextHash)
  if (cached) {
    if (import.meta.env.DEV) console.log('[workoutCache] HIT:', contextHash)
    return cached
  }
  if (import.meta.env.DEV) console.log('[workoutCache] MISS — generating:', contextHash)

  // Generate
  const preferences = buildWorkoutPreferences(settings, block, { time })

  // Build recent history for the recommended split
  const recentHistory = workouts.slice(0, 5).map(w => ({
    date: w.created_at,
    sets: (w.workout_sets || []).map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight_kg ?? null,
      reps: s.reps ?? 0,
      rpe: s.rpe ?? null,
    })),
  }))

  const result = await generateScientificWorkout({
    muscleStatus,
    recommendedSplit,
    recentHistory,
    preferences,
    userId,
    workouts,
  })

  // Cache the result
  cacheWorkout(contextHash, result)

  return result
}
