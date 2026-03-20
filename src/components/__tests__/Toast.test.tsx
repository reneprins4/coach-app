import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/user-event'
import Toast from '../Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the message text', () => {
    render(<Toast message="Workout saved" />)
    expect(screen.getByText('Workout saved')).toBeDefined()
  })

  it('has role="status" and aria-live="polite" for accessibility', () => {
    const { container } = render(<Toast message="Accessible toast" />)
    const el = container.querySelector('[role="status"]')!
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-live')).toBe('polite')
  })

  it('does not render an action button when action is not provided', () => {
    const { container } = render(<Toast message="No action" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('shows action button when action prop is provided', () => {
    render(<Toast message="Deleted" action="Undo" onAction={vi.fn()} />)
    expect(screen.getByText('Undo')).toBeDefined()
    expect(screen.getByText('Undo').tagName).toBe('BUTTON')
  })

  it('calls onAction when the action button is clicked', () => {
    const onAction = vi.fn()
    render(<Toast message="Deleted" action="Undo" onAction={onAction} />)

    act(() => {
      screen.getByText('Undo').click()
    })
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after the default duration (4000ms)', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Auto dismiss" onDismiss={onDismiss} />)

    // Before duration elapses
    act(() => { vi.advanceTimersByTime(3999) })
    expect(onDismiss).not.toHaveBeenCalled()

    // After duration + exit animation (300ms)
    act(() => { vi.advanceTimersByTime(1) })
    act(() => { vi.advanceTimersByTime(300) })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after a custom duration', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Quick toast" onDismiss={onDismiss} duration={1000} />)

    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { vi.advanceTimersByTime(300) })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss after action button triggers dismiss', () => {
    const onDismiss = vi.fn()
    const onAction = vi.fn()
    render(
      <Toast message="Test" action="Undo" onAction={onAction} onDismiss={onDismiss} />
    )

    act(() => { screen.getByText('Undo').click() })
    act(() => { vi.advanceTimersByTime(300) }) // exit animation
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
