// ---------------------------------------------------------------------------
// MF-009: Custom PR Goals for any exercise
// Stored in localStorage with Supabase cloud sync.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

export interface PrGoal {
  exercise: string
  targetKg: number
  targetDate?: string | null
  createdAt: string
}

const STORAGE_KEY = 'kravex-pr-goals'
const MAX_GOALS = 5

export function getPrGoals(): PrGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePrGoals(goals: PrGoal[], userId?: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (e) {
    console.error('Failed to save PR goals:', e)
  }
  if (userId) {
    syncPrGoalsToCloud(userId, goals).catch(() => {})
  }
}

export function addPrGoal(goal: Omit<PrGoal, 'createdAt'>, userId?: string | null): PrGoal | null {
  const goals = getPrGoals()

  // Enforce max limit
  if (goals.length >= MAX_GOALS) return null

  // Reject duplicate exercise name
  if (goals.some(g => g.exercise === goal.exercise)) return null

  const newGoal: PrGoal = {
    ...goal,
    createdAt: new Date().toISOString(),
  }

  goals.push(newGoal)
  savePrGoals(goals, userId)
  return newGoal
}

export function removePrGoal(exercise: string, userId?: string | null): void {
  const goals = getPrGoals()
  const filtered = goals.filter(g => g.exercise !== exercise)
  savePrGoals(filtered, userId)
}

export function updatePrGoal(exercise: string, updates: Partial<Omit<PrGoal, 'createdAt'>>, userId?: string | null): void {
  const goals = getPrGoals()
  const index = goals.findIndex(g => g.exercise === exercise)
  if (index === -1) return

  goals[index] = { ...goals[index]!, ...updates }
  savePrGoals(goals, userId)
}

/**
 * Sync PR goals to Supabase (best-effort, fire-and-forget).
 */
async function syncPrGoalsToCloud(userId: string, goals: PrGoal[]): Promise<void> {
  try {
    await supabase
      .from('pr_goals')
      .upsert({
        user_id: userId,
        data: goals,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  } catch { /* best-effort sync */ }
}

/**
 * Load PR goals from Supabase, update localStorage. Falls back to localStorage on failure.
 */
export async function loadPrGoalsFromCloud(userId: string): Promise<PrGoal[]> {
  try {
    const { data } = await supabase
      .from('pr_goals')
      .select('data, updated_at')
      .eq('user_id', userId)
      .single()

    if (data?.data) {
      const cloudGoals = data.data as PrGoal[]
      // Cloud is source of truth - update localStorage
      savePrGoals(cloudGoals)
      return cloudGoals
    }
  } catch { /* fall back to localStorage */ }

  // No cloud data or error - push local data to cloud if any exists
  const local = getPrGoals()
  if (local.length > 0) {
    syncPrGoalsToCloud(userId, local).catch(() => {})
  }
  return local
}
