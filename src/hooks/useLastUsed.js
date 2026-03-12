import { useCallback } from 'react'

const LAST_USED_KEY = 'coach-app-last-used'

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Tracks the last weight used per exercise for quick-add prefill.
 */
export function useLastUsed() {
  const getLastWeight = useCallback((exerciseName) => {
    const store = getStore()
    return store[exerciseName]?.weight_kg ?? null
  }, [])

  const getLastReps = useCallback((exerciseName) => {
    const store = getStore()
    return store[exerciseName]?.reps ?? null
  }, [])

  const saveLastUsed = useCallback((exerciseName, weight_kg, reps) => {
    const store = getStore()
    store[exerciseName] = { weight_kg, reps, updatedAt: Date.now() }
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(store))
  }, [])

  return { getLastWeight, getLastReps, saveLastUsed }
}
