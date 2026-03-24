import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompactRestTimer from '../../CompactRestTimer'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'rest_timer.rest': 'Rest',
        'rest_timer.skip': 'Skip',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock motion/react to render plain elements
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const filteredProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (
          key.startsWith('data-') ||
          key === 'className' ||
          key === 'role' ||
          key === 'style' ||
          key.startsWith('aria-')
        ) {
          filteredProps[key] = value
        }
      }
      return <div {...filteredProps}>{children}</div>
    },
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => {
      const filteredProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (
          key.startsWith('data-') ||
          key === 'className' ||
          key === 'role' ||
          key === 'style' ||
          key.startsWith('aria-')
        ) {
          filteredProps[key] = value
        }
      }
      return <span {...filteredProps}>{children}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock hapticFeedback
vi.mock('../../../lib/native', () => ({
  hapticFeedback: vi.fn(),
}))

describe('CompactRestTimer', () => {
  const defaultProps = {
    remaining: 83,
    total: 90,
    onStop: vi.fn(),
    onAddTime: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the countdown timer in mm:ss format', () => {
    render(<CompactRestTimer {...defaultProps} />)
    const display = screen.getByTestId('timer-display')
    expect(display.textContent).toBe('1:23')
  })

  it('shows 0:05 when remaining is 5 seconds', () => {
    render(<CompactRestTimer {...defaultProps} remaining={5} />)
    const display = screen.getByTestId('timer-display')
    expect(display.textContent).toBe('0:05')
  })

  it('renders a progress bar with width proportional to remaining/total', () => {
    // 83 remaining out of 90 total => progress = (90-83)/90 ~= 7.78%
    const { container } = render(<CompactRestTimer {...defaultProps} />)
    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toBeDefined()
    // Progress bar is rendered inside a container
    const barContainer = container.querySelector('.flex-1.h-1')
    expect(barContainer).toBeDefined()
  })

  it('+30s button calls onAddTime with 30', () => {
    const onAddTime = vi.fn()
    render(<CompactRestTimer {...defaultProps} onAddTime={onAddTime} />)
    const addBtn = screen.getByTestId('add-time-btn')
    fireEvent.click(addBtn)
    expect(onAddTime).toHaveBeenCalledWith(30)
  })

  it('Skip button calls onStop', () => {
    const onStop = vi.fn()
    render(<CompactRestTimer {...defaultProps} onStop={onStop} />)
    const skipBtn = screen.getByTestId('skip-btn')
    fireEvent.click(skipBtn)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('applies cyan text color when under 10 seconds', () => {
    render(<CompactRestTimer {...defaultProps} remaining={8} />)
    const display = screen.getByTestId('timer-display')
    expect(display.className).toContain('text-cyan-400')
  })

  it('uses white text color when above 10 seconds', () => {
    render(<CompactRestTimer {...defaultProps} remaining={30} />)
    const display = screen.getByTestId('timer-display')
    expect(display.className).toContain('text-white')
    expect(display.className).not.toContain('text-cyan-400')
  })

  it('has a timer role for accessibility', () => {
    render(<CompactRestTimer {...defaultProps} />)
    const timer = screen.getByTestId('compact-rest-timer')
    expect(timer.getAttribute('role')).toBe('timer')
  })
})
