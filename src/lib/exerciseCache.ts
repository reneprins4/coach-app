import type { ExerciseLibraryEntry } from '../hooks/useExercises'

export const CACHE_KEY = 'kravex-exercises-cache'
export const CACHE_TIMESTAMP_KEY = 'kravex-exercises-cache-timestamp'
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function cacheExercises(exercises: ExerciseLibraryEntry[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(exercises))
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
}

export function getCachedExercises(): ExerciseLibraryEntry[] | null {
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null
  try {
    return JSON.parse(cached) as ExerciseLibraryEntry[]
  } catch {
    return null
  }
}

export function isCacheStale(): boolean {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
  if (!timestamp) return true
  return Date.now() - Number(timestamp) > CACHE_TTL_MS
}
