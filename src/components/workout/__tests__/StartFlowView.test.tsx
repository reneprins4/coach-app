import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StartFlowView from '../StartFlowView'
import type { StartFlowState, LastWorkoutPreview } from '../../../types'

// Mock i18next - return the key as the translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Handle interpolation for templates_saved
      if (opts && typeof opts === 'object' && 'count' in opts) {
        return `${key}::${opts.count}`
      }
      return key
    },
  }),
}))

// Mock periodization
vi.mock('../../../lib/periodization', () => ({
  getCurrentBlock: () => null,
  PHASES: {},
}))

// Mock child components
vi.mock('../../TemplateLibrary', () => ({
  default: () => <div data-testid="template-library">TemplateLibrary</div>,
}))

vi.mock('../../Toast', () => ({
  default: () => <div data-testid="toast">Toast</div>,
}))

const baseState: StartFlowState = {
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

const defaultProps = {
  state: baseState,
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

describe('StartFlowView - Simplified Layout', () => {
  // Primary CTAs
  it('renders AI Workout as prominent hero card', () => {
    render(<StartFlowView {...defaultProps} />)
    // The AI hero card should contain the generate workout button text
    expect(screen.getByText('logger.generate_workout')).toBeDefined()
  })

  it('renders "Herhaal Laatste" button when history exists', () => {
    const lastWorkout: LastWorkoutPreview = {
      preview: 'Push - 6 oefeningen',
      exercises: [],
    }
    render(<StartFlowView {...defaultProps} lastWorkout={lastWorkout} />)
    expect(screen.getByText('logger.repeat_last')).toBeDefined()
    // Should also show the preview summary
    expect(screen.getByText('Push - 6 oefeningen')).toBeDefined()
  })

  it('hides "Herhaal Laatste" when no workout history', () => {
    render(<StartFlowView {...defaultProps} lastWorkout={null} />)
    expect(screen.queryByText('logger.repeat_last')).toBeNull()
  })

  it('AI hero card contains inline time picker', () => {
    render(<StartFlowView {...defaultProps} />)
    // Time picker should be inside the hero card with options
    expect(screen.getByText('45m')).toBeDefined()
    expect(screen.getByText('60m')).toBeDefined()
    expect(screen.getByText('75m')).toBeDefined()
    expect(screen.getByText('90m')).toBeDefined()
  })

  // Collapsed section
  it('"Meer opties" section is collapsed by default', () => {
    render(<StartFlowView {...defaultProps} />)
    expect(screen.getByText('logger.more_options')).toBeDefined()
    // Template and empty training options should NOT be visible
    expect(screen.queryByText('logger.empty_training')).toBeNull()
    expect(screen.queryByText('logger.template')).toBeNull()
  })

  it('expanding "Meer opties" reveals templates option', () => {
    render(<StartFlowView {...defaultProps} />)
    fireEvent.click(screen.getByText('logger.more_options'))
    expect(screen.getByText('logger.template')).toBeDefined()
  })

  it('expanding reveals empty training option', () => {
    render(<StartFlowView {...defaultProps} />)
    fireEvent.click(screen.getByText('logger.more_options'))
    expect(screen.getByText('logger.empty_training')).toBeDefined()
  })

  it('expanding reveals split picker', () => {
    render(<StartFlowView {...defaultProps} />)
    fireEvent.click(screen.getByText('logger.more_options'))
    expect(screen.getByText('logger.change_split')).toBeDefined()
  })

  // Interactions
  it('time picker updates selected time', () => {
    const onTimeChange = vi.fn()
    render(<StartFlowView {...defaultProps} onTimeChange={onTimeChange} />)
    fireEvent.click(screen.getByText('60m'))
    expect(onTimeChange).toHaveBeenCalledWith(60)
  })

  it('clicking AI workout triggers generation', () => {
    const onStartAIWorkout = vi.fn()
    const readyState: StartFlowState = {
      ...baseState,
      availableTime: 60,
      generatedWorkout: [{ name: 'Bench Press', sets: [] }],
      selectedSplit: 'Push',
      exerciseCount: 6,
      estimatedDuration: 55,
    }
    render(
      <StartFlowView
        {...defaultProps}
        state={readyState}
        onStartAIWorkout={onStartAIWorkout}
      />
    )
    // Find and click the start button (it shows "Start Push" when ready)
    const startBtn = screen.getByRole('button', { name: /Start Push/i })
    fireEvent.click(startBtn)
    expect(onStartAIWorkout).toHaveBeenCalledTimes(1)
  })

  // Race condition regression tests
  it('time buttons are disabled while loading (analysis in progress)', () => {
    const loadingState: StartFlowState = { ...baseState, loading: true }
    render(<StartFlowView {...defaultProps} state={loadingState} />)
    const btn45 = screen.getByText('45m').closest('button')!
    const btn60 = screen.getByText('60m').closest('button')!
    expect(btn45.disabled).toBe(true)
    expect(btn60.disabled).toBe(true)
  })

  it('time buttons are disabled while generating', () => {
    const genState: StartFlowState = { ...baseState, generating: true }
    render(<StartFlowView {...defaultProps} state={genState} />)
    const btn60 = screen.getByText('60m').closest('button')!
    expect(btn60.disabled).toBe(true)
  })

  it('time buttons are enabled when idle (not loading, not generating)', () => {
    render(<StartFlowView {...defaultProps} />)
    const btn60 = screen.getByText('60m').closest('button')!
    expect(btn60.disabled).toBe(false)
  })

  it('clicking disabled time button does not trigger onTimeChange', () => {
    const onTimeChange = vi.fn()
    const loadingState: StartFlowState = { ...baseState, loading: true }
    render(<StartFlowView {...defaultProps} state={loadingState} onTimeChange={onTimeChange} />)
    fireEvent.click(screen.getByText('60m'))
    expect(onTimeChange).not.toHaveBeenCalled()
  })

  it('clicking repeat last loads previous workout', () => {
    const onRepeatLastWorkout = vi.fn()
    const lastWorkout: LastWorkoutPreview = {
      preview: 'Pull - 5 oefeningen',
      exercises: [],
    }
    render(
      <StartFlowView
        {...defaultProps}
        lastWorkout={lastWorkout}
        onRepeatLastWorkout={onRepeatLastWorkout}
      />
    )
    fireEvent.click(screen.getByText('logger.repeat_last'))
    expect(onRepeatLastWorkout).toHaveBeenCalledTimes(1)
  })
})
