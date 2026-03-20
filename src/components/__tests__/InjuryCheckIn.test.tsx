import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import InjuryCheckIn from '../InjuryCheckIn'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'injury.feeling_worse': 'Worse',
        'injury.feeling_same': 'Same',
        'injury.feeling_better': 'Better',
        'injury.feeling_recovered': 'Recovered',
        'injury.feedback_worse': 'Take it easy. Consider seeing a professional.',
        'injury.feedback_same': 'Hang in there. Recovery takes time.',
        'injury.feedback_better': 'Great progress! Keep it up.',
        'injury.feedback_recovered': 'Congratulations! You are fully recovered.',
        'injury.check_in_title': 'How does it feel?',
        'common.close': 'Close',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock useModalA11y
vi.mock('../../hooks/useModalA11y', () => ({
  useModalA11y: vi.fn(),
}))

describe('InjuryCheckIn', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCheckIn: vi.fn(),
    injuryArea: 'shoulder' as const,
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 4 feeling options (worse, same, better, recovered)', () => {
    render(<InjuryCheckIn {...defaultProps} />)
    expect(screen.getByText('Worse')).toBeDefined()
    expect(screen.getByText('Same')).toBeDefined()
    expect(screen.getByText('Better')).toBeDefined()
    expect(screen.getByText('Recovered')).toBeDefined()
  })

  it('each option has icon and label', () => {
    render(<InjuryCheckIn {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    // Lucide icons render as SVGs; verify all four labels are present
    expect(dialog.textContent).toContain('Worse')
    expect(dialog.textContent).toContain('Same')
    expect(dialog.textContent).toContain('Better')
    expect(dialog.textContent).toContain('Recovered')
    // Icons render as SVG elements
    const svgs = dialog.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(4)
  })

  it('tapping option calls onCheckIn with feeling', () => {
    const onCheckIn = vi.fn()
    render(<InjuryCheckIn {...defaultProps} onCheckIn={onCheckIn} />)
    act(() => {
      fireEvent.click(screen.getByText('Better'))
    })
    expect(onCheckIn).toHaveBeenCalledWith('better')
  })

  it('shows encouragement for "better"', () => {
    render(<InjuryCheckIn {...defaultProps} />)
    act(() => {
      fireEvent.click(screen.getByText('Better'))
    })
    expect(screen.getByText('Great progress! Keep it up.')).toBeDefined()
  })

  it('shows caution for "worse"', () => {
    render(<InjuryCheckIn {...defaultProps} />)
    act(() => {
      fireEvent.click(screen.getByText('Worse'))
    })
    expect(screen.getByText('Take it easy. Consider seeing a professional.')).toBeDefined()
  })

  it('shows congratulation for "recovered"', () => {
    render(<InjuryCheckIn {...defaultProps} />)
    act(() => {
      fireEvent.click(screen.getByText('Recovered'))
    })
    expect(screen.getByText('Congratulations! You are fully recovered.')).toBeDefined()
  })

  it('auto-closes after 3.5 seconds when feedback shown', () => {
    const onClose = vi.fn()
    render(<InjuryCheckIn {...defaultProps} onClose={onClose} />)
    act(() => {
      fireEvent.click(screen.getByText('Better'))
    })
    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(3500) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns null when not open', () => {
    const { container } = render(
      <InjuryCheckIn {...defaultProps} isOpen={false} />
    )
    expect(container.innerHTML).toBe('')
  })
})
