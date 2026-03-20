import type { FinishModalResult } from '../types'

export interface ShareCardData {
  date: string
  split: string | null
  duration: number
  volume: string
  sets: number
  exercises: string[]
  extraExercises: number
  prs: Array<{ exercise: string; weight: number }>
  streak: number
  branding: string
}

export interface ShareCardOptions {
  locale: string
  prs: Array<{ exercise: string; weight: number }>
  streak: number
  split?: string | null
}

const MAX_EXERCISES = 6

export function generateShareCardData(
  result: FinishModalResult,
  options: ShareCardOptions,
): ShareCardData {
  const { locale, prs, streak, split } = options

  // Format date
  const localeTag = locale === 'nl' ? 'nl-NL' : 'en-US'
  const date = new Date().toLocaleDateString(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Duration in minutes
  const duration = Math.floor((result.duration || 0) / 60)

  // Format volume
  const totalVol = result.totalVolume || 0
  const volume = formatVolume(totalVol)

  // Total sets
  const sets = result.workout_sets?.length || 0

  // Exercise names (max 6)
  const allExercises = result.exerciseNames || []
  const exercises = allExercises.slice(0, MAX_EXERCISES)
  const extraExercises = Math.max(0, allExercises.length - MAX_EXERCISES)

  return {
    date,
    split: split ?? null,
    duration,
    volume,
    sets,
    exercises,
    extraExercises,
    prs,
    streak,
    branding: 'kravex.app',
  }
}

function formatVolume(kg: number): string {
  if (!kg) return '0'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}`
}

/**
 * Build a plain-text summary for Web Share API / clipboard fallback.
 */
export function buildShareText(data: ShareCardData, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const lines: string[] = []

  if (data.split) {
    lines.push(`${data.split} - ${data.date}`)
  } else {
    lines.push(data.date)
  }

  lines.push('')
  lines.push(`${data.duration} ${t('finish_modal.minutes')} | ${data.volume} ${t('finish_modal.volume')} | ${data.sets} ${t('common.sets')}`)
  lines.push('')

  for (const ex of data.exercises) {
    lines.push(`- ${ex}`)
  }
  if (data.extraExercises > 0) {
    lines.push(t('share.more_exercises', { count: data.extraExercises }))
  }

  if (data.prs.length > 0) {
    lines.push('')
    lines.push(`-- ${t('share.new_records')} --`)
    for (const pr of data.prs) {
      lines.push(`${pr.exercise}: ${pr.weight}kg`)
    }
  }

  if (data.streak > 1) {
    lines.push('')
    lines.push(`${data.streak} ${t('share.streak')}`)
  }

  lines.push('')
  lines.push(data.branding)

  return lines.join('\n')
}
