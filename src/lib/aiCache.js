/**
 * AI Response Cache — Supabase-backed
 *
 * Reduces Gemini API calls by caching responses in Supabase.
 * - Workout cache: per-user, 4h TTL
 * - Substitute cache: global (user-independent), 30-day TTL
 */

import { supabase } from './supabase'

/** Simple deterministic hash of an object */
function hashObject(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort())
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return (h >>> 0).toString(36)
}

/** Build a cache key for workout generation */
export function workoutCacheKey({ split, muscleStatus, preferences }) {
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
  return `workout_${hashObject(relevant)}`
}

/** Build a cache key for exercise substitutes (global — user-independent) */
export function substituteCacheKey({ exercise, reason, equipment }) {
  const key = `sub_${exercise.name.toLowerCase().replace(/\s+/g, '_')}_${reason}_${equipment || 'full_gym'}`
  return key.slice(0, 100)
}

/** Read from cache. Returns parsed response or null on miss/expired. */
export async function cacheGet(cacheKey, userId = null) {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .eq('user_id', userId)  // null-safe: both null = global
      .maybeSingle()

    if (error || !data) return null

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      // Expired — delete async, return null
      supabase.from('ai_response_cache')
        .delete()
        .eq('cache_key', cacheKey)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.warn('[aiCache] Expired entry cleanup failed:', error.message)
        })
      return null
    }

    return data.response
  } catch {
    return null
  }
}

/** Write to cache. Upserts silently on conflict. */
export async function cacheSet(cacheKey, userId = null, response, ttlHours = 4) {
  try {
    const expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

    if (!userId) {
      // For global cache (userId null), onConflict doesn't work properly with NULL values in Postgres
      // Use delete-then-insert pattern instead
      await supabase
        .from('ai_response_cache')
        .delete()
        .eq('cache_key', cacheKey)
        .is('user_id', null)
      
      await supabase
        .from('ai_response_cache')
        .insert({ cache_key: cacheKey, user_id: null, response, expires_at })
    } else {
      await supabase
        .from('ai_response_cache')
        .upsert(
          { cache_key: cacheKey, user_id: userId, response, expires_at },
          { onConflict: 'cache_key,user_id' }
        )
    }
  } catch {
    // Cache write failure is non-fatal — just log
    console.warn('[aiCache] Write failed for', cacheKey)
  }
}

/** Cleanup expired cache entries (call occasionally, e.g. on login) */
export async function cacheCleanup() {
  try {
    const { error } = await supabase
      .from('ai_response_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) {
      console.warn('[aiCache] Cache cleanup failed:', error.message)
    }
  } catch (err) {
    console.warn('[aiCache] Cache cleanup error:', err.message)
  }
}
