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
    weeks: 4,
    description: 'Bouw wekelijks volume op, matige intensiteit. Basisfase.',
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
    weeks: 4,
    description: 'Verhoog intensiteit en belasting. Minder herhalingen, zwaardere gewichten.',
    color: 'red',
    weekTargets: [
      { week: 1, rpe: 7.5, repRange: [6, 8], setNote: 'Basisvolume',    isDeload: false },
      { week: 2, rpe: 8,   repRange: [6, 8], setNote: '+1 set per spiergroep',  isDeload: false },
      { week: 3, rpe: 8.5, repRange: [5, 6], setNote: 'Push — zware sets',  isDeload: false },
      { week: 4, rpe: 5,   repRange: [6, 8], setNote: 'Deload — 40% volume',isDeload: true  },
    ],
  },
  strength: {
    label: 'Kracht Piek',
    weeks: 3,
    description: 'Maximale krachtexpressie. Test je grenzen.',
    color: 'red',
    weekTargets: [
      { week: 1, rpe: 8,   repRange: [3, 5], setNote: 'Zware compound oefeningen',  isDeload: false },
      { week: 2, rpe: 9,   repRange: [2, 4], setNote: 'Bijna-max inspanning',  isDeload: false },
      { week: 3, rpe: 5,   repRange: [3, 5], setNote: "Mini deload + PR's",isDeload: true  },
    ],
  },
  deload: {
    label: 'Deload',
    weeks: 1,
    description: 'Volledige herstelweek. Zelfde bewegingen, veel minder volume.',
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
    return { ...block, currentWeek, daysElapsed }
  } catch {
    localStorage.removeItem(BLOCK_KEY)  // clear corrupted data
    return null
  }
}

// Laad trainingsblok van Supabase, val terug op localStorage
export async function loadBlock(userId: string | null): Promise<TrainingBlock | null> {
  if (userId) {
    try {
      const { data } = await supabase
        .from('training_blocks')
        .select('block')
        .eq('user_id', userId)
        .single()

      if (data?.block) {
        // Sync naar localStorage voor offline gebruik
        localStorage.setItem(BLOCK_KEY, JSON.stringify(data.block))
      }
    } catch { /* val terug op localStorage */ }
  }
  return getCurrentBlock()
}

export async function startBlock(phase: PeriodizationPhase, userId: string | null, fullPlan: unknown = null): Promise<StoredBlock> {
  const block: StoredBlock = {
    id: crypto.randomUUID(),
    phase,
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    fullPlan: fullPlan || null,
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
