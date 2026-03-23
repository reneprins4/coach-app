/**
 * Periodization engine — 4-week training blocks
 * Phases: accumulation -> intensification -> strength -> deload (auto)
 */

import { supabase } from './supabase'
import type { PeriodizationPhase, PhaseConfig, WeekTarget, TrainingBlock, BlockProgress } from '../types'

const BLOCK_KEY = 'coach-training-block'

export const PHASES: Record<PeriodizationPhase, PhaseConfig> = {
  accumulation: {
    label: 'Opbouw',
    labelKey: 'phases.accumulation',
    weeks: 4,
    description: 'Bouw wekelijks volume op, matige intensiteit. Basisfase.',
    descriptionKey: 'phases.accumulation_desc',
    color: 'blue',
    weekTargets: [
      { week: 1, rpe: 7,   repRange: [10, 12], setNote: 'Basisvolume',     isDeload: false },
      { week: 2, rpe: 7.5, repRange: [10, 12], setNote: '+1 set per spiergroep',   isDeload: false },
      { week: 3, rpe: 8,   repRange: [10, 12], setNote: '+2 sets per spiergroep',  isDeload: false },
      { week: 4, rpe: 5,   repRange: [10, 12], setNote: 'Deload — 40% volume', isDeload: true  },
    ],
  },
  intensification: {
    label: 'Intensivering',
    labelKey: 'phases.intensification',
    weeks: 4,
    description: 'Verhoog intensiteit en belasting. Minder herhalingen, zwaardere gewichten.',
    descriptionKey: 'phases.intensification_desc',
    color: 'orange',
    weekTargets: [
      { week: 1, rpe: 7.5, repRange: [6, 8], setNote: 'Basisvolume',    isDeload: false },
      { week: 2, rpe: 8,   repRange: [6, 8], setNote: '+1 set per spiergroep',  isDeload: false },
      { week: 3, rpe: 8.5, repRange: [5, 6], setNote: 'Push — zware sets',  isDeload: false },
      { week: 4, rpe: 5,   repRange: [6, 8], setNote: 'Deload — 40% volume',isDeload: true  },
    ],
  },
  strength: {
    label: 'Kracht Piek',
    labelKey: 'phases.strength',
    weeks: 3,
    description: 'Maximale krachtexpressie. Test je grenzen.',
    descriptionKey: 'phases.strength_desc',
    color: 'red',
    weekTargets: [
      { week: 1, rpe: 8,   repRange: [3, 5], setNote: 'Zware compound oefeningen',  isDeload: false },
      { week: 2, rpe: 9,   repRange: [2, 4], setNote: 'Bijna-max inspanning',  isDeload: false },
      { week: 3, rpe: 5,   repRange: [3, 5], setNote: 'Deload — herstel voor volgende cyclus', isDeload: true  },
    ],
  },
  deload: {
    label: 'Deload',
    labelKey: 'phases.deload',
    weeks: 1,
    description: 'Volledige herstelweek. Zelfde bewegingen, veel minder volume.',
    descriptionKey: 'phases.deload_desc',
    color: 'gray',
    weekTargets: [
      { week: 1, rpe: 5, repRange: [10, 12], setNote: '2-3 sets alleen, niet forceren', isDeload: true },
    ],
  },
}

interface StoredBlock {
  id: string
  phase: PeriodizationPhase
  startDate: string
  createdAt: string
  fullPlan: unknown
  lastModified: string
}

export function getCurrentBlock(_userId?: string): TrainingBlock | null {
  try {
    const raw = localStorage.getItem(BLOCK_KEY)
    if (!raw) return null
    const block = JSON.parse(raw) as StoredBlock
    // Validate block structure - clear corrupted data
    if (!block?.startDate || !block?.phase || !PHASES[block.phase]) {
      localStorage.removeItem(BLOCK_KEY)
      return null
    }
    // Calculate which week we're in
    const startDate = new Date(block.startDate)
    const now = new Date()
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / 86400000)
    const currentWeek = Math.min(
      Math.floor(daysElapsed / 7) + 1,
      PHASES[block.phase]?.weeks || 4
    )
    return { ...block, lastModified: block.lastModified || '', currentWeek, daysElapsed }
  } catch {
    localStorage.removeItem(BLOCK_KEY)  // clear corrupted data
    return null
  }
}

// Laad trainingsblok van Supabase, val terug op localStorage.
// Compares lastModified timestamps to resolve multi-device conflicts (DATA-002).
export async function loadBlock(userId: string | null): Promise<TrainingBlock | null> {
  if (userId) {
    try {
      const { data } = await supabase
        .from('training_blocks')
        .select('block')
        .eq('user_id', userId)
        .single()

      const cloudBlock = data?.block as StoredBlock | null
      const localRaw = localStorage.getItem(BLOCK_KEY)
      const localBlock = localRaw ? JSON.parse(localRaw) as StoredBlock : null

      if (cloudBlock && localBlock) {
        // Compare timestamps — missing lastModified treated as epoch (very old)
        const cloudTime = new Date(cloudBlock.lastModified || '1970-01-01').getTime()
        const localTime = new Date(localBlock.lastModified || '1970-01-01').getTime()

        if (localTime > cloudTime) {
          // localStorage is newer — push it to Supabase
          try {
            await supabase
              .from('training_blocks')
              .upsert({ user_id: userId, block: localBlock, updated_at: new Date().toISOString() })
          } catch { /* best-effort sync */ }
        } else {
          // Supabase is newer or equal — update localStorage
          localStorage.setItem(BLOCK_KEY, JSON.stringify(cloudBlock))
        }
      } else if (cloudBlock) {
        // Only cloud has data — sync to localStorage
        localStorage.setItem(BLOCK_KEY, JSON.stringify(cloudBlock))
      }
    } catch { /* val terug op localStorage */ }
  }
  return getCurrentBlock()
}

export async function startBlock(phase: PeriodizationPhase, userId: string | null, fullPlan: unknown = null): Promise<StoredBlock> {
  const now = new Date().toISOString()
  const block: StoredBlock = {
    id: crypto.randomUUID(),
    phase,
    startDate: now,
    createdAt: now,
    fullPlan: fullPlan || null,
    lastModified: now,
  }
  localStorage.setItem(BLOCK_KEY, JSON.stringify(block))

  if (userId) {
    try {
      await supabase
        .from('training_blocks')
        .upsert({ user_id: userId, block, updated_at: new Date().toISOString() })
    } catch { /* localStorage is backup */ }
  }

  return block
}

export async function clearBlock(userId: string | null): Promise<void> {
  localStorage.removeItem(BLOCK_KEY)

  if (userId) {
    try {
      await supabase
        .from('training_blocks')
        .delete()
        .eq('user_id', userId)
    } catch { /* ignore */ }
  }
}

const GRACE_PERIOD_WEEKS = 2

/**
 * Returns true when elapsed weeks exceed phase.weeks + grace period (2 weeks).
 * A block that ran for 8 weeks on a 4-week phase is expired (4 weeks overdue > 2 week grace).
 */
export function isBlockExpired(block: TrainingBlock): boolean {
  const phase = PHASES[block.phase]
  if (!phase) return false
  const elapsedWeeks = Math.floor(block.daysElapsed / 7)
  return elapsedWeeks > phase.weeks + GRACE_PERIOD_WEEKS
}

/**
 * Returns expiry info: whether the block is expired and how many weeks overdue.
 */
export function getBlockExpiryInfo(block: TrainingBlock): { expired: boolean; weeksOverdue: number } {
  const phase = PHASES[block.phase]
  if (!phase) return { expired: false, weeksOverdue: 0 }
  const elapsedWeeks = Math.floor(block.daysElapsed / 7)
  const overdue = elapsedWeeks - phase.weeks
  const expired = overdue > GRACE_PERIOD_WEEKS
  return {
    expired,
    weeksOverdue: expired ? overdue : 0,
  }
}

export function getCurrentWeekTarget(block: TrainingBlock | null): WeekTarget | null {
  if (!block) return null
  const phase = PHASES[block.phase]
  if (!phase) return null
  const weekIdx = Math.min(block.currentWeek - 1, phase.weekTargets.length - 1)
  return phase.weekTargets[weekIdx] ?? null
}

export function getBlockProgress(block: TrainingBlock | null): BlockProgress | null {
  if (!block) return null
  const phase = PHASES[block.phase]
  if (!phase) return null
  return {
    currentWeek: block.currentWeek,
    totalWeeks: phase.weeks,
    pct: Math.round((block.currentWeek / phase.weeks) * 100),
    isLastWeek: block.currentWeek >= phase.weeks,
  }
}
