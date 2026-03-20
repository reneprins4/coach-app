/**
 * AI Response Cache — Supabase-backed
 *
 * Reduces Gemini API calls by caching responses in Supabase.
 * - Workout cache: per-user, 4h TTL
 * - Substitute cache: global (user-independent), 30-day TTL
 */

import { supabase } from './supabase'
import type { WorkoutCacheInput, SubstituteCacheInput } from '../types'

/** Simple deterministic hash of an object */
function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort())
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return (h >>> 0).toString(36)
}

/** Build a cache key for workout generation */
export function workoutCacheKey({ split, muscleStatus, preferences }: WorkoutCacheInput): string {
  // Only hash the parts that actually change per workout
  const relevant = {
    split,
    // Include status AND recovery buckets (rounded to nearest 20%) for meaningful cache invalidation
    muscleStates: Object.fromEntries(
      Object.entries(muscleStatus).map(([m, v]) => [
        m,
        {
          status: v.status,
          recoveryBucket: Math.round((v.recoveryPct ?? 100) / 20) * 20, // round to nearest 20%
        }
      ])
    ),
    // User preferences that affect the workout
    goal: preferences.goal,
    equipment: preferences.equipment,
    time: preferences.time,
    energy: preferences.energy,
    isDeload: preferences.isDeload,
    trainingPhase: preferences.trainingPhase,
    blockWeek: preferences.blockWeek,
    focusedMuscles: (preferences.focusedMuscles || []).sort(),
    // Include date so cache resets daily — no identical workouts two days in a row
    date: new Date().toISOString().slice(0, 10),
  }
  return `workout_${hashObject(relevant as unknown as Record<string, unknown>)}`
}

/** Build a cache key for exercise substitutes (global — user-independent) */
export function substituteCacheKey({ exercise, reason, equipment }: SubstituteCacheInput): string {
  const key = `sub_${exercise.name.toLowerCase().replace(/\s+/g, '_')}_${reason}_${equipment || 'full_gym'}`
  return key.slice(0, 100)
}

/** Read from cache. Returns parsed response or null on miss/expired. */
export async function cacheGet(cacheKey: string, userId: string | null = null): Promise<unknown> {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .eq('user_id', userId)  // null-safe: both null = global
      .maybeSingle()

    if (error || !data) return null

    // Check expiry
    if (new Date(data.expires_at as string) < new Date()) {
      // Expired — delete async, return null
      supabase.from('ai_response_cache')
        .delete()
        .eq('cache_key', cacheKey)
        .eq('user_id', userId)
        .then(({ error: deleteError }) => {
          if (deleteError) console.warn('[aiCache] Expired entry cleanup failed:', deleteError.message)
        })
      return null
    }

    return data.response
  } catch {
    return null
  }
}

/** Write to cache. Insert-or-update pattern to avoid delete-then-insert race condition. */
export async function cacheSet(cacheKey: string, userId: string | null = null, response: unknown, ttlHours: number = 4): Promise<void> {
  try {
    const expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
    const row = { cache_key: cacheKey, user_id: userId, response, expires_at }

    // Try insert first — if no existing row, this succeeds immediately (single round-trip)
    const { error: insertErr } = await supabase
      .from('ai_response_cache')
      .insert(row)

    if (insertErr) {
      // Conflict (duplicate key) — update the existing row instead
      // This avoids the race condition of delete-then-insert where a concurrent
      // read between delete and insert would see no cache entry
      const query = supabase
        .from('ai_response_cache')
        .update({ response, expires_at })
        .eq('cache_key', cacheKey)

      if (userId) {
        await query.eq('user_id', userId)
      } else {
        await query.is('user_id', null)
      }
    }
  } catch {
    // Cache write failure is non-fatal — just log
    console.warn('[aiCache] Write failed for', cacheKey)
  }
}

/** Cleanup expired cache entries (call occasionally, e.g. on login) */
export async function cacheCleanup(): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_response_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.warn('[aiCache] Cache cleanup failed:', error.message)
    }
  } catch (err) {
    console.warn('[aiCache] Cache cleanup error:', (err as Error).message)
  }
}
