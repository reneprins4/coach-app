import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---- Mocks ----

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockClearBlock = vi.fn<(userId: string | null) => Promise<void>>(() => Promise.resolve())
vi.mock('../../lib/periodization', () => ({
  getCurrentBlock: vi.fn(() => null),
  getBlockProgress: vi.fn(() => null),
  clearBlock: vi.fn((userId: string | null) => mockClearBlock(userId)),
  PHASES: {
    accumulation: { label: 'Opbouw', labelKey: 'phases.accumulation', weeks: 4, description: '', descriptionKey: 'phases.accumulation_desc', color: 'blue', weekTargets: [] },
    intensification: { label: 'Intensivering', labelKey: 'phases.intensification', weeks: 4, description: '', descriptionKey: 'phases.intensification_desc', color: 'orange', weekTargets: [] },
    strength: { label: 'Kracht Piek', labelKey: 'phases.strength', weeks: 3, description: '', descriptionKey: 'phases.strength_desc', color: 'red', weekTargets: [] },
    deload: { label: 'Deload', labelKey: 'phases.deload', weeks: 1, description: '', descriptionKey: 'phases.deload_desc', color: 'gray', weekTargets: [] },
  },
}))

vi.mock('../../hooks/useWorkouts', () => ({
  useWorkouts: vi.fn(() => ({ workouts: [], loading: false })),
}))

vi.mock('../../hooks/useMeasurements', () => ({
  useMeasurements: vi.fn(() => ({ measurements: [] })),
}))

vi.mock('../../App', () => ({
  useAuthContext: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    signOut: vi.fn(),
    settings: {
      name: 'Test',
      frequency: '4x',
      gender: 'male',
      restTime: 90,
      memberSince: '2024-01-01T00:00:00.000Z',
      bodyweight: '80',
      experienceLevel: 'intermediate',
      equipment: 'full_gym',
      benchMax: '100',
      squatMax: '140',
      deadliftMax: '180',
      ohpMax: '60',
      onboardingCompleted: true,
      language: 'auto',
      time: 60,
      trainingGoal: 'hypertrophy',
      trainingPhase: 'build',
      mainLift: null,
      mainLiftGoalKg: null,
      mainLiftGoalDate: null,
      priorityMuscles: [],
      priorityMusclesUntil: null,
    },
    updateSettings: vi.fn(),
  })),
}))

vi.mock('../../hooks/useInjuries', () => ({
  useInjuries: vi.fn(() => ({
    activeInjuries: [],
    addInjury: vi.fn(),
    checkIn: vi.fn(),
    resolve: vi.fn(),
  })),
}))

vi.mock('../../lib/achievements', () => ({
  ACHIEVEMENTS: [],
  buildAchievementContext: vi.fn(),
  getUnlockedAchievements: vi.fn(() => []),
  syncAchievements: vi.fn(),
}))

vi.mock('../../components/InjuryBanner', () => ({ default: () => null }))
vi.mock('../../components/InjuryReport', () => ({ default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>InjuryReport</div> : null }))
vi.mock('../../components/InjuryCheckIn', () => ({ default: () => null }))
vi.mock('../../components/PrGoalsSection', () => ({ default: () => <div>PrGoals</div> }))
vi.mock('../../components/AchievementBadge', () => ({ default: () => null }))
vi.mock('../../components/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock framer-motion to bypass AnimatePresence wait behavior
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy({}, {
    get: (_target: object, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const { initial, animate, exit, transition, whileTap, ...rest } = props
        return React.createElement(prop, { ...rest, ref })
      })
    },
  })
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  }
})

// i18n mock
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'phases.week_of' && opts) {
        return `Week ${opts.current} van ${opts.total}`
      }
      const translations: Record<string, string> = {
        'phases.training_plan': 'Trainingsplan',
        'phases.accumulation': 'Opbouw',
        'phases.intensification': 'Intensivering',
        'phases.strength': 'Kracht Piek',
        'phases.deload': 'Deload',
        'plan.title': 'Trainingsplan',
        'plan.week': 'Week',
        'profile.plan_view': 'Bekijk plan',
        'profile.plan_stop': 'Stop plan',
        'profile.plan_stop_confirm': 'Weet je zeker dat je je trainingsplan wilt stoppen?',
        'profile.plan_suggestion': 'Volg een gestructureerd plan met opbouw- en deloadweken.',
        'profile.plan_choose': 'Plan kiezen',
        'profile.tab_personal': 'Jij',
        'profile.tab_training': 'Training',
        'profile.tab_account': 'Account',
        'profile.title': 'Profiel',
        'profile.subtitle': 'Account',
        'profile.autosaved': 'Opgeslagen',
        'profile.logout': 'Uitloggen',
        'profile.incomplete_banner': 'Vul je gegevens in',
        'training_goal.title': 'Trainingsdoel',
        'training_goal.strength': 'Maximale kracht',
        'training_goal.strength_sub': 'Lage reps',
        'training_goal.hypertrophy': 'Spiermassa',
        'training_goal.hypertrophy_sub': 'Meer volume',
        'training_goal.powerbuilding': 'Powerbuilding',
        'training_goal.powerbuilding_sub': 'Kracht + massa',
        'training_goal.conditioning': 'Conditie',
        'training_goal.conditioning_sub': 'Uithoudingsvermogen',
        'injury.injuries_title': 'Blessures',
        'injury.report_injury': 'Blessure melden',
        'injury.no_injuries': 'Geen actieve blessures',
      }
      return translations[key] || key
    },
    i18n: { language: 'nl', changeLanguage: vi.fn() },
  }),
}))

import { getCurrentBlock, getBlockProgress } from '../../lib/periodization'
import { createTrainingBlock } from '../../__tests__/helpers'
import Profile from '../Profile'

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

function switchToTrainingTab() {
  fireEvent.click(screen.getByText('Training'))
}

describe('Profile plan section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockClearBlock.mockClear()
  })

  it('shows plan status when block is active', () => {
    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })

    renderProfile()
    switchToTrainingTab()

    expect(screen.getByText('Trainingsplan')).toBeTruthy()
    expect(screen.getByText(/Opbouw/)).toBeTruthy()
    expect(screen.getByText(/Week 2 van 4/)).toBeTruthy()
    expect(screen.getByText('Bekijk plan')).toBeTruthy()
    expect(screen.getByText('Stop plan')).toBeTruthy()
  })

  it('shows plan suggestion when no block active', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)

    renderProfile()
    switchToTrainingTab()

    expect(screen.getByText('Trainingsplan')).toBeTruthy()
    expect(screen.getByText('Volg een gestructureerd plan met opbouw- en deloadweken.')).toBeTruthy()
    expect(screen.getByText('Plan kiezen')).toBeTruthy()
  })

  it('stop plan button clears the block after confirmation', () => {
    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderProfile()
    switchToTrainingTab()

    fireEvent.click(screen.getByText('Stop plan'))

    expect(confirmSpy).toHaveBeenCalledWith('Weet je zeker dat je je trainingsplan wilt stoppen?')
    expect(mockClearBlock).toHaveBeenCalledWith('user-1')

    confirmSpy.mockRestore()
  })

  it('view plan navigates to /plan', () => {
    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })

    renderProfile()
    switchToTrainingTab()

    fireEvent.click(screen.getByText('Bekijk plan'))
    expect(mockNavigate).toHaveBeenCalledWith('/plan')
  })
})
