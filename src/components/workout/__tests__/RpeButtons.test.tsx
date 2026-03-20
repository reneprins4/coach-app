import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RpeButtons from '../RpeButtons'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'rpe.easy': 'Easy',
        'rpe.ok': 'OK',
        'rpe.hard': 'Hard',
        'rpe.very_hard': 'Very Hard',
        'rpe.max': 'Max',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('RpeButtons', () => {
  it('renders 5 RPE buttons for values 6-10', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /6/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /7/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /8/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /9/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /10/i })).toBeDefined()
  })

  it('no button selected by default when rpe is null', () => {
    const { container } = render(<RpeButtons value={null} onChange={vi.fn()} />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      // None should have the active/selected ring styling
      expect(btn.className).not.toContain('border-2')
    })
  })

  it('tapping button 8 calls onChange with 8', () => {
    const onChange = vi.fn()
    render(<RpeButtons value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /^8/i }))
    expect(onChange).toHaveBeenCalledWith(8)
  })

  it('tapping already-selected button calls onChange with null (deselect)', () => {
    const onChange = vi.fn()
    render(<RpeButtons value={8} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /^8/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('selected button has active/highlighted styling', () => {
    render(<RpeButtons value={8} onChange={vi.fn()} />)
    const btn8 = screen.getByRole('button', { name: /^8/i })
    expect(btn8.className).toContain('border-2')
  })

  it('unselected buttons have inactive styling', () => {
    render(<RpeButtons value={8} onChange={vi.fn()} />)
    const btn6 = screen.getByRole('button', { name: /^6/i })
    const btn7 = screen.getByRole('button', { name: /^7/i })
    expect(btn6.className).not.toContain('border-2')
    expect(btn7.className).not.toContain('border-2')
  })

  it('all RPE value buttons have minimum 44x44px touch target', () => {
    const { container } = render(<RpeButtons value={null} onChange={vi.fn()} />)
    const rpeButtons = container.querySelectorAll('button[aria-pressed]')
    expect(rpeButtons.length).toBe(5)
    rpeButtons.forEach(btn => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })

  it('shows RPE descriptors: 6=Easy, 8=Hard, 10=Max', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    expect(screen.getByText('Easy')).toBeDefined()
    expect(screen.getByText('Hard')).toBeDefined()
    expect(screen.getByText('Max')).toBeDefined()
  })
})
