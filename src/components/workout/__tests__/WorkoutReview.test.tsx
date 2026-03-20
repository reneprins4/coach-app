import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkoutReview } from '../WorkoutReview'
import type { AIExercise, AIWorkoutResponse } from '../../../types'

// Mock i18next - return the key as the translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        let result = key as string
        for (const [k, v] of Object.entries(opts)) {
          if (k === 'defaultValue') continue
          result = result.replace(`{{${k}}}`, String(v))
        }
        return result
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

// Mock settings
vi.mock('../../../lib/settings', () => ({
  getSettings: () => ({
    equipment: 'full_gym',
    experienceLevel: 'intermediate',
    bodyweight: '80',
  }),
}))

// Mock SwapModal
vi.mock('../SwapModal', () => ({
  default: ({ exercise, onClose }: { exercise: { name: string }; onClose: () => void }) => (
    <div data-testid="swap-modal">
      SwapModal for {exercise.name}
      <button onClick={onClose}>close-swap</button>
    </div>
  ),
}))

const mockExercises: AIExercise[] = [
  {
    name: 'Bench Press',
    sets: 4,
    reps_min: 8,
    reps_max: 10,
    weight_kg: 80,
    rpe_target: 8,
    rest_seconds: 120,
    muscle_group: 'chest',
    notes: '',
    vs_last_session: 'up',
  },
  {
    name: 'Incline DB Press',
    sets: 3,
    reps_min: 10,
    reps_max: 12,
    weight_kg: 30,
    rpe_target: 7.5,
    rest_seconds: 90,
    muscle_group: 'chest',
    notes: '',
    vs_last_session: 'same',
  },
  {
    name: 'Cable Fly',
    sets: 3,
    reps_min: 12,
    reps_max: 15,
    weight_kg: 15,
    rpe_target: 7,
    rest_seconds: 60,
    muscle_group: 'chest',
    notes: 'Squeeze at top',
    vs_last_session: 'new',
  },
  {
    name: 'OHP',
    sets: 3,
    reps_min: 8,
    reps_max: 10,
    weight_kg: 40,
    rpe_target: 8,
    rest_seconds: 120,
    muscle_group: 'shoulders',
    notes: '',
    vs_last_session: 'up',
  },
]

const mockWorkout: AIWorkoutResponse = {
  split: 'Push',
  reasoning: 'Push day focused on chest development with progressive overload.',
  exercises: mockExercises,
  estimated_duration_min: 60,
  volume_notes: 'Adequate chest volume.',
}

const defaultProps = {
  workout: mockWorkout,
  split: 'Push',
  estimatedDuration: 60,
  onStart: vi.fn(),
  onBack: vi.fn(),
  onSwapExercise: vi.fn(),
}

describe('WorkoutReview', () => {
  it('renders workout summary (split name, exercise count, duration)', () => {
    const { container } = render(<WorkoutReview {...defaultProps} />)
    // Split name in badge
    expect(screen.getByText('Push')).toBeDefined()
    // Exercise count and duration in summary area
    const summaryHtml = container.innerHTML
    expect(summaryHtml).toContain('common.exercises')
    expect(summaryHtml).toContain('aicoach.min')
  })

  it('renders all exercises with name, sets, reps, weight', () => {
    render(<WorkoutReview {...defaultProps} />)
    expect(screen.getByText('Bench Press')).toBeDefined()
    expect(screen.getByText('Incline DB Press')).toBeDefined()
    expect(screen.getByText('Cable Fly')).toBeDefined()
    expect(screen.getByText('OHP')).toBeDefined()
  })

  it('shows swap button for each exercise', () => {
    render(<WorkoutReview {...defaultProps} />)
    const swapButtons = screen.getAllByRole('button', { name: /logger\.swap_exercise/i })
    expect(swapButtons.length).toBe(4)
  })

  it('shows RPE target for each exercise', () => {
    render(<WorkoutReview {...defaultProps} />)
    // RPE 8 appears for Bench Press and OHP
    const rpe8Elements = screen.getAllByText(/RPE 8/)
    expect(rpe8Elements.length).toBeGreaterThanOrEqual(2)
    // RPE 7.5 for Incline DB Press
    expect(screen.getByText(/RPE 7\.5/)).toBeDefined()
    // RPE 7 for Cable Fly
    expect(screen.getByText(/RPE 7(?!\.)/)).toBeDefined()
  })

  it('renders "Start Workout" button', () => {
    render(<WorkoutReview {...defaultProps} />)
    expect(screen.getByRole('button', { name: /aicoach\.start_workout/i })).toBeDefined()
  })

  it('renders "Back" button', () => {
    render(<WorkoutReview {...defaultProps} />)
    expect(screen.getByRole('button', { name: /common\.back/i })).toBeDefined()
  })

  it('clicking "Start Workout" calls onStart', () => {
    const onStart = vi.fn()
    render(<WorkoutReview {...defaultProps} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /aicoach\.start_workout/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('clicking "Back" calls onBack', () => {
    const onBack = vi.fn()
    render(<WorkoutReview {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('reasoning section is collapsible', () => {
    render(<WorkoutReview {...defaultProps} />)
    // The toggle button should exist
    expect(screen.getByText('aicoach.why_this_training')).toBeDefined()
  })

  it('reasoning collapsed by default', () => {
    render(<WorkoutReview {...defaultProps} />)
    // Reasoning text should NOT be visible
    expect(screen.queryByText(mockWorkout.reasoning)).toBeNull()
  })

  it('expanding reasoning shows the text', () => {
    render(<WorkoutReview {...defaultProps} />)
    fireEvent.click(screen.getByText('aicoach.why_this_training'))
    expect(screen.getByText(mockWorkout.reasoning)).toBeDefined()
  })

  it('exercises grouped by muscle group', () => {
    render(<WorkoutReview {...defaultProps} />)
    // Muscle group headers should appear (translated via t() → returns key)
    expect(screen.getByText('muscles.chest')).toBeDefined()
    expect(screen.getByText('muscles.shoulders')).toBeDefined()
  })

  it('clicking swap opens SwapModal for that exercise', () => {
    render(<WorkoutReview {...defaultProps} />)
    const swapButtons = screen.getAllByRole('button', { name: /logger\.swap_exercise/i })
    fireEvent.click(swapButtons[0]!)
    expect(screen.getByTestId('swap-modal')).toBeDefined()
    expect(screen.getByText(/SwapModal for Bench Press/)).toBeDefined()
  })

  it('shows sets x reps format for each exercise', () => {
    render(<WorkoutReview {...defaultProps} />)
    // Bench Press row should contain sets x reps info
    const benchRow = screen.getByText('Bench Press').closest('div[class*="card"]')!
    expect(benchRow.textContent).toContain('8')
    expect(benchRow.textContent).toContain('10')
  })

  it('shows weight for each exercise', () => {
    render(<WorkoutReview {...defaultProps} />)
    expect(screen.getByText(/80kg/)).toBeDefined()
    expect(screen.getByText(/30kg/)).toBeDefined()
    expect(screen.getByText(/15kg/)).toBeDefined()
    expect(screen.getByText(/40kg/)).toBeDefined()
  })
})
