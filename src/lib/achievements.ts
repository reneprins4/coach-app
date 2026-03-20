/**
 * Achievements / Badges System
 *
 * Detects achievements based on workout history, PRs, volume, and streaks.
 * Stores unlocked achievement IDs in localStorage.
 */

import type { Workout } from '../types'
import { computeAllPRs } from './prDetector'

// ---- Types ----------------------------------------------------------------

export interface Achievement {
  id: string
  icon: string
  nameKey: string
  descriptionKey: string
  category: 'consistency' | 'strength' | 'volume' | 'dedication'
  check: (context: AchievementContext) => boolean
}

export interface AchievementContext {
  workouts: Workout[]
  totalVolume: number
  prs: number
  bodyweight: number
  bestLifts: Record<string, number>
  streak: number
  memberSinceDays: number
}

// ---- Achievement Registry --------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  // Consistency
  {
    id: 'first_workout',
    icon: '\uD83C\uDFAF',
    nameKey: 'achievements.first_workout',
    descriptionKey: 'achievements.first_workout_desc',
    category: 'consistency',
    check: (ctx) => ctx.workouts.length >= 1,
  },
  {
    id: 'streak_3',
    icon: '\uD83D\uDD25',
    nameKey: 'achievements.streak_3',
    descriptionKey: 'achievements.streak_3_desc',
    category: 'consistency',
    check: (ctx) => ctx.streak >= 3,
  },
  {
    id: 'streak_7',
    icon: '\uD83D\uDCAA',
    nameKey: 'achievements.streak_7',
    descriptionKey: 'achievements.streak_7_desc',
    category: 'consistency',
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'streak_30',
    icon: '\uD83D\uDC51',
    nameKey: 'achievements.streak_30',
    descriptionKey: 'achievements.streak_30_desc',
    category: 'consistency',
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'ten_workouts',
    icon: '\uD83C\uDFCB\uFE0F',
    nameKey: 'achievements.ten_workouts',
    descriptionKey: 'achievements.ten_workouts_desc',
    category: 'consistency',
    check: (ctx) => ctx.workouts.length >= 10,
  },
  {
    id: 'fifty_workouts',
    icon: '\u2B50',
    nameKey: 'achievements.fifty_workouts',
    descriptionKey: 'achievements.fifty_workouts_desc',
    category: 'consistency',
    check: (ctx) => ctx.workouts.length >= 50,
  },

  // Strength
  {
    id: 'first_pr',
    icon: '\uD83C\uDFC6',
    nameKey: 'achievements.first_pr',
    descriptionKey: 'achievements.first_pr_desc',
    category: 'strength',
    check: (ctx) => ctx.prs >= 1,
  },
  {
    id: 'ten_prs',
    icon: '\uD83E\uDD47',
    nameKey: 'achievements.ten_prs',
    descriptionKey: 'achievements.ten_prs_desc',
    category: 'strength',
    check: (ctx) => ctx.prs >= 10,
  },
  {
    id: 'bodyweight_bench',
    icon: '\uD83D\uDC8E',
    nameKey: 'achievements.bw_bench',
    descriptionKey: 'achievements.bw_bench_desc',
    category: 'strength',
    check: (ctx) => (ctx.bestLifts['Flat Barbell Bench Press'] || 0) >= ctx.bodyweight && ctx.bodyweight > 0,
  },
  {
    id: 'plate_club',
    icon: '\uD83D\uDD31',
    nameKey: 'achievements.plate_club',
    descriptionKey: 'achievements.plate_club_desc',
    category: 'strength',
    check: (ctx) => Object.values(ctx.bestLifts).some(w => w >= 100),
  },

  // Volume
  {
    id: 'volume_10k',
    icon: '\uD83D\uDCCA',
    nameKey: 'achievements.vol_10k',
    descriptionKey: 'achievements.vol_10k_desc',
    category: 'volume',
    check: (ctx) => ctx.totalVolume >= 10_000,
  },
  {
    id: 'volume_100k',
    icon: '\uD83D\uDE80',
    nameKey: 'achievements.vol_100k',
    descriptionKey: 'achievements.vol_100k_desc',
    category: 'volume',
    check: (ctx) => ctx.totalVolume >= 100_000,
  },
  {
    id: 'volume_1m',
    icon: '\uD83D\uDCAB',
    nameKey: 'achievements.vol_1m',
    descriptionKey: 'achievements.vol_1m_desc',
    category: 'volume',
    check: (ctx) => ctx.totalVolume >= 1_000_000,
  },
]

// ---- Core Functions --------------------------------------------------------

/**
 * Return IDs of all achievements that are currently met.
 */
export function detectAchievements(context: AchievementContext): string[] {
  return ACHIEVEMENTS.filter(a => a.check(context)).map(a => a.id)
}

/**
 * Return Achievement objects for newly unlocked badges (not in alreadyUnlocked).
 */
export function checkNewAchievements(
  context: AchievementContext,
  alreadyUnlocked: string[],
): Achievement[] {
  const unlocked = new Set(alreadyUnlocked)
  return ACHIEVEMENTS.filter(a => a.check(context) && !unlocked.has(a.id))
}

// ---- Streak Calculation ----------------------------------------------------

/**
 * Calculate current training streak in consecutive days.
 * A streak counts backwards from today/yesterday. If no workout today or
 * yesterday, the streak is 0.
 */
export function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0

  // Collect unique training days (YYYY-MM-DD)
  const trainingDays = new Set<string>()
  for (const w of workouts) {
    const d = new Date(w.created_at)
    trainingDays.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  // Start from today and walk backwards
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayKey = formatDateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = formatDateKey(yesterday)

  // Streak must start from today or yesterday
  if (!trainingDays.has(todayKey) && !trainingDays.has(yesterdayKey)) {
    return 0
  }

  // Walk backwards from the most recent training day
  let streak = 0
  const startDate = trainingDays.has(todayKey) ? new Date(today) : new Date(yesterday)

  const cursor = new Date(startDate)
  while (true) {
    const key = formatDateKey(cursor)
    if (trainingDays.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ---- Context Builder -------------------------------------------------------

/**
 * Build an AchievementContext from workout data.
 */
export function buildAchievementContext(
  workouts: Workout[],
  bodyweight: number,
  memberSince: string | null,
): AchievementContext {
  // Total volume
  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0)

  // PR count
  const prsMap = computeAllPRs(workouts)
  const prs = prsMap.size

  // Best lifts (best weight per exercise)
  const bestLifts: Record<string, number> = {}
  for (const w of workouts) {
    for (const s of w.workout_sets || []) {
      if (s.exercise && s.weight_kg && s.weight_kg > 0) {
        if (!bestLifts[s.exercise] || s.weight_kg > bestLifts[s.exercise]!) {
          bestLifts[s.exercise] = s.weight_kg
        }
      }
    }
  }

  // Streak
  const streak = calculateStreak(workouts)

  // Member since days
  let memberSinceDays = 0
  if (memberSince) {
    const sinceDate = new Date(memberSince)
    if (!isNaN(sinceDate.getTime())) {
      memberSinceDays = Math.floor((Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  return {
    workouts,
    totalVolume,
    prs,
    bodyweight,
    bestLifts,
    streak,
    memberSinceDays,
  }
}

// ---- localStorage Persistence ----------------------------------------------

const STORAGE_KEY = 'kravex-achievements'

/**
 * Get unlocked achievement IDs from localStorage.
 */
export function getUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as string[] : []
  } catch {
    return []
  }
}

/**
 * Save unlocked achievement IDs to localStorage.
 */
export function saveUnlockedAchievements(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage may be full or unavailable
  }
}

/**
 * Add newly unlocked achievements and return the new ones.
 */
export function syncAchievements(context: AchievementContext): Achievement[] {
  const alreadyUnlocked = getUnlockedAchievements()
  const newAchievements = checkNewAchievements(context, alreadyUnlocked)

  if (newAchievements.length > 0) {
    const updatedIds = [...alreadyUnlocked, ...newAchievements.map(a => a.id)]
    saveUnlockedAchievements(updatedIds)
  }

  return newAchievements
}
