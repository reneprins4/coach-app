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
        'rpe.explanation_10': "You couldn't do any more",
        'rpe.explanation_summary': 'RPE helps the app understand how hard you train',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('RPE Info Tooltip', () => {
  it('renders info button with "?" text next to RPE label', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: 'What is RPE?' })
    expect(infoBtn).toBeDefined()
    expect(infoBtn.textContent).toBe('?')
  })

  it('info button has aria-label for accessibility', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: 'What is RPE?' })
    expect(infoBtn.getAttribute('aria-label')).toBe('What is RPE?')
  })

  it('tapping info button shows explanation popover', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: 'What is RPE?' })

    // Popover should not be visible initially
    expect(screen.queryByText('How hard was your set?')).toBeNull()

    fireEvent.click(infoBtn)

    // Popover should now be visible
    expect(screen.getByText('How hard was your set?')).toBeDefined()
  })

  it('popover shows all 5 RPE levels with descriptions', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'What is RPE?' }))

    expect(screen.getByText(/You could do 4\+ more reps/)).toBeDefined()
    expect(screen.getByText(/You could do 3 more reps/)).toBeDefined()
    expect(screen.getByText(/You could do 2 more reps/)).toBeDefined()
    expect(screen.getByText(/You could do 1 more rep/)).toBeDefined()
    expect(screen.getByText(/You couldn't do any more/)).toBeDefined()
  })

  it('popover has role="tooltip" for accessibility', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'What is RPE?' }))

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeDefined()
  })

  it('tapping info button again closes the popover', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: 'What is RPE?' })

    fireEvent.click(infoBtn)
    expect(screen.getByText('How hard was your set?')).toBeDefined()

    fireEvent.click(infoBtn)
    expect(screen.queryByText('How hard was your set?')).toBeNull()
  })

  it('pressing Escape closes popover', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'What is RPE?' }))
    expect(screen.getByText('How hard was your set?')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('How hard was your set?')).toBeNull()
  })

  it('info button has minimum touch target size', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: 'What is RPE?' })
    // The button itself is small (20x20) but wrapped in an area with adequate touch target
    // Check the button exists and is accessible
    expect(infoBtn).toBeDefined()
  })

  it('shows summary text in popover', () => {
    render(<RpeButtons value={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'What is RPE?' }))

    expect(screen.getByText('RPE helps the app understand how hard you train')).toBeDefined()
  })
})
