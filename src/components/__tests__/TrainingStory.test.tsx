import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrainingStory from '../TrainingStory/index'
import type { TrainingStoryData } from '../../lib/trainingStory'

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'common.close': 'Close',
        'story.months.february': 'February',
        'story.title_card.your_month': `Your ${opts?.month ?? ''}`,
        'story.title_card.in_review': 'in review',
        'story.overview.title': 'Overview',
        'story.overview.workouts': 'workouts',
        'story.overview.volume': 'volume',
        'story.overview.sets': 'sets',
        'story.overview.time': 'time',
        'story.final.share': 'Share your story',
        'story.final.title': 'See you next month',
      }
      return map[key] ?? key
    },
  }),
}))

function makeStoryData(overrides: Partial<TrainingStoryData> = {}): TrainingStoryData {
  return {
    month: 1, // February (0-indexed)
    year: 2026,
    totalWorkouts: 18,
    totalVolume: 15375,
    totalSets: 186,
    totalTimeMinutes: 1440,
    currentStreak: 5,
    longestStreakInMonth: 12,
    consistencyScore: 87,
    trainingDays: ['2026-02-01', '2026-02-03', '2026-02-05'],
    prsThisMonth: [],
    volumeTrend: { volumeChange: 23, workoutsChange: 2, setsChange: 15, direction: 'up' },
    previousMonthVolume: 12500,
    favoriteExercise: { name: 'Bench Press', totalSets: 42 },
    mostTrainedMuscle: { name: 'chest', sets: 48 },
    splitDistribution: [
      { split: 'Push', count: 12, color: '#06b6d4' },
      { split: 'Pull', count: 10, color: '#a855f7' },
      { split: 'Legs', count: 8, color: '#22c55e' },
    ],
    heaviestSet: { exercise: 'Squat', weight: 140, reps: 3 },
    mostRepsSet: { exercise: 'Leg Press', reps: 15, weight: 25 },
    longestWorkoutMinutes: 78,
    shortestWorkoutMinutes: 32,
    comparison: { volumeChange: 23, workoutsChange: 2, setsChange: 15, direction: 'up' },
    personality: 'consistent',
    hasEnoughData: true,
    ...overrides,
  }
}

describe('TrainingStory', () => {
  it('renders progress bar with 10 segments', () => {
    const { container } = render(
      <TrainingStory data={makeStoryData()} onClose={vi.fn()} />,
    )
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeTruthy()
    // 10 segment containers
    const segments = progressBar!.children
    expect(segments.length).toBe(10)
  })

  it('renders close button', () => {
    render(<TrainingStory data={makeStoryData()} onClose={vi.fn()} />)
    const closeBtn = screen.getByLabelText('Close')
    expect(closeBtn).toBeTruthy()
  })

  it('starts at card 0 (title card)', () => {
    render(<TrainingStory data={makeStoryData()} onClose={vi.fn()} />)
    // Title card should be visible with the KRAVEX branding
    expect(screen.getByText('K R A V E X')).toBeTruthy()
  })

  it('calls onClose when X clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TrainingStory data={makeStoryData()} onClose={onClose} />)

    const closeBtn = screen.getByLabelText('Close')
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders share button when onShare provided', () => {
    render(
      <TrainingStory data={makeStoryData()} onClose={vi.fn()} onShare={vi.fn()} />,
    )
    const shareBtns = screen.getAllByLabelText('Share your story')
    expect(shareBtns.length).toBeGreaterThanOrEqual(1)
  })
})
