// ---------------------------------------------------------------------------
// Progress page helpers
// Extracted to enable testability without component rendering.
// ---------------------------------------------------------------------------

export interface ProgressTab {
  id: string
  labelKey: string
}

const ALL_TABS: ProgressTab[] = [
  { id: 'exercise', labelKey: 'progress.tab_exercise' },
  { id: 'volume',   labelKey: 'volume.tab' },
  { id: 'muscle',   labelKey: 'progress.tab_muscle' },
  { id: 'records',  labelKey: 'pr.tab' },
  { id: 'lichaam',  labelKey: 'measurements.title' },
  { id: 'analyse',  labelKey: 'progress.tab_analyse' },
  { id: 'balans',   labelKey: 'progress.tab_balance' },
  { id: 'optimal_hour', labelKey: 'progress.tab_optimal_hour' },
]

const MIN_WORKOUTS_FOR_ANALYSIS = 4
const MIN_WORKOUTS_FOR_OPTIMAL_HOUR = 20

/**
 * Returns the list of visible tabs based on the number of completed workouts.
 * Users with fewer than 4 workouts do not see Analyse or Balans tabs
 * because those views need sufficient data to be useful.
 */
export function getVisibleTabs(workoutCount: number): ProgressTab[] {
  return ALL_TABS.filter(tab => {
    if ((tab.id === 'analyse' || tab.id === 'balans') && workoutCount < MIN_WORKOUTS_FOR_ANALYSIS) {
      return false
    }
    if (tab.id === 'optimal_hour' && workoutCount < MIN_WORKOUTS_FOR_OPTIMAL_HOUR) {
      return false
    }
    return true
  })
}

/**
 * Returns the number of workouts still needed before analysis tabs unlock.
 * Returns 0 if the threshold is already met.
 */
export function workoutsUntilAnalysis(workoutCount: number): number {
  return Math.max(0, MIN_WORKOUTS_FOR_ANALYSIS - workoutCount)
}
