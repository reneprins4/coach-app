import { useMemo } from 'react'
import type { Workout, OptimalHourResult } from '../types'
import { analyzeOptimalHour, MIN_TOTAL_WORKOUTS } from '../lib/optimalHour'

export function useOptimalHour(workouts: Workout[]): OptimalHourResult | null {
  return useMemo(() => {
    if (workouts.length < MIN_TOTAL_WORKOUTS) return null
    return analyzeOptimalHour(workouts)
  }, [workouts])
}
