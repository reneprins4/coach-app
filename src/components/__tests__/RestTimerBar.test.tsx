import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RestTimerBar from '../RestTimerBar'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'rest_timer.rest': 'Rest',
        'rest_timer.heavy_set': 'Heavy set',
        'rest_timer.intense_set': 'Intense set',
        'rest_timer.light_set': 'Light set',
        'rest_timer.stop': 'Stop timer',
        'finish_modal.minutes': 'minutes',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('RestTimerBar', () => {
  it('displays the formatted time remaining', () => {
    render(<RestTimerBar remaining={90} total={90} onStop={vi.fn()} />)
    expect(screen.getByText('1:30')).toBeDefined()
  })

  it('displays time with zero-padded seconds', () => {
    render(<RestTimerBar remaining={65} total={90} onStop={vi.fn()} />)
    expect(screen.getByText('1:05')).toBeDefined()
  })

  it('displays time for seconds less than 60', () => {
    render(<RestTimerBar remaining={45} total={90} onStop={vi.fn()} />)
    expect(screen.getByText('0:45')).toBeDefined()
  })

  it('shows progress bar with correct width percentage', () => {
    const { container } = render(<RestTimerBar remaining={45} total={90} onStop={vi.fn()} />)
    const progressBar = container.querySelector('.bg-cyan-500')!
    // Progress = (90 - 45) / 90 = 50%
    expect(progressBar.getAttribute('style')).toContain('width: 50%')
  })

  it('has role="timer" for accessibility', () => {
    const { container } = render(<RestTimerBar remaining={60} total={90} onStop={vi.fn()} />)
    const timer = container.querySelector('[role="timer"]')
    expect(timer).not.toBeNull()
  })

  it('has aria-label on the timer element', () => {
    const { container } = render(<RestTimerBar remaining={60} total={90} onStop={vi.fn()} />)
    const timer = container.querySelector('[role="timer"]')!
    expect(timer.getAttribute('aria-label')).toBe('Rest')
  })

  it('calls onStop when stop button is clicked', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    const { container } = render(<RestTimerBar remaining={60} total={90} onStop={onStop} />)

    const stopBtn = container.querySelector('[aria-label="Stop timer"]') as HTMLButtonElement
    await user.click(stopBtn)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('stop button meets minimum touch target size', () => {
    const { container } = render(<RestTimerBar remaining={60} total={90} onStop={vi.fn()} />)
    const btn = container.querySelector('[aria-label="Stop timer"]')!
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('shows "Heavy set" label for rest periods >= 180s', () => {
    render(<RestTimerBar remaining={180} total={180} onStop={vi.fn()} />)
    expect(screen.getByText('Heavy set')).toBeDefined()
  })

  it('shows "Rest" label for default 90s timer (non-adaptive)', () => {
    render(<RestTimerBar remaining={90} total={90} onStop={vi.fn()} />)
    expect(screen.getByText('Rest')).toBeDefined()
  })

  it('shows "Light set" label for rest periods <= 75s', () => {
    render(<RestTimerBar remaining={60} total={60} onStop={vi.fn()} />)
    expect(screen.getByText('Light set')).toBeDefined()
  })
})
