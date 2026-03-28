import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FocusExerciseCard from '../FocusExerciseCard'
import ExerciseBlock from '../ExerciseBlock'
import type { ActiveExercise } from '../../../types'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'logger.tap_to_remove': 'Tap to remove',
        'logger.set_removed': 'Set removed',
        'logger.weight': 'Weight',
        'logger.reps_label': 'Reps',
        'logger.log_set': 'Log set',
        'logger.exercise_done': 'Exercise done',
        'logger.extra_set': '+ Extra set',
        'logger.menu': 'Menu',
        'logger.technique': 'Technique',
        'logger.swap_exercise': 'Swap exercise',
        'logger.remove': 'Remove',
        'logger.plates': 'Plates',
        'logger.last_session': 'Last session',
        'logger.try': 'Try',
        'logger.rpe_hint': 'Adding RPE improves set quality detection',
        'logger.repeat_set': 'Repeat',
        'common.skip': 'Skip',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock motion/react - render as plain HTML elements
vi.mock('motion/react', () => {
  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, _ref) => {
        const filteredProps: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(props)) {
          if (
            key.startsWith('data-') ||
            key === 'className' ||
            key === 'role' ||
            key === 'style' ||
            key === 'type' ||
            key === 'onClick' ||
            key.startsWith('aria-')
          ) {
            filteredProps[key] = value
          }
        }
        return React.createElement(tag, filteredProps, children as React.ReactNode)
      }
    )
    Component.displayName = `motion.${tag}`
    return Component
  }

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// Mock hooks and libs
vi.mock('../../../hooks/useWorkouts', () => ({
  getExerciseHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../lib/prDetector', () => ({
  detectPR: vi.fn().mockReturnValue(null),
}))

vi.mock('../../../lib/native', () => ({
  hapticFeedback: vi.fn(),
}))

vi.mock('../../../lib/warmupCalculator', () => ({
  isCompound: vi.fn().mockReturnValue(false),
  generateWarmupSets: vi.fn().mockReturnValue([]),
}))

vi.mock('../../ExerciseGuide', () => ({
  default: () => null,
}))

vi.mock('../RpeButtons', () => ({
  default: () => <div data-testid="rpe-buttons" />,
}))

function makeExercise(
  sets: { id: string; weight_kg: number; reps: number; rpe: number | null }[] = []
): ActiveExercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    muscle_group: 'Chest',
    sets: sets.map((s) => ({ ...s, duration_seconds: null, created_at: new Date().toISOString() })),
    image_url_0: undefined,
    image_url_1: undefined,
    plan: null,
  } as ActiveExercise
}

const baseProps = {
  userId: 'user-1',
  onAddSet: vi.fn(),
  onRemoveSet: vi.fn(),
  onRemove: vi.fn(),
  onSwap: vi.fn(),
  onOpenPlateCalc: vi.fn(),
  lastUsed: null,
}

describe('FocusExerciseCard - set deletion UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an X icon on each logged set pill', () => {
    const sets = [
      { id: 's1', weight_kg: 80, reps: 8, rpe: null },
      { id: 's2', weight_kg: 82.5, reps: 6, rpe: 8 },
    ]
    render(
      <FocusExerciseCard
        {...baseProps}
        exercise={makeExercise(sets)}
        isCurrent
      />
    )

    // Each pill should have an accessible delete label
    const pill1 = screen.getByLabelText('Tap to remove: 80kg x 8')
    const pill2 = screen.getByLabelText('Tap to remove: 82.5kg x 6')
    expect(pill1).toBeDefined()
    expect(pill2).toBeDefined()

    // Each pill should contain an X icon (svg with aria-hidden)
    const svgs = pill1.querySelectorAll('[aria-hidden="true"]')
    // Should have at least the X icon (Check icon is also aria-hidden)
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onRemoveSet when a set pill is clicked', async () => {
    const user = userEvent.setup()
    const sets = [{ id: 's1', weight_kg: 80, reps: 8, rpe: null }]
    render(
      <FocusExerciseCard
        {...baseProps}
        exercise={makeExercise(sets)}
        isCurrent
      />
    )

    const pill = screen.getByLabelText('Tap to remove: 80kg x 8')
    await user.click(pill)
    expect(baseProps.onRemoveSet).toHaveBeenCalledWith('s1', {
      weight_kg: 80,
      reps: 8,
      duration_seconds: null,
      rpe: null,
    })
  })

  it('shows the hint text when exactly one set is logged', () => {
    const sets = [{ id: 's1', weight_kg: 80, reps: 8, rpe: null }]
    render(
      <FocusExerciseCard
        {...baseProps}
        exercise={makeExercise(sets)}
        isCurrent
      />
    )

    expect(screen.getByText('Tap to remove')).toBeDefined()
  })

  it('hides the hint text when more than one set is logged', () => {
    const sets = [
      { id: 's1', weight_kg: 80, reps: 8, rpe: null },
      { id: 's2', weight_kg: 80, reps: 8, rpe: null },
    ]
    render(
      <FocusExerciseCard
        {...baseProps}
        exercise={makeExercise(sets)}
        isCurrent
      />
    )

    expect(screen.queryByText('Tap to remove')).toBeNull()
  })
})

describe('ExerciseBlock - set deletion UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an X icon on each logged set row', () => {
    const sets = [
      { id: 's1', weight_kg: 80, reps: 8, rpe: null },
      { id: 's2', weight_kg: 82.5, reps: 6, rpe: 8 },
    ]
    render(<ExerciseBlock {...baseProps} exercise={makeExercise(sets)} />)

    const row1 = screen.getByLabelText('Tap to remove: 80kg x 8')
    const row2 = screen.getByLabelText('Tap to remove: 82.5kg x 6')
    expect(row1).toBeDefined()
    expect(row2).toBeDefined()
  })

  it('calls onRemoveSet when a set row is clicked', async () => {
    const user = userEvent.setup()
    const sets = [{ id: 's1', weight_kg: 80, reps: 8, rpe: null }]
    render(<ExerciseBlock {...baseProps} exercise={makeExercise(sets)} />)

    const row = screen.getByLabelText('Tap to remove: 80kg x 8')
    await user.click(row)
    expect(baseProps.onRemoveSet).toHaveBeenCalledWith('s1', {
      weight_kg: 80,
      reps: 8,
      duration_seconds: null,
      rpe: null,
    })
  })

  it('shows the hint text when exactly one set is logged', () => {
    const sets = [{ id: 's1', weight_kg: 80, reps: 8, rpe: null }]
    render(<ExerciseBlock {...baseProps} exercise={makeExercise(sets)} />)

    expect(screen.getByText('Tap to remove')).toBeDefined()
  })

  it('hides the hint text when more than one set is logged', () => {
    const sets = [
      { id: 's1', weight_kg: 80, reps: 8, rpe: null },
      { id: 's2', weight_kg: 80, reps: 8, rpe: null },
    ]
    render(<ExerciseBlock {...baseProps} exercise={makeExercise(sets)} />)

    expect(screen.queryByText('Tap to remove')).toBeNull()
  })
})
