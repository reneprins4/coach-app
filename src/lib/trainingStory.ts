/**
 * Training Story Data Engine
 *
 * Computes all statistics for a Spotify Wrapped-style monthly training recap.
 * All computation functions are pure (no side effects) for easy testing.
 */

import type { Workout } from '../types'
import { classifyExercise } from './training-analysis'
import { getSplitColor } from './calendarUtils'
import { calculateE1RM } from './prDetector'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PRInMonth {
  exercise: string
  previousBest: number
  newBest: number
  improvement: number
  type: 'weight' | 'volume'
}

export interface MonthComparison {
  volumeChange: number      // percentage
  workoutsChange: number    // absolute
  setsChange: number        // absolute
  direction: 'up' | 'down' | 'stable'
}

export type TrainingPersonality =
  | 'consistent'
  | 'powerhouse'
  | 'volume'
  | 'allrounder'
  | 'persistent'

export interface TrainingStoryData {
  month: number
  year: number

  totalWorkouts: number
  totalVolume: number
  totalSets: number
  totalTimeMinutes: number

  currentStreak: number
  longestStreakInMonth: number
  consistencyScore: number
  trainingDays: string[]

  prsThisMonth: PRInMonth[]

  volumeTrend: MonthComparison
  previousMonthVolume: number

  favoriteExercise: { name: string; totalSets: number } | null
  mostTrainedMuscle: { name: string; sets: number } | null

  splitDistribution: { split: string; count: number; color: string }[]

  heaviestSet: { exercise: string; weight: number; reps: number } | null
  mostRepsSet: { exercise: string; reps: number; weight: number } | null
  longestWorkoutMinutes: number | null
  shortestWorkoutMinutes: number | null

  comparison: MonthComparison
  personality: TrainingPersonality
  hasEnoughData: boolean
}

export interface PersonalityInput {
  consistencyScore: number
  prsCount: number
  totalSets: number
  volumeDirection: 'up' | 'down' | 'stable'
  splitDistribution: { split: string; count: number; color: string }[]
}

export interface StoryState {
  viewed: boolean
  month: number
  year: number
  viewedAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWorkoutDurationMinutes(w: Workout): number | null {
  if (!w.completed_at || !w.created_at) return null
  const start = new Date(w.created_at).getTime()
  const end = new Date(w.completed_at).getTime()
  if (isNaN(start) || isNaN(end) || end <= start) return null
  return Math.round((end - start) / 60000)
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filter workouts to only those within a given month.
 * @param month 0-indexed (0 = January, 1 = February, etc.)
 */
export function filterWorkoutsForMonth(
  workouts: Workout[],
  month: number,
  year: number,
): Workout[] {
  return workouts.filter(w => {
    const d = new Date(w.created_at)
    return d.getMonth() === month && d.getFullYear() === year
  })
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function computeOverview(workouts: Workout[]): {
  totalWorkouts: number
  totalVolume: number
  totalSets: number
  totalTimeMinutes: number
} {
  let totalVolume = 0
  let totalSets = 0
  let totalTimeMinutes = 0

  for (const w of workouts) {
    totalVolume += w.totalVolume || 0
    totalSets += (w.workout_sets || []).length
    const duration = getWorkoutDurationMinutes(w)
    if (duration !== null) totalTimeMinutes += duration
  }

  return {
    totalWorkouts: workouts.length,
    totalVolume,
    totalSets,
    totalTimeMinutes,
  }
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

/**
 * Compute consistency score as percentage of expected workouts completed.
 * @param month 0-indexed
 */
export function computeConsistencyScore(
  workouts: Workout[],
  weeklyFrequency: number,
  month: number,
  year: number,
): number {
  // Calculate weeks in month
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const weeksInMonth = daysInMonth / 7

  const expectedWorkouts = Math.round(weeksInMonth * weeklyFrequency)
  if (expectedWorkouts <= 0) return 100

  const filtered = filterWorkoutsForMonth(workouts, month, year)
  const score = Math.min(100, Math.round((filtered.length / expectedWorkouts) * 100))
  return score
}

/**
 * Compute the longest streak of consecutive training days within the given workouts.
 */
export function computeLongestStreakInMonth(workouts: Workout[]): number {
  if (workouts.length === 0) return 0

  // Collect unique training day keys
  const daySet = new Set<string>()
  for (const w of workouts) {
    const d = new Date(w.created_at)
    daySet.add(formatDateKey(d))
  }

  // Sort day keys
  const sortedDays = Array.from(daySet).sort()
  if (sortedDays.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]!)
    const curr = new Date(sortedDays[i]!)
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = Math.round(diffMs / 86400000)

    if (diffDays === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }

  return longest
}

// ---------------------------------------------------------------------------
// PRs
// ---------------------------------------------------------------------------

/**
 * Detect Personal Records achieved in the current month's workouts
 * by comparing against all previous workouts.
 */
export function computePRsInMonth(
  currentMonthWorkouts: Workout[],
  previousWorkouts: Workout[],
): PRInMonth[] {
  const prs: PRInMonth[] = []

  // Build historical bests from previous workouts
  // Key: exercise name (lowercase), Value: { bestWeight, bestVolume (w*r), bestE1RM }
  const historicalBests = new Map<string, { bestWeight: number; bestE1RM: number }>()

  for (const w of previousWorkouts) {
    for (const s of w.workout_sets || []) {
      if (!s.exercise || !s.weight_kg || s.weight_kg <= 0 || !s.reps || s.reps <= 0) continue
      const key = s.exercise.toLowerCase()
      const e1rm = calculateE1RM(s.weight_kg, s.reps)
      const existing = historicalBests.get(key)
      if (!existing) {
        historicalBests.set(key, { bestWeight: s.weight_kg, bestE1RM: e1rm })
      } else {
        if (s.weight_kg > existing.bestWeight) existing.bestWeight = s.weight_kg
        if (e1rm > existing.bestE1RM) existing.bestE1RM = e1rm
      }
    }
  }

  // Track PRs already found in this month (avoid duplicates per exercise)
  const foundPRs = new Set<string>()

  // Also build running bests within current month to detect progressive PRs
  const currentMonthBests = new Map<string, { bestWeight: number; bestE1RM: number }>()

  // Sort current month workouts by date ascending
  const sorted = [...currentMonthWorkouts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  for (const w of sorted) {
    for (const s of w.workout_sets || []) {
      if (!s.exercise || !s.weight_kg || s.weight_kg <= 0 || !s.reps || s.reps <= 0) continue
      const key = s.exercise.toLowerCase()
      const e1rm = calculateE1RM(s.weight_kg, s.reps)
      const historical = historicalBests.get(key)
      const monthBest = currentMonthBests.get(key)

      if (!foundPRs.has(key) && historical) {
        // Weight PR
        if (s.weight_kg > historical.bestWeight) {
          prs.push({
            exercise: s.exercise,
            previousBest: historical.bestWeight,
            newBest: s.weight_kg,
            improvement: Math.round((s.weight_kg - historical.bestWeight) * 10) / 10,
            type: 'weight',
          })
          foundPRs.add(key)
        }
        // e1RM PR (volume-based)
        else if (e1rm > historical.bestE1RM) {
          prs.push({
            exercise: s.exercise,
            previousBest: Math.round(historical.bestE1RM * 10) / 10,
            newBest: Math.round(e1rm * 10) / 10,
            improvement: Math.round((e1rm - historical.bestE1RM) * 10) / 10,
            type: 'volume',
          })
          foundPRs.add(key)
        }
      }

      // Update current month running bests
      if (!monthBest) {
        currentMonthBests.set(key, { bestWeight: s.weight_kg, bestE1RM: e1rm })
      } else {
        if (s.weight_kg > monthBest.bestWeight) monthBest.bestWeight = s.weight_kg
        if (e1rm > monthBest.bestE1RM) monthBest.bestE1RM = e1rm
      }
    }
  }

  return prs
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export function computeFavoriteExercise(
  workouts: Workout[],
): { name: string; totalSets: number } | null {
  const counts = new Map<string, number>()

  for (const w of workouts) {
    for (const s of w.workout_sets || []) {
      if (!s.exercise) continue
      counts.set(s.exercise, (counts.get(s.exercise) || 0) + 1)
    }
  }

  if (counts.size === 0) return null

  let bestName = ''
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      bestName = name
      bestCount = count
    }
  }

  return { name: bestName, totalSets: bestCount }
}

export function computeMostTrainedMuscle(
  workouts: Workout[],
): { name: string; sets: number } | null {
  const muscleSets = new Map<string, number>()

  for (const w of workouts) {
    for (const s of w.workout_sets || []) {
      const muscle = classifyExercise(s.exercise)
      if (muscle) {
        muscleSets.set(muscle, (muscleSets.get(muscle) || 0) + 1)
      }
    }
  }

  if (muscleSets.size === 0) return null

  let bestMuscle = ''
  let bestCount = 0
  for (const [muscle, count] of muscleSets) {
    if (count > bestCount) {
      bestMuscle = muscle
      bestCount = count
    }
  }

  return { name: bestMuscle, sets: bestCount }
}

// ---------------------------------------------------------------------------
// Split distribution
// ---------------------------------------------------------------------------

export function computeSplitDistribution(
  workouts: Workout[],
): { split: string; count: number; color: string }[] {
  const counts = new Map<string, number>()

  for (const w of workouts) {
    const split = w.split || 'Unknown'
    counts.set(split, (counts.get(split) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([split, count]) => ({
      split,
      count,
      color: getSplitColor(split),
    }))
    .sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// Fun stats
// ---------------------------------------------------------------------------

export function computeFunStats(workouts: Workout[]): {
  heaviestSet: { exercise: string; weight: number; reps: number } | null
  mostRepsSet: { exercise: string; reps: number; weight: number } | null
  longestWorkoutMinutes: number | null
  shortestWorkoutMinutes: number | null
} {
  let heaviestSet: { exercise: string; weight: number; reps: number } | null = null
  let mostRepsSet: { exercise: string; reps: number; weight: number } | null = null
  let longestWorkoutMinutes: number | null = null
  let shortestWorkoutMinutes: number | null = null

  for (const w of workouts) {
    // Duration
    const duration = getWorkoutDurationMinutes(w)
    if (duration !== null) {
      if (longestWorkoutMinutes === null || duration > longestWorkoutMinutes) {
        longestWorkoutMinutes = duration
      }
      if (shortestWorkoutMinutes === null || duration < shortestWorkoutMinutes) {
        shortestWorkoutMinutes = duration
      }
    }

    // Sets
    for (const s of w.workout_sets || []) {
      const weight = s.weight_kg ?? 0
      const reps = s.reps ?? 0

      if (heaviestSet === null || weight > heaviestSet.weight) {
        heaviestSet = { exercise: s.exercise, weight, reps }
      }

      if (mostRepsSet === null || reps > mostRepsSet.reps) {
        mostRepsSet = { exercise: s.exercise, reps, weight }
      }
    }
  }

  return { heaviestSet, mostRepsSet, longestWorkoutMinutes, shortestWorkoutMinutes }
}

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

export function computePersonality(input: PersonalityInput): TrainingPersonality {
  // Priority order: consistent > powerhouse > volume > allrounder > persistent
  if (input.consistencyScore >= 85) return 'consistent'
  if (input.prsCount >= 3) return 'powerhouse'
  if (input.volumeDirection === 'up' && input.totalSets > 100) return 'volume'

  // Allrounder: 3+ different splits, none > 50% of total
  if (input.splitDistribution.length >= 3) {
    const totalCount = input.splitDistribution.reduce((sum, d) => sum + d.count, 0)
    const maxPct = totalCount > 0
      ? Math.max(...input.splitDistribution.map(d => d.count / totalCount))
      : 1
    if (maxPct <= 0.5) return 'allrounder'
  }

  return 'persistent'
}

// ---------------------------------------------------------------------------
// Month comparison
// ---------------------------------------------------------------------------

function computeComparison(
  currentWorkouts: Workout[],
  previousWorkouts: Workout[],
): MonthComparison {
  const currentOverview = computeOverview(currentWorkouts)
  const previousOverview = computeOverview(previousWorkouts)

  const volumeChange = previousOverview.totalVolume > 0
    ? Math.round(((currentOverview.totalVolume - previousOverview.totalVolume) / previousOverview.totalVolume) * 100)
    : 0

  const workoutsChange = currentOverview.totalWorkouts - previousOverview.totalWorkouts
  const setsChange = currentOverview.totalSets - previousOverview.totalSets

  let direction: 'up' | 'down' | 'stable'
  if (volumeChange > 5) direction = 'up'
  else if (volumeChange < -5) direction = 'down'
  else direction = 'stable'

  return { volumeChange, workoutsChange, setsChange, direction }
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

/**
 * Compute the full Training Story data for a given month.
 * @param allWorkouts All user workouts (sorted desc by created_at)
 * @param month 0-indexed (0 = January)
 * @param year Full year
 * @param weeklyFrequency User's target workouts per week
 */
export function computeTrainingStory(
  allWorkouts: Workout[],
  month: number,
  year: number,
  weeklyFrequency: number,
): TrainingStoryData {
  const currentMonthWorkouts = filterWorkoutsForMonth(allWorkouts, month, year)

  // Previous month
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const previousMonthWorkouts = filterWorkoutsForMonth(allWorkouts, prevMonth, prevYear)

  // All workouts before current month (for PR comparison)
  const currentMonthStart = new Date(year, month, 1)
  const previousWorkouts = allWorkouts.filter(
    w => new Date(w.created_at) < currentMonthStart,
  )

  const hasEnoughData = currentMonthWorkouts.length >= 3
  const overview = computeOverview(currentMonthWorkouts)

  // Training days
  const trainingDaySet = new Set<string>()
  for (const w of currentMonthWorkouts) {
    trainingDaySet.add(formatDateKey(new Date(w.created_at)))
  }
  const trainingDays = Array.from(trainingDaySet).sort()

  // Consistency & streaks
  const consistencyScore = computeConsistencyScore(
    currentMonthWorkouts, weeklyFrequency, month, year,
  )
  const longestStreakInMonth = computeLongestStreakInMonth(currentMonthWorkouts)

  // Current streak (computed from all workouts, not just the month)
  const currentStreak = computeLongestStreakInMonth(currentMonthWorkouts) // Simplified for month scope

  // PRs
  const prsThisMonth = computePRsInMonth(currentMonthWorkouts, previousWorkouts)

  // Favorites
  const favoriteExercise = computeFavoriteExercise(currentMonthWorkouts)
  const mostTrainedMuscle = computeMostTrainedMuscle(currentMonthWorkouts)

  // Split distribution
  const splitDistribution = computeSplitDistribution(currentMonthWorkouts)

  // Fun stats
  const funStats = computeFunStats(currentMonthWorkouts)

  // Comparison
  const comparison = computeComparison(currentMonthWorkouts, previousMonthWorkouts)
  const previousMonthOverview = computeOverview(previousMonthWorkouts)

  // Personality
  const personality = computePersonality({
    consistencyScore,
    prsCount: prsThisMonth.length,
    totalSets: overview.totalSets,
    volumeDirection: comparison.direction,
    splitDistribution,
  })

  return {
    month,
    year,

    totalWorkouts: overview.totalWorkouts,
    totalVolume: overview.totalVolume,
    totalSets: overview.totalSets,
    totalTimeMinutes: overview.totalTimeMinutes,

    currentStreak,
    longestStreakInMonth,
    consistencyScore,
    trainingDays,

    prsThisMonth,

    volumeTrend: comparison,
    previousMonthVolume: previousMonthOverview.totalVolume,

    favoriteExercise,
    mostTrainedMuscle,

    splitDistribution,

    heaviestSet: funStats.heaviestSet,
    mostRepsSet: funStats.mostRepsSet,
    longestWorkoutMinutes: funStats.longestWorkoutMinutes,
    shortestWorkoutMinutes: funStats.shortestWorkoutMinutes,

    comparison,
    personality,
    hasEnoughData,
  }
}

// ---------------------------------------------------------------------------
// State management (localStorage)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kravex-training-story'

function getStorageData(): Record<string, { viewedAt: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, { viewedAt: string }> : {}
  } catch {
    return {}
  }
}

function storyKey(month: number, year: number): string {
  return `${year}-${month}`
}

/**
 * Mark a Training Story as viewed for a specific month.
 */
export function markStoryViewed(month: number, year: number): void {
  try {
    const data = getStorageData()
    data[storyKey(month, year)] = { viewedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Check if a Training Story has been viewed.
 */
export function isStoryViewed(month: number, year: number): boolean {
  const data = getStorageData()
  return storyKey(month, year) in data
}

/**
 * Get full state for a Training Story.
 */
export function getStoryState(month: number, year: number): StoryState {
  const data = getStorageData()
  const entry = data[storyKey(month, year)]
  return {
    viewed: !!entry,
    month,
    year,
    viewedAt: entry?.viewedAt ?? null,
  }
}
