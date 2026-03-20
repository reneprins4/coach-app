import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InjuryBanner from '../InjuryBanner'
import type { ActiveInjury } from '../../lib/injuryRecovery'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'injury.area_shoulder': 'Shoulder',
        'injury.area_knee': 'Knee',
        'injury.area_lower_back': 'Lower Back',
        'injury.severity_mild': 'Mild',
        'injury.severity_moderate': 'Moderate',
        'injury.severity_severe': 'Severe',
        'injury.side_left': 'Left',
        'injury.side_right': 'Right',
        'injury.side_both': 'Both',
        'injury.status_active': 'Active',
        'injury.status_recovering': 'Recovering',
        'injury.status_resolved': 'Resolved',
        'injury.check_in_prompt': 'How does it feel?',
        'injury.days_ago': '{{days}} days ago',
        'injury.resolve': 'Resolve',
        'injury.resolve_confirm': 'Are you sure you want to mark this injury as resolved?',
        'common.close': 'Close',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
      }
      let result = translations[key] ?? key
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          result = result.replace(`{{${k}}}`, String(v))
        }
      }
      return result
    },
  }),
}))

// Mock injuryRecovery functions
vi.mock('../../lib/injuryRecovery', async () => {
  const actual = await vi.importActual<typeof import('../../lib/injuryRecovery')>('../../lib/injuryRecovery')
  return {
    ...actual,
    isCheckInDue: vi.fn(() => false),
    daysSinceInjury: vi.fn(() => 5),
  }
})

// Import after mock so we can control return values
import { isCheckInDue } from '../../lib/injuryRecovery'
const mockIsCheckInDue = vi.mocked(isCheckInDue)

function createInjury(overrides: Partial<ActiveInjury> = {}): ActiveInjury {
  return {
    id: 'inj-1',
    bodyArea: 'shoulder',
    side: 'left',
    severity: 'moderate',
    reportedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    checkIns: [],
    ...overrides,
  }
}

describe('InjuryBanner', () => {
  const defaultProps = {
    injuries: [] as ActiveInjury[],
    onCheckIn: vi.fn(),
    onResolve: vi.fn(),
  }

  it('renders nothing when no active injuries', () => {
    const { container } = render(<InjuryBanner {...defaultProps} injuries={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows injury area name and status for active injury', () => {
    const injury = createInjury()
    render(<InjuryBanner {...defaultProps} injuries={[injury]} />)
    expect(screen.getByText('Shoulder')).toBeDefined()
  })

  it('shows "How does it feel?" check-in prompt when check-in due', () => {
    mockIsCheckInDue.mockReturnValue(true)
    const injury = createInjury()
    render(<InjuryBanner {...defaultProps} injuries={[injury]} />)
    expect(screen.getByText('How does it feel?')).toBeDefined()
    mockIsCheckInDue.mockReturnValue(false)
  })

  it('shows recovering status with progress indicator', () => {
    const injury = createInjury({ status: 'recovering' })
    render(<InjuryBanner {...defaultProps} injuries={[injury]} />)
    expect(screen.getByText('Recovering')).toBeDefined()
  })

  it('shows multiple injuries if more than one active', () => {
    const injuries = [
      createInjury({ id: 'inj-1', bodyArea: 'shoulder' }),
      createInjury({ id: 'inj-2', bodyArea: 'knee' }),
    ]
    render(<InjuryBanner {...defaultProps} injuries={injuries} />)
    expect(screen.getByText('Shoulder')).toBeDefined()
    expect(screen.getByText('Knee')).toBeDefined()
  })

  it('tap opens check-in flow', async () => {
    mockIsCheckInDue.mockReturnValue(true)
    const onCheckIn = vi.fn()
    const injury = createInjury()
    const user = userEvent.setup()
    render(<InjuryBanner {...defaultProps} injuries={[injury]} onCheckIn={onCheckIn} />)
    await user.click(screen.getByText('How does it feel?'))
    expect(onCheckIn).toHaveBeenCalledWith(injury)
    mockIsCheckInDue.mockReturnValue(false)
  })

  it('dismiss button resolves injury after confirmation', async () => {
    const onResolve = vi.fn()
    const injury = createInjury()
    const user = userEvent.setup()
    render(<InjuryBanner {...defaultProps} injuries={[injury]} onResolve={onResolve} />)
    const dismissBtn = screen.getByLabelText('Resolve')

    // First click shows confirmation, does not resolve yet
    await user.click(dismissBtn)
    expect(onResolve).not.toHaveBeenCalled()

    // Second click on the confirm button actually resolves
    const confirmBtn = screen.getByText('Confirm')
    await user.click(confirmBtn)
    expect(onResolve).toHaveBeenCalledWith(injury)
  })
})
