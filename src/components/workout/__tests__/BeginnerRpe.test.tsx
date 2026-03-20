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
        'rpe.info': 'What is RPE?',
        'rpe.explanation_title': 'How hard was your set?',
        'rpe.explanation_6': 'You could do 4+ more reps',
        'rpe.explanation_7': 'You could do 3 more reps',
        'rpe.explanation_8': 'You could do 2 more reps',
        'rpe.explanation_9': 'You could do 1 more rep',
        'rpe.explanation_10': 'You couldn\'t do any more',
        'rpe.explanation_summary': 'RPE helps the app understand how hard you train',
        'rpe_simple_easy': 'Easy',
        'rpe_simple_medium': 'Medium',
        'rpe_simple_hard': 'Hard',
        'rpe.beginner_explanation_title': 'How hard was your set?',
        'rpe.beginner_explanation_easy': 'You could easily do more',
        'rpe.beginner_explanation_medium': 'It was challenging but doable',
        'rpe.beginner_explanation_hard': 'You could barely finish',
        'rpe.beginner_explanation_summary': 'This helps the app adjust your next workout',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('RPE in Beginner Mode', () => {
  it('shows Easy/Medium/Hard buttons when beginner mode is active', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} beginnerMode={true} />)
    expect(screen.getByText('Easy')).toBeDefined()
    expect(screen.getByText('Medium')).toBeDefined()
    expect(screen.getByText('Hard')).toBeDefined()
    // Should NOT show number buttons
    expect(screen.queryByText('10')).toBeNull()
  })

  it('shows number buttons 6-10 when beginner mode is inactive', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} beginnerMode={false} />)
    expect(screen.getByRole('button', { name: /^6/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^7/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^8/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^9/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^10/i })).toBeDefined()
  })

  it('tapping Easy sets RPE to 6', () => {
    const onChange = vi.fn()
    render(<RpeButtons value={null} onChange={onChange} beginnerMode={true} />)
    fireEvent.click(screen.getByText('Easy'))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('tapping Medium sets RPE to 7.5', () => {
    const onChange = vi.fn()
    render(<RpeButtons value={null} onChange={onChange} beginnerMode={true} />)
    fireEvent.click(screen.getByText('Medium'))
    expect(onChange).toHaveBeenCalledWith(7.5)
  })

  it('tapping Hard sets RPE to 9', () => {
    const onChange = vi.fn()
    render(<RpeButtons value={null} onChange={onChange} beginnerMode={true} />)
    fireEvent.click(screen.getByText('Hard'))
    expect(onChange).toHaveBeenCalledWith(9)
  })

  it('selected button shows active styling', () => {
    render(<RpeButtons value={6} onChange={vi.fn()} beginnerMode={true} />)
    const easyButton = screen.getByText('Easy').closest('button')!
    expect(easyButton.className).toContain('ring-2')
  })

  it('buttons have minimum 44px touch target', () => {
    const { container } = render(<RpeButtons value={null} onChange={vi.fn()} beginnerMode={true} />)
    const buttons = container.querySelectorAll('button[aria-pressed]')
    expect(buttons.length).toBe(3)
    buttons.forEach(btn => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })
})
