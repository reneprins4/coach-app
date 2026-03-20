import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareCard from '../ShareCard'
import type { ShareCardData } from '../../lib/shareCard'

function makeCardData(overrides: Partial<ShareCardData> = {}): ShareCardData {
  return {
    date: 'vrijdag 20 maart',
    split: 'Push',
    duration: 45,
    volume: '12.5t',
    sets: 24,
    exercises: ['Bench Press', 'Incline DB Press', 'Cable Fly', 'Tricep Pushdown'],
    extraExercises: 0,
    prs: [],
    streak: 7,
    branding: 'kravex.app',
    ...overrides,
  }
}

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'finish_modal.minutes': 'min',
        'finish_modal.volume': 'vol',
        'common.sets': 'sets',
        'share.new_records': 'New records',
        'share.streak': 'day streak',
        'share.more_exercises': `+${opts?.count ?? 0} more`,
        'share.screenshot_hint': 'Take a screenshot to share',
        'share.share_button': 'Share',
        'share.branding': 'kravex.app',
      }
      return map[key] ?? key
    },
  }),
}))

describe('ShareCard Component', () => {
  it('renders workout stats (duration, volume, sets)', () => {
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} />)
    expect(screen.getByText('45')).toBeDefined()
    expect(screen.getByText('12.5t')).toBeDefined()
    expect(screen.getByText('24')).toBeDefined()
  })

  it('renders exercise list', () => {
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} />)
    expect(screen.getByText('Bench Press')).toBeDefined()
    expect(screen.getByText('Incline DB Press')).toBeDefined()
    expect(screen.getByText('Cable Fly')).toBeDefined()
    expect(screen.getByText('Tricep Pushdown')).toBeDefined()
  })

  it('renders PRs section when PRs exist', () => {
    const data = makeCardData({
      prs: [{ exercise: 'Bench Press', weight: 85 }],
    })
    render(<ShareCard data={data} onClose={vi.fn()} />)
    expect(screen.getByText('New records')).toBeDefined()
    expect(screen.getByText('85kg')).toBeDefined()
  })

  it('hides PRs section when no PRs', () => {
    render(<ShareCard data={makeCardData({ prs: [] })} onClose={vi.fn()} />)
    expect(screen.queryByText('New records')).toBeNull()
  })

  it('renders Kravex branding at bottom', () => {
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} />)
    expect(screen.getByText('kravex.app')).toBeDefined()
  })

  it('renders date', () => {
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} />)
    expect(screen.getByText('vrijdag 20 maart')).toBeDefined()
  })

  it('share button calls onShare', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} onShare={onShare} />)
    const shareBtn = screen.getByRole('button', { name: /share/i })
    await user.click(shareBtn)
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('has accessible close button', () => {
    render(<ShareCard data={makeCardData()} onClose={vi.fn()} />)
    const closeBtn = screen.getByRole('button', { name: /close|sluiten/i })
    expect(closeBtn).toBeDefined()
  })

  it('renders extra exercises count when truncated', () => {
    const data = makeCardData({ extraExercises: 3 })
    render(<ShareCard data={data} onClose={vi.fn()} />)
    expect(screen.getByText('+3 more')).toBeDefined()
  })

  it('renders streak badge when streak > 1', () => {
    render(<ShareCard data={makeCardData({ streak: 7 })} onClose={vi.fn()} />)
    expect(screen.getByText('7')).toBeDefined()
    expect(screen.getByText('day streak')).toBeDefined()
  })

  it('hides streak when streak is 0 or 1', () => {
    render(<ShareCard data={makeCardData({ streak: 0 })} onClose={vi.fn()} />)
    expect(screen.queryByText('day streak')).toBeNull()
  })
})
