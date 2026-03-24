/**
 * UX Journey Tests: Workout Start Experience
 *
 * These tests simulate a REAL USER clicking through the app, checking what
 * they see on screen, and verifying the experience is consistent and correct.
 *
 * Covers: Dashboard states, StartFlowView interactions, navigation consistency,
 * recovery label accuracy, and plan-aware preferences.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks — set up BEFORE importing components
// ---------------------------------------------------------------------------

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
      trainingGoal: 'hypertrophy',
      units: 'kg',
    },
  })),
}))

vi.mock('../../lib/periodization', () => ({
  getCurrentBlock: vi.fn(() => null),
  loadBlock: vi.fn(() => Promise.resolve(null)),
  getBlockProgress: vi.fn(() => null),
  getCurrentWeekTarget: vi.fn(() => null),
  PHASES: {
    accumulation: {
      label: 'Opbouw',
      labelKey: 'phases.accumulation',
      weeks: 4,
      description: '',
      descriptionKey: 'phases.accumulation_desc',
      color: 'blue',
      weekTargets: [
        { week: 1, rpe: 7, repRange: [10, 12], setNote: 'Basisvolume', isDeload: false },
        { week: 2, rpe: 7.5, repRange: [10, 12], setNote: '+1 set per spiergroep', isDeload: false },
        { week: 3, rpe: 8, repRange: [10, 12], setNote: '+2 sets per spiergroep', isDeload: false },
        { week: 4, rpe: 5, repRange: [10, 12], setNote: 'Deload - 40% volume', isDeload: true },
      ],
    },
    intensification: {
      label: 'Intensivering',
      labelKey: 'phases.intensification',
      weeks: 4,
      description: '',
      descriptionKey: 'phases.intensification_desc',
      color: 'orange',
      weekTargets: [],
    },
    strength: {
      label: 'Kracht Piek',
      labelKey: 'phases.strength',
      weeks: 3,
      description: '',
      descriptionKey: 'phases.strength_desc',
      color: 'red',
      weekTargets: [],
    },
    deload: {
      label: 'Deload',
      labelKey: 'phases.deload',
      weeks: 1,
      description: '',
      descriptionKey: 'phases.deload_desc',
      color: 'gray',
      weekTargets: [
        { week: 1, rpe: 5, repRange: [10, 12], setNote: 'Deload', isDeload: true },
      ],
    },
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

// Motion mock — bypass animations
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      return React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
        const { variants, initial, animate, whileTap, transition, ...rest } = props as Record<string, unknown>
        return React.createElement(prop, { ...rest, ref })
      })
    },
  })
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
})

// i18n mock with comprehensive translations
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
        'dashboard.title': 'Train',
        'dashboard.todays_workout': 'VANDAAG',
        'dashboard.all_muscles_ready': 'Alle spieren voor deze training hersteld',
        'dashboard.muscle_ready': 'spieren hersteld',
        'injury.report_injury': 'Blessure melden',
        'phases.accumulation': 'Opbouw',
        'phases.intensification': 'Intensivering',
        'phases.strength': 'Kracht Piek',
        'phases.deload': 'Deload',
        'muscles.chest': 'Borst',
        'muscles.back': 'Rug',
        'muscles.shoulders': 'Schouders',
        'muscles.quads': 'Quads',
        'muscles.hamstrings': 'Hamstrings',
        'muscles.glutes': 'Billen',
        'muscles.biceps': 'Biceps',
        'muscles.triceps': 'Triceps',
        'muscles.core': 'Core',
        'logger.generate_workout': 'Genereer Workout',
        'logger.more_options': 'Meer opties',
        'logger.empty_training': 'Lege training',
        'logger.template': 'Template',
        'logger.change_split': 'Andere split',
        'logger.repeat_last': 'Herhaal Laatste',
        'logger.select_time_first': 'Kies eerst een tijd',
        'logger.loading_workout': 'Laden...',
        'logger.generation_failed': 'Generatie mislukt',
        'logger.view_details': 'Bekijk details',
        'logger.ready': 'Klaar',
        'logger.analyzing': 'Analyseren...',
        'logger.ai_generating': 'AI genereert...',
        'aicoach.energy_today': 'Energie vandaag',
        'aicoach.energy_low': 'Laag',
        'aicoach.energy_medium': 'Normaal',
        'aicoach.energy_high': 'Hoog',
        'aicoach.want_extra': 'Extra focus',
        'common.exercises': 'oefeningen',
        'common.retry': 'Opnieuw',
        'plan.week': 'Week',
      }
      if (key === 'dashboard.week_of' && opts) {
        return `Week ${opts.current} van ${opts.total}`
      }
      if (key === 'logger.templates_saved' && opts) {
        return `${opts.count} opgeslagen`
      }
      return translations[key] || key
    },
    i18n: { language: 'nl' },
  }),
}))

// StartFlowView child mocks
vi.mock('../../components/TemplateLibrary', () => ({
  default: () => <div data-testid="template-library">TemplateLibrary</div>,
}))

vi.mock('../../components/Toast', () => ({
  default: () => <div data-testid="toast">Toast</div>,
}))

vi.mock('../../lib/firstWorkout', () => ({
  isFirstWorkoutEligible: vi.fn(() => false),
  generateFirstWorkout: vi.fn(() => null),
}))

vi.mock('../../lib/settings', () => ({
  getSettings: vi.fn(() => ({
    name: 'Test',
    experienceLevel: 'intermediate',
    equipment: 'full_gym',
    goal: 'hypertrophy',
    trainingGoal: 'hypertrophy',
    frequency: '4',
    time: 60,
    gender: 'male',
    bodyweight: '80',
    benchMax: '100',
    squatMax: '140',
    deadliftMax: '180',
    focusedMuscles: [],
    priorityMuscles: [],
  })),
  parseFrequency: vi.fn((freq: string | number | undefined) => Number(freq) || 4),
}))

vi.mock('../../lib/unitConversion', () => ({
  toDisplayWeight: vi.fn((kg: number) => kg),
  formatVolume: vi.fn((vol: number) => `${Math.round(vol)} kg`),
  getUnitLabel: vi.fn(() => 'kg'),
  formatVolumeShort: vi.fn((vol: number) => `${Math.round(vol)} kg`),
}))

vi.mock('../../lib/optimalHour', () => ({
  formatSlotLabel: vi.fn(() => ''),
}))

vi.mock('../../lib/dateUtils', () => ({
  getLocalDateString: vi.fn((d: Date) => d.toISOString().slice(0, 10)),
}))

vi.mock('../../components/MuscleRadar', () => ({
  default: () => null,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useWorkouts } from '../../hooks/useWorkouts'
import { getCurrentBlock, getBlockProgress } from '../../lib/periodization'
import { generateWorkoutPreview } from '../../lib/workoutCache'
import { createWorkout, createTrainingBlock } from '../helpers'
import Dashboard from '../../pages/Dashboard'
import StartFlowView from '../../components/workout/StartFlowView'
import type { StartFlowState, LastWorkoutPreview } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

const baseStartFlowState: StartFlowState = {
  loading: false,
  generating: false,
  error: null,
  retryCount: 0,
  muscleStatus: null,
  splits: [],
  recommendedSplit: null,
  selectedSplit: null,
  generatedWorkout: null,
  recoveredMuscles: [],
  showSplitPicker: false,
  estimatedDuration: null,
  exerciseCount: null,
  cachedAt: null,
  availableTime: null,
  aiResponse: null,
  energy: 'medium' as const,
  focusedMuscles: [],
}

const defaultStartFlowProps = {
  state: baseStartFlowState,
  user: { id: 'test-user' },
  formattedDate: 'Maandag 20 maart',
  lastWorkout: null as LastWorkoutPreview | null,
  templates: { templates: [], loadTemplate: vi.fn(), deleteTemplate: vi.fn(), saveTemplate: vi.fn() },
  showTemplates: false,
  toast: null,
  onStartWorkout: vi.fn(),
  onStartEmpty: vi.fn(),
  onStartAIWorkout: vi.fn(),
  onRepeatLastWorkout: vi.fn(),
  onLoadTemplate: vi.fn(),
  onDeleteTemplate: vi.fn(),
  onSetShowTemplates: vi.fn(),
  onSetToast: vi.fn(),
  onTimeChange: vi.fn(),
  onGenerateForSplit: vi.fn(),
  onToggleSplitPicker: vi.fn(),
  onEnergyChange: vi.fn(),
  onFocusedMusclesChange: vi.fn(),
}

// ---------------------------------------------------------------------------
// Scenario 1: New user (0 workouts, no plan)
// ---------------------------------------------------------------------------

describe('Scenario 1: New user — 0 workouts, no plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(generateWorkoutPreview).mockReturnValue(null)
    vi.mocked(useWorkouts).mockReturnValue({ workouts: [], loading: false } as unknown as ReturnType<typeof useWorkouts>)
  })

  it('shows single "Start training" button, not two buttons', () => {
    renderDashboard()

    const startButtons = screen.getAllByText('Start training')
    expect(startButtons).toHaveLength(1)
  })

  it('does not show "Today\'s Workout" hero card', () => {
    renderDashboard()

    expect(screen.queryByText('VANDAAG')).toBeNull()
  })

  it('does not show plan card', () => {
    renderDashboard()

    expect(screen.queryByTestId('plan-card')).toBeNull()
  })

  it('does not show plan suggestion', () => {
    renderDashboard()

    expect(screen.queryByTestId('plan-suggestion')).toBeNull()
  })

  it('tapping "Start training" navigates to /log', () => {
    renderDashboard()

    fireEvent.click(screen.getByText('Start training'))
    expect(mockNavigate).toHaveBeenCalledWith('/log')
  })
})

// ---------------------------------------------------------------------------
// Scenario 2: Returning user with plan active (10 workouts, accumulation block week 2)
// ---------------------------------------------------------------------------

describe('Scenario 2: Returning user with active plan — accumulation week 2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })
    vi.mocked(getCurrentBlock).mockReturnValue(block)
    vi.mocked(getBlockProgress).mockReturnValue({ currentWeek: 2, totalWeeks: 4, pct: 50, isLastWeek: false })

    const workouts = Array.from({ length: 10 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)

    // Today's workout preview with muscle context
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Push',
      estimatedDuration: 55,
      reasoning: 'Push recommended',
      muscleContext: [
        { muscle: 'chest', recoveryPct: 95, status: 'ready' },
        { muscle: 'shoulders', recoveryPct: 88, status: 'ready' },
        { muscle: 'triceps', recoveryPct: 92, status: 'ready' },
      ],
      isDeload: false,
      trainingPhase: 'accumulation',
    })
  })

  it('shows plan card with phase name and week progress', () => {
    renderDashboard()

    expect(screen.getByTestId('plan-card')).toBeTruthy()
    expect(screen.getByText('Opbouw')).toBeTruthy()
    expect(screen.getByText('Week 2 van 4')).toBeTruthy()
  })

  it('shows "Today\'s Workout" hero card with plan context (phase + week)', () => {
    renderDashboard()

    expect(screen.getByText('VANDAAG')).toBeTruthy()
    expect(screen.getByText('Push')).toBeTruthy()
  })

  it('hero card shows muscle recovery status for suggested split', () => {
    renderDashboard()

    // All 3 muscles are ready -> "Alle spieren voor deze training hersteld"
    expect(screen.getByText(/Alle spieren voor deze training hersteld/)).toBeTruthy()
  })

  it('shows single "Vrije training" secondary button (not duplicated)', () => {
    renderDashboard()

    const freeTrainingButtons = screen.getAllByText('Vrije training')
    expect(freeTrainingButtons).toHaveLength(1)
  })

  it('does not show plan suggestion when plan is already active', () => {
    renderDashboard()

    expect(screen.queryByTestId('plan-suggestion')).toBeNull()
  })

  it('hero card shows partial recovery when some muscles are recovering', () => {
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Push',
      estimatedDuration: 55,
      reasoning: 'Push recommended',
      muscleContext: [
        { muscle: 'chest', recoveryPct: 60, status: 'recovering' },
        { muscle: 'shoulders', recoveryPct: 88, status: 'ready' },
        { muscle: 'triceps', recoveryPct: 92, status: 'ready' },
      ],
      isDeload: false,
      trainingPhase: 'accumulation',
    })

    renderDashboard()

    // 2 of 3 ready -> "2/3 spieren hersteld"
    expect(screen.getByText(/2\/3/)).toBeTruthy()
    expect(screen.getByText(/spieren hersteld/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Scenario 3: Experienced user without plan (8 workouts, no block)
// ---------------------------------------------------------------------------

describe('Scenario 3: Experienced user without plan — 8 workouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(generateWorkoutPreview).mockReturnValue(null)

    const workouts = Array.from({ length: 8 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)
  })

  it('shows plan suggestion ("Wil je een trainingsplan?")', () => {
    renderDashboard()

    const suggestion = screen.getByTestId('plan-suggestion')
    expect(suggestion).toBeTruthy()
    expect(suggestion.textContent).toContain('Wil je een trainingsplan?')
  })

  it('shows single "Start training" button when no today\'s workout', () => {
    renderDashboard()

    const startButtons = screen.getAllByText('Start training')
    expect(startButtons).toHaveLength(1)
  })

  it('does not show plan card (no active block)', () => {
    renderDashboard()

    expect(screen.queryByTestId('plan-card')).toBeNull()
  })

  it('plan suggestion navigates to /plan on click', () => {
    renderDashboard()

    fireEvent.click(screen.getByTestId('plan-suggestion'))
    expect(mockNavigate).toHaveBeenCalledWith('/plan')
  })
})

// ---------------------------------------------------------------------------
// Scenario 4: StartFlowView shows plan context
// ---------------------------------------------------------------------------

describe('Scenario 4: StartFlowView shows plan context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getCurrentBlock is called directly inside StartFlowView
    vi.mocked(getCurrentBlock).mockReturnValue(
      createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 }),
    )
  })

  it('displays phase label and week when block is active', () => {
    render(<StartFlowView {...defaultStartFlowProps} />)

    // Block context line in the hero card: "Opbouw . Week 2/4"
    expect(screen.getByText(/Opbouw/)).toBeTruthy()
    expect(screen.getByText(/Week 2\/4/)).toBeTruthy()
  })

  it('energy selector is available under "More Options"', () => {
    render(<StartFlowView {...defaultStartFlowProps} />)

    // Energy selector is hidden by default
    expect(screen.queryByText('Laag')).toBeNull()

    // Open "More Options"
    fireEvent.click(screen.getByText('Meer opties'))

    // Energy options visible
    expect(screen.getByText('Laag')).toBeTruthy()
    expect(screen.getByText('Normaal')).toBeTruthy()
    expect(screen.getByText('Hoog')).toBeTruthy()
  })

  it('muscle focus toggles are available under "More Options"', () => {
    render(<StartFlowView {...defaultStartFlowProps} />)

    fireEvent.click(screen.getByText('Meer opties'))

    // Muscle focus toggles should be visible
    expect(screen.getByText('Borst')).toBeTruthy()
    expect(screen.getByText('Rug')).toBeTruthy()
    expect(screen.getByText('Quads')).toBeTruthy()
  })

  it('"Advanced Options" link to /coach does NOT exist', () => {
    render(<StartFlowView {...defaultStartFlowProps} />)

    // Open More Options to check all content
    fireEvent.click(screen.getByText('Meer opties'))

    // Should NOT have any link to /coach
    const allLinks = document.querySelectorAll('a[href="/coach"]')
    expect(allLinks.length).toBe(0)

    // Also check there is no text referencing "Advanced Options" or "Geavanceerde opties"
    expect(screen.queryByText(/advanced options/i)).toBeNull()
    expect(screen.queryByText(/geavanceerde opties/i)).toBeNull()
  })

  it('"View Details" is a proper button (not tiny text)', () => {
    const readyState: StartFlowState = {
      ...baseStartFlowState,
      availableTime: 60,
      generatedWorkout: [{ name: 'Bench Press', sets: [] }],
      selectedSplit: 'Push',
      exerciseCount: 6,
      estimatedDuration: 55,
    }

    const onShowReview = vi.fn()

    render(
      <StartFlowView
        {...defaultStartFlowProps}
        state={readyState}
        onShowReview={onShowReview}
      />,
    )

    // "View Details" should be a button element
    const detailsButton = screen.getByText('Bekijk details')
    expect(detailsButton.closest('button')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Scenario 5: Plan page navigation consistency
// ---------------------------------------------------------------------------

describe('Scenario 5: Navigation consistency — all paths converge on /log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('Dashboard "Start training" navigates to /log (empty state)', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(generateWorkoutPreview).mockReturnValue(null)
    vi.mocked(useWorkouts).mockReturnValue({ workouts: [], loading: false } as unknown as ReturnType<typeof useWorkouts>)

    renderDashboard()

    fireEvent.click(screen.getByText('Start training'))
    expect(mockNavigate).toHaveBeenCalledWith('/log')
  })

  it('Dashboard "Vrije training" navigates to /log (with today\'s workout)', () => {
    const workouts = Array.from({ length: 10 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)
    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Push',
      estimatedDuration: 55,
      reasoning: 'Push recommended',
      muscleContext: [],
      isDeload: false,
      trainingPhase: null,
    })

    renderDashboard()

    fireEvent.click(screen.getByText('Vrije training'))
    expect(mockNavigate).toHaveBeenCalledWith('/log')
  })
})

// ---------------------------------------------------------------------------
// Scenario 6: Recovery label accuracy
// ---------------------------------------------------------------------------

describe('Scenario 6: Recovery label accuracy in hero card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    vi.mocked(getCurrentBlock).mockReturnValue(null)
    vi.mocked(getBlockProgress).mockReturnValue(null)

    const workouts = Array.from({ length: 10 }, () => createWorkout())
    vi.mocked(useWorkouts).mockReturnValue({ workouts, loading: false } as ReturnType<typeof useWorkouts>)
  })

  it('shows "Alle spieren voor deze training hersteld" when all split muscles are recovered', () => {
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Push',
      estimatedDuration: 55,
      reasoning: 'Push recommended',
      muscleContext: [
        { muscle: 'chest', recoveryPct: 100, status: 'ready' },
        { muscle: 'shoulders', recoveryPct: 95, status: 'ready' },
        { muscle: 'triceps', recoveryPct: 90, status: 'ready' },
      ],
      isDeload: false,
      trainingPhase: null,
    })

    renderDashboard()

    expect(screen.getByText(/Alle spieren voor deze training hersteld/)).toBeTruthy()
  })

  it('shows "X/Y" ratio when some muscles for the split are recovering', () => {
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Push',
      estimatedDuration: 55,
      reasoning: 'Push recommended',
      muscleContext: [
        { muscle: 'chest', recoveryPct: 30, status: 'fatigued' },
        { muscle: 'shoulders', recoveryPct: 88, status: 'ready' },
        { muscle: 'triceps', recoveryPct: 50, status: 'recovering' },
      ],
      isDeload: false,
      trainingPhase: null,
    })

    renderDashboard()

    // Only 1 of 3 is "ready" -> "1/3 spieren hersteld"
    expect(screen.getByText(/1\/3/)).toBeTruthy()
    expect(screen.getByText(/spieren hersteld/)).toBeTruthy()
  })

  it('does not show misleading "alle spieren" when muscles are not all recovered', () => {
    vi.mocked(generateWorkoutPreview).mockReturnValue({
      split: 'Pull',
      estimatedDuration: 50,
      reasoning: 'Pull recommended',
      muscleContext: [
        { muscle: 'back', recoveryPct: 60, status: 'recovering' },
        { muscle: 'biceps', recoveryPct: 95, status: 'ready' },
      ],
      isDeload: false,
      trainingPhase: null,
    })

    renderDashboard()

    // Should show "1/2" not "alle spieren"
    expect(screen.queryByText(/Alle spieren voor deze training hersteld/)).toBeNull()
    expect(screen.getByText(/1\/2/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Scenario 7: StartFlowView interaction details
// ---------------------------------------------------------------------------

describe('Scenario 7: StartFlowView interaction details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentBlock).mockReturnValue(null)
  })

  it('time buttons trigger onTimeChange', () => {
    const onTimeChange = vi.fn()
    render(<StartFlowView {...defaultStartFlowProps} onTimeChange={onTimeChange} />)

    fireEvent.click(screen.getByText('60m'))
    expect(onTimeChange).toHaveBeenCalledWith(60)
  })

  it('time buttons are disabled while generating', () => {
    const genState: StartFlowState = { ...baseStartFlowState, generating: true }
    render(<StartFlowView {...defaultStartFlowProps} state={genState} />)

    const btn60 = screen.getByText('60m').closest('button')!
    expect(btn60.disabled).toBe(true)
  })

  it('energy change fires onEnergyChange', () => {
    const onEnergyChange = vi.fn()
    render(<StartFlowView {...defaultStartFlowProps} onEnergyChange={onEnergyChange} />)

    // Open more options
    fireEvent.click(screen.getByText('Meer opties'))

    // Select "High" energy
    fireEvent.click(screen.getByText('Hoog'))
    expect(onEnergyChange).toHaveBeenCalledWith('high')
  })

  it('muscle focus toggle fires onFocusedMusclesChange', () => {
    const onFocusedMusclesChange = vi.fn()
    render(
      <StartFlowView
        {...defaultStartFlowProps}
        onFocusedMusclesChange={onFocusedMusclesChange}
      />,
    )

    fireEvent.click(screen.getByText('Meer opties'))
    fireEvent.click(screen.getByText('Borst'))

    expect(onFocusedMusclesChange).toHaveBeenCalledWith(['chest'])
  })

  it('clicking ready AI workout triggers onStartAIWorkout', () => {
    const onStartAIWorkout = vi.fn()
    const readyState: StartFlowState = {
      ...baseStartFlowState,
      availableTime: 60,
      generatedWorkout: [{ name: 'Bench Press', sets: [] }],
      selectedSplit: 'Push',
      exerciseCount: 6,
      estimatedDuration: 55,
    }

    render(
      <StartFlowView
        {...defaultStartFlowProps}
        state={readyState}
        onStartAIWorkout={onStartAIWorkout}
      />,
    )

    const startBtn = screen.getByRole('button', { name: /Start Push/i })
    fireEvent.click(startBtn)
    expect(onStartAIWorkout).toHaveBeenCalledTimes(1)
  })

  it('repeat last workout button appears when lastWorkout is provided', () => {
    const lastWorkout: LastWorkoutPreview = {
      preview: 'Pull - 5 oefeningen',
      exercises: [],
    }

    render(<StartFlowView {...defaultStartFlowProps} lastWorkout={lastWorkout} />)

    expect(screen.getByText('Herhaal Laatste')).toBeTruthy()
    expect(screen.getByText('Pull - 5 oefeningen')).toBeTruthy()
  })

  it('no block context shown when no block is active', () => {
    vi.mocked(getCurrentBlock).mockReturnValue(null)

    render(<StartFlowView {...defaultStartFlowProps} />)

    // Should NOT display phase label or week notation
    expect(screen.queryByText(/Week \d+\/\d+/)).toBeNull()
  })
})
