import { describe, it, expect } from 'vitest'
import { buildStoryShareText, getMonthName, getPersonalityLabel } from '../trainingStoryShare'
import type { TrainingStoryData } from '../trainingStory'

function makeStoryData(overrides: Partial<TrainingStoryData> = {}): TrainingStoryData {
  return {
    month: 1, // February (0-indexed)
    year: 2026,
    totalWorkouts: 18,
    totalVolume: 15400,
    totalSets: 186,
    totalTimeMinutes: 1080,
    currentStreak: 5,
    longestStreakInMonth: 12,
    consistencyScore: 90,
    trainingDays: [],
    prsThisMonth: [
      { exercise: 'Bench Press', previousBest: 80, newBest: 85, improvement: 5, type: 'weight' },
      { exercise: 'Squat', previousBest: 100, newBest: 110, improvement: 10, type: 'weight' },
      { exercise: 'Deadlift', previousBest: 120, newBest: 125, improvement: 5, type: 'weight' },
    ],
    volumeTrend: { volumeChange: 12, workoutsChange: 2, setsChange: 20, direction: 'up' },
    previousMonthVolume: 13000,
    favoriteExercise: { name: 'Bench Press', totalSets: 40 },
    mostTrainedMuscle: { name: 'chest', sets: 50 },
    splitDistribution: [{ split: 'Push', count: 8, color: '#ef4444' }],
    heaviestSet: { exercise: 'Deadlift', weight: 125, reps: 3 },
    mostRepsSet: { exercise: 'Push-ups', reps: 30, weight: 0 },
    longestWorkoutMinutes: 90,
    shortestWorkoutMinutes: 35,
    comparison: { volumeChange: 12, workoutsChange: 2, setsChange: 20, direction: 'up' },
    personality: 'consistent',
    hasEnoughData: true,
    ...overrides,
  }
}

describe('Training Story Share Text', () => {
  it('builds share text with month name', () => {
    const text = buildStoryShareText(makeStoryData({ month: 1 }), 'nl')
    expect(text).toContain('februari')
    expect(text).toContain('Training Story')
  })

  it('includes workout count', () => {
    const text = buildStoryShareText(makeStoryData({ totalWorkouts: 18 }), 'nl')
    expect(text).toContain('18 trainingen')
  })

  it('includes volume', () => {
    const text = buildStoryShareText(makeStoryData({ totalVolume: 15400 }), 'nl')
    expect(text).toContain('15.4t volume')
  })

  it('includes PRs when present', () => {
    const data = makeStoryData({
      prsThisMonth: [
        { exercise: 'Bench Press', previousBest: 80, newBest: 85, improvement: 5, type: 'weight' },
        { exercise: 'Squat', previousBest: 100, newBest: 110, improvement: 10, type: 'weight' },
      ],
    })
    const text = buildStoryShareText(data, 'nl')
    expect(text).toContain('2 nieuwe records')
  })

  it('includes streak when > 1', () => {
    const text = buildStoryShareText(makeStoryData({ longestStreakInMonth: 12 }), 'nl')
    expect(text).toContain('12 dagen streak')
  })

  it('includes personality tag', () => {
    const text = buildStoryShareText(makeStoryData({ personality: 'consistent' }), 'nl')
    expect(text).toContain('Type: De Consistente')
  })

  it('includes Kravex branding', () => {
    const text = buildStoryShareText(makeStoryData(), 'nl')
    expect(text).toContain('kravex.app')
  })

  it('handles zero PRs', () => {
    const data = makeStoryData({ prsThisMonth: [] })
    const text = buildStoryShareText(data, 'nl')
    expect(text).not.toContain('records')
  })

  it('uses correct language (NL)', () => {
    const text = buildStoryShareText(makeStoryData(), 'nl')
    expect(text).toContain('Mijn')
    expect(text).toContain('trainingen')
    expect(text).toContain('nieuwe records')
    expect(text).toContain('dagen streak')
  })

  it('uses correct language (EN)', () => {
    const text = buildStoryShareText(makeStoryData(), 'en')
    expect(text).toContain('My')
    expect(text).toContain('workouts')
    expect(text).toContain('new records')
    expect(text).toContain('day streak')
  })

  it('omits streak line when streak is 1 or less', () => {
    const data = makeStoryData({ longestStreakInMonth: 1 })
    const text = buildStoryShareText(data, 'nl')
    expect(text).not.toContain('streak')
  })

  it('formats small volume without t suffix', () => {
    const data = makeStoryData({ totalVolume: 800 })
    const text = buildStoryShareText(data, 'nl')
    expect(text).toContain('800 volume')
  })
})

describe('getMonthName', () => {
  it('returns NL month names', () => {
    expect(getMonthName(0, 'nl')).toBe('januari')
    expect(getMonthName(11, 'nl')).toBe('december')
  })

  it('returns EN month names', () => {
    expect(getMonthName(0, 'en')).toBe('January')
    expect(getMonthName(11, 'en')).toBe('December')
  })
})

describe('getPersonalityLabel', () => {
  it('returns NL labels', () => {
    expect(getPersonalityLabel('powerhouse', 'nl')).toBe('De Powerhouse')
    expect(getPersonalityLabel('allrounder', 'nl')).toBe('De Allrounder')
  })

  it('returns EN labels', () => {
    expect(getPersonalityLabel('powerhouse', 'en')).toBe('The Powerhouse')
    expect(getPersonalityLabel('persistent', 'en')).toBe('The Persistent One')
  })
})
