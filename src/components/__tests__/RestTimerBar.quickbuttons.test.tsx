import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
        'rest_timer.skip': 'Skip',
        'rest_timer.add_time': '+30s',
        'finish_modal.minutes': 'minutes',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('RestTimerBar - Quick Duration Buttons', () => {
  const defaultProps = {
    remaining: 60,
    total: 90,
    onStop: vi.fn(),
    onSetDuration: vi.fn(),
    onAddTime: vi.fn(),
  }

  it('shows quick buttons when timer is active (remaining > 0)', () => {
    render(<RestTimerBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: '30s' })).toBeDefined()
    expect(screen.getByRole('button', { name: '60s' })).toBeDefined()
    expect(screen.getByRole('button', { name: '90s' })).toBeDefined()
    expect(screen.getByRole('button', { name: '120s' })).toBeDefined()
  })

  it('tapping 30s calls onSetDuration with 30', () => {
    const onSetDuration = vi.fn()
    render(<RestTimerBar {...defaultProps} onSetDuration={onSetDuration} />)
    fireEvent.click(screen.getByRole('button', { name: '30s' }))
    expect(onSetDuration).toHaveBeenCalledWith(30)
  })

  it('tapping 60s calls onSetDuration with 60', () => {
    const onSetDuration = vi.fn()
    render(<RestTimerBar {...defaultProps} onSetDuration={onSetDuration} />)
    fireEvent.click(screen.getByRole('button', { name: '60s' }))
    expect(onSetDuration).toHaveBeenCalledWith(60)
  })

  it('tapping 90s calls onSetDuration with 90', () => {
    const onSetDuration = vi.fn()
    render(<RestTimerBar {...defaultProps} onSetDuration={onSetDuration} />)
    fireEvent.click(screen.getByRole('button', { name: '90s' }))
    expect(onSetDuration).toHaveBeenCalledWith(90)
  })

  it('tapping 120s calls onSetDuration with 120', () => {
    const onSetDuration = vi.fn()
    render(<RestTimerBar {...defaultProps} onSetDuration={onSetDuration} />)
    fireEvent.click(screen.getByRole('button', { name: '120s' }))
    expect(onSetDuration).toHaveBeenCalledWith(120)
  })

  it('+30s button calls onAddTime with 30', () => {
    const onAddTime = vi.fn()
    render(<RestTimerBar {...defaultProps} onAddTime={onAddTime} />)
    fireEvent.click(screen.getByRole('button', { name: '+30s' }))
    expect(onAddTime).toHaveBeenCalledWith(30)
  })

  it('Skip button calls onStop', () => {
    const onStop = vi.fn()
    render(<RestTimerBar {...defaultProps} onStop={onStop} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('all quick buttons have minimum 44px touch target', () => {
    const { container } = render(<RestTimerBar {...defaultProps} />)
    const quickRow = container.querySelector('[data-testid="quick-buttons"]')!
    const buttons = quickRow.querySelectorAll('button')
    buttons.forEach(btn => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })
})
