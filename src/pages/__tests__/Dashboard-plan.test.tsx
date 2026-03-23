import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---- Mocks ----

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useWorkouts', () => ({
  useWorkouts: vi.fn(() => ({ workouts: [], loading: false })),
}))

vi.mock('../../App', () => ({
  useAuthContext: vi.fn(() => ({
    user: { id: 'user-1' },
    settings: {
      name: 'Test',
      frequency: '4',
      mainLift: null,
      mainLiftGoalKg: null,
      mainLiftGoalDate: null,
    },
  })),
}))

vi.mock('../../lib/periodization', () => ({
  getCurrentBlock: vi.fn(() => null),
  getBlockProgress: vi.fn(() => null),
  PHASES: {
    accumulation: { label: 'Opbouw', labelKey: 'phases.accumulation', weeks: 4, description: '', descriptionKey: 'phases.accumulation_desc', color: 'blue', weekTargets: [] },
    intensification: { label: 'Intensivering', labelKey: 'phases.intensification', weeks: 4, description: '', descriptionKey: 'phases.intensification_desc', color: 'orange', weekTargets: [] },
    strength: { label: 'Kracht Piek', labelKey: 'phases.strength', weeks: 3, description: '', descriptionKey: 'phases.strength_desc', color: 'red', weekTargets: [] },
    deload: { label: 'Deload', labelKey: 'phases.deload', weeks: 1, description: '', descriptionKey: 'phases.deload_desc', color: 'gray', weekTargets: [] },
  },
}))

vi.mock('../../lib/training-analysis', () => ({
  analyzeTraining: vi.fn(() => null),
}))

vi.mock('../../lib/workoutCache', () => ({
  generateWorkoutPreview: vi.fn(() => null),
  generateFullWorkout: vi.fn(() => Promise.resolve({ exercises: [] })),
}))

vi.mock('../../hooks/useInjuries', () => ({
  useInjuries: vi.fn(() => ({
    activeInjuries: [],
    addInjury: vi.fn(),
    checkIn: vi.fn(),
    resolve: vi.fn(),
  })),
}))

vi.mock('../../hooks/useOptimalHour', () => ({
  useOptimalHour: vi.fn(() => null),
}))

vi.mock('../../lib/trainingStory', () => ({
  computeTrainingStory: vi.fn(() => ({ hasEnoughData: false })),
  isStoryViewed: vi.fn(() => true),
  markStoryViewed: vi.fn(),
}))

vi.mock('../../lib/trainingStoryShare', () => ({
  getMonthName: vi.fn(() => 'January'),
  buildStoryShareText: vi.fn(() => ''),
}))

vi.mock('../../components/Skeleton', () => ({
  DashboardSkeleton: () => <div>Loading...</div>,
}))

vi.mock('../../components/InjuryBanner', () => ({ default: () => null }))
vi.mock('../../components/InjuryCheckIn', () => ({ default: () => null }))
vi.mock('../../components/InjuryReport', () => ({ default: () => null }))
vi.mock('../../components/TrainingStoryBanner', () => ({ default: () => null }))
vi.mock('../../components/ResumeWorkoutBanner', () => ({ default: () => null }))
vi.mock('../../components/PrGoalsDashboard', () => ({ default: () => null }))
vi.mock('../../components/OptimalHourCard', () => ({ default: () => null }))
vi.mock('../../components/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// i18n mock
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'dashboard.training_plan': 'TRAININGSPLAN',
        'dashboard.plan_suggestion': 'Wil je een trainingsplan?',
        'dashboard.workouts': 'Trainingen',
        'dashboard.streak': 'Streak',
        'dashboard.recovery': 'Herstel',
        'dashboard.start_training': 'Start training',
        'dashboard.free_training': 'Vrije training',
        'dashboard.time_to_start': 'Tijd om te presteren.',
        'dashboard.greeting_morning': 'Goedemorgen',
        'dashboard.greeting_afternoon': 'Goedemiddag',
        'dashboard.greeting_evening': 'Goedenavond',
        'dashboard.recent': 'Recent',
        'dashboard.view_all': 'Bekijk alles',
        'dashboard.no_exercises': 'Geen oefeningen',
        'injury.report_injury': 'Blessure melden',
        'phases.accumulation': 'Opbouw',
        'phases.intensification': 'Intensivering',
        'phases.strength': 'Kracht Piek',
        'phases.deload': 'Deload',
      }
      if (key === 'dashboard.week_of' && opts) {
        return `Week ${opts.current} van ${opts.total}`
      }
      return translations[key] || key
    },
    i18n: { language: 'nl' },
  }),
}))

import { useWorkouts } from '../../hooks/useWorkouts'
import { getCurrentBlock, getBlockProgress } from '../../lib/periodization'
import { createWorkout, createTrainingBlock } from '../../__tests__/helpers'
import Dashboard from '../Dashboard'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard plan features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  // -- Active Plan Card tests --

  it('does not show plan card when no block is active', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(useWorkouts).mockReturnValue({ workouts: [createWorkout()], loading: false } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    expect(screen.queryByTestId('plan-card')).toBeNull()
  })

  it('shows plan card with phase name and week progress when block is active', () => {
    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })
    vi.mocked(useWorkouts).mockReturnValue({ workouts: [createWorkout()], loading: false } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    expect(screen.getByTestId('plan-card')).toBeTruthy()
    expect(screen.getByText('Opbouw')).toBeTruthy()
    expect(screen.getByText('Week 2 van 4')).toBeTruthy()
  })

  it('plan card navigates to /plan on click', () => {
    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })
    vi.mocked(useWorkouts).mockReturnValue({ workouts: [createWorkout()], loading: false } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    fireEvent.click(screen.getByTestId('plan-card'))
    expect(mockNavigate).toHaveBeenCalledWith('/plan')
  })

  // -- Plan Suggestion tests --

  it('does not show plan suggestion with fewer than 5 workouts', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(useWorkouts).mockReturnValue({
      workouts: [createWorkout(), createWorkout(), createWorkout()],
      loading: false,
    } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    expect(screen.queryByTestId('plan-suggestion')).toBeNull()
  })

  it('shows plan suggestion link after 5+ workouts when no block active', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    const workouts = Array.from({ length: 6 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    const suggestion = screen.getByTestId('plan-suggestion')
    expect(suggestion).toBeTruthy()
    expect(suggestion.textContent).toContain('Wil je een trainingsplan?')
  })

  it('plan suggestion navigates to /plan on click', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    const workouts = Array.from({ length: 6 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)

    renderDashboard()

    fireEvent.click(screen.getByTestId('plan-suggestion'))
    expect(mockNavigate).toHaveBeenCalledWith('/plan')
  })
})
