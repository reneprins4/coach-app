// ---------------------------------------------------------------------------
// MF-009: Custom PR Goals for any exercise
// Stored in localStorage independently from UserSettings.
// Sync to Supabase can be added later if needed.
// ---------------------------------------------------------------------------

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

export function savePrGoals(goals: PrGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (e) {
    console.error('Failed to save PR goals:', e)
  }
}

export function addPrGoal(goal: Omit<PrGoal, 'createdAt'>): PrGoal | null {
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
  savePrGoals(goals)
  return newGoal
}

export function removePrGoal(exercise: string): void {
  const goals = getPrGoals()
  const filtered = goals.filter(g => g.exercise !== exercise)
  savePrGoals(filtered)
}

export function updatePrGoal(exercise: string, updates: Partial<Omit<PrGoal, 'createdAt'>>): void {
  const goals = getPrGoals()
  const index = goals.findIndex(g => g.exercise === exercise)
  if (index === -1) return

  goals[index] = { ...goals[index]!, ...updates }
  savePrGoals(goals)
}
