import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TrainingStoryBanner from '../TrainingStoryBanner'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'story.banner.title': `Jouw ${opts?.month ?? ''} story is klaar!`,
        'story.banner.subtitle': 'Bekijk je maandoverzicht',
        'story.banner.cta': 'Bekijk nu',
        'common.close': 'Sluiten',
      }
      return map[key] ?? key
    },
    i18n: { language: 'nl' },
  }),
}))

describe('TrainingStoryBanner', () => {
  it('renders with month name in banner', () => {
    render(
      <TrainingStoryBanner
        monthLabel="februari"
        onOpen={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText(/februari/)).toBeTruthy()
    expect(screen.getByText('Bekijk nu')).toBeTruthy()
  })

  it('calls onOpen when view button is tapped', () => {
    const onOpen = vi.fn()
    render(
      <TrainingStoryBanner
        monthLabel="februari"
        onOpen={onOpen}
        onDismiss={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Bekijk nu'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is tapped', () => {
    const onDismiss = vi.fn()
    render(
      <TrainingStoryBanner
        monthLabel="februari"
        onOpen={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    const closeBtn = screen.getByLabelText('Sluiten')
    fireEvent.click(closeBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows subtitle text', () => {
    render(
      <TrainingStoryBanner
        monthLabel="maart"
        onOpen={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('Bekijk je maandoverzicht')).toBeTruthy()
  })
})
