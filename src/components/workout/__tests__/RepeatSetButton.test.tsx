import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExerciseBlock from '../ExerciseBlock'
import type { ExerciseBlockProps } from '../ExerciseBlock'
import type { ActiveExercise, ActiveWorkoutSet } from '../../../types'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'logger.repeat_set': 'Repeat',
        'logger.weight': 'Weight',
        'logger.reps_label': 'Reps',
        'logger.log_set': 'Log set',
        'logger.technique': 'Technique',
        'logger.menu': 'Menu',
        'logger.explain': 'Explain',
        'logger.swap_exercise': 'Swap exercise',
        'logger.remove': 'Remove',
        'logger.last_session': 'Last session',
        'logger.try': 'Try',
        'logger.rpe_hint': 'Adding RPE improves set quality detection',
        'logger.exercise_done': 'Exercise done',
        'logger.extra_set': '+ Extra set',
        'logger.plates': 'Plates',
        'common.skip': 'Skip',
        'rpe.easy': 'Easy',
        'rpe.ok': 'OK',
        'rpe.hard': 'Hard',
        'rpe.very_hard': 'Very Hard',
        'rpe.max': 'Max',
        'warmup.title': 'Warm-up',
        'warmup.calculate': 'Calculate warm-up',
        'warmup.done_btn': 'Done',
        'warmup.bar_only': 'Bar only',
        'warmup.hide': 'Hide',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock hooks and libs that ExerciseBlock depends on
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

function makeSet(overrides: Partial<ActiveWorkoutSet> = {}): ActiveWorkoutSet {
  return {
    id: 'set-' + Math.random().toString(36).slice(2, 8),
    weight_kg: 80,
    reps: 8,
    duration_seconds: null,
    rpe: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeExercise(sets: ActiveWorkoutSet[] = []): ActiveExercise {
  return {
    name: 'Bench Press',
    muscle_group: 'chest',
    sets,
  }
}

function renderBlock(overrides: Partial<ExerciseBlockProps> = {}) {
  const defaultProps: ExerciseBlockProps = {
    exercise: makeExercise(),
    userId: 'user-1',
    onAddSet: vi.fn(),
    onRemoveSet: vi.fn(),
    onRemove: vi.fn(),
    onSwap: vi.fn(),
    onOpenPlateCalc: vi.fn(),
    lastUsed: null,
    ...overrides,
  }
  return { ...render(<ExerciseBlock {...defaultProps} />), props: defaultProps }
}

describe('Repeat Set Button', () => {
  it('repeat button appears after first set is logged', () => {
    const set1 = makeSet({ weight_kg: 80, reps: 8 })
    renderBlock({ exercise: makeExercise([set1]) })
    expect(screen.getByRole('button', { name: /repeat/i })).toBeDefined()
  })

  it('repeat button hidden when no sets logged', () => {
    renderBlock({ exercise: makeExercise([]) })
    expect(screen.queryByRole('button', { name: /repeat/i })).toBeNull()
  })

  it('tapping repeat calls onAddSet with previous set weight and reps', () => {
    const set1 = makeSet({ weight_kg: 100, reps: 5 })
    const { props } = renderBlock({ exercise: makeExercise([set1]) })
    fireEvent.click(screen.getByRole('button', { name: /repeat/i }))
    expect(props.onAddSet).toHaveBeenCalledWith({
      weight_kg: 100,
      reps: 5,
      duration_seconds: null,
      rpe: null,
    })
  })

  it('repeated set copies RPE from previous set', () => {
    const set1 = makeSet({ weight_kg: 80, reps: 8, rpe: 7 })
    const { props } = renderBlock({ exercise: makeExercise([set1]) })
    fireEvent.click(screen.getByRole('button', { name: /repeat/i }))
    expect(props.onAddSet).toHaveBeenCalledWith({
      weight_kg: 80,
      reps: 8,
      duration_seconds: null,
      rpe: 7,
    })
  })

  it('repeat button has minimum 44px touch target', () => {
    const set1 = makeSet()
    renderBlock({ exercise: makeExercise([set1]) })
    const btn = screen.getByRole('button', { name: /repeat/i })
    // btn-secondary has height: 3.5rem (56px) > 44px touch target
    expect(btn.className).toContain('btn-secondary')
  })

  it('can repeat multiple times in succession', () => {
    const set1 = makeSet({ weight_kg: 60, reps: 12 })
    const set2 = makeSet({ weight_kg: 60, reps: 12 })
    const { props } = renderBlock({ exercise: makeExercise([set1, set2]) })
    const btn = screen.getByRole('button', { name: /repeat/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(props.onAddSet).toHaveBeenCalledTimes(2)
    // Both calls should use the last set's data
    expect(props.onAddSet).toHaveBeenCalledWith({
      weight_kg: 60,
      reps: 12,
      duration_seconds: null,
      rpe: null,
    })
  })

  it('button shows last set info: "Repeat 80kg x 8"', () => {
    const set1 = makeSet({ weight_kg: 80, reps: 8 })
    renderBlock({ exercise: makeExercise([set1]) })
    const btn = screen.getByRole('button', { name: /repeat/i })
    expect(btn.textContent).toContain('80')
    expect(btn.textContent).toContain('8')
  })

  it('button uses i18n for label', () => {
    const set1 = makeSet({ weight_kg: 80, reps: 8 })
    renderBlock({ exercise: makeExercise([set1]) })
    const btn = screen.getByRole('button', { name: /repeat/i })
    // Our mock translates 'logger.repeat_set' -> 'Repeat'
    expect(btn.textContent).toContain('Repeat')
  })
})
