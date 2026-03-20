/**
 * Training Story Share Text Generator
 *
 * Generates shareable plain-text summaries for the Training Story feature.
 * Follows the same pattern as shareCard.ts buildShareText().
 */

import type { TrainingStoryData, TrainingPersonality } from './trainingStory'

const MONTH_NAMES_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PERSONALITY_LABELS_NL: Record<TrainingPersonality, string> = {
  consistent: 'De Consistente',
  powerhouse: 'De Powerhouse',
  volume: 'De Volume Machine',
  allrounder: 'De Allrounder',
  persistent: 'De Volhouder',
}

const PERSONALITY_LABELS_EN: Record<TrainingPersonality, string> = {
  consistent: 'The Consistent One',
  powerhouse: 'The Powerhouse',
  volume: 'The Volume Machine',
  allrounder: 'The Allrounder',
  persistent: 'The Persistent One',
}

export function getMonthName(month: number, language: string): string {
  const names = language === 'nl' ? MONTH_NAMES_NL : MONTH_NAMES_EN
  return names[month] ?? ''
}

export function getPersonalityLabel(personality: TrainingPersonality, language: string): string {
  const labels = language === 'nl' ? PERSONALITY_LABELS_NL : PERSONALITY_LABELS_EN
  return labels[personality]
}

function formatVolume(kg: number): string {
  if (!kg) return '0'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}`
}

/**
 * Build a plain-text share summary for the Training Story.
 *
 * NL example:
 * "Mijn februari Training Story
 *
 * 18 trainingen | 15.4t volume | 186 sets
 * 3 nieuwe records
 * 12 dagen streak
 * Type: De Consistente
 *
 * kravex.app"
 */
export function buildStoryShareText(
  data: TrainingStoryData,
  language: string,
): string {
  const isNL = language === 'nl'
  const monthName = getMonthName(data.month, language)
  const lines: string[] = []

  // Header
  if (isNL) {
    lines.push(`Mijn ${monthName} Training Story`)
  } else {
    lines.push(`My ${monthName} Training Story`)
  }

  lines.push('')

  // Stats line
  const volume = formatVolume(data.totalVolume)
  if (isNL) {
    lines.push(`${data.totalWorkouts} trainingen | ${volume} volume | ${data.totalSets} sets`)
  } else {
    lines.push(`${data.totalWorkouts} workouts | ${volume} volume | ${data.totalSets} sets`)
  }

  // PRs
  if (data.prsThisMonth.length > 0) {
    if (isNL) {
      lines.push(`${data.prsThisMonth.length} nieuwe records`)
    } else {
      lines.push(`${data.prsThisMonth.length} new records`)
    }
  }

  // Streak
  if (data.longestStreakInMonth > 1) {
    if (isNL) {
      lines.push(`${data.longestStreakInMonth} dagen streak`)
    } else {
      lines.push(`${data.longestStreakInMonth} day streak`)
    }
  }

  // Personality
  const personalityLabel = getPersonalityLabel(data.personality, language)
  lines.push(`Type: ${personalityLabel}`)

  // Branding
  lines.push('')
  lines.push('kravex.app')

  return lines.join('\n')
}
