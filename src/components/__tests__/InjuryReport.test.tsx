import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InjuryReport from '../InjuryReport'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'injury.report_title': 'Report Injury',
        'injury.select_area': 'Select area',
        'injury.select_severity': 'Select severity',
        'injury.select_side': 'Select side',
        'injury.area_shoulder': 'Shoulder',
        'injury.area_knee': 'Knee',
        'injury.area_lower_back': 'Lower Back',
        'injury.area_elbow': 'Elbow',
        'injury.area_wrist': 'Wrist',
        'injury.area_hip': 'Hip',
        'injury.area_neck': 'Neck',
        'injury.area_ankle': 'Ankle',
        'injury.severity_mild': 'Mild',
        'injury.severity_moderate': 'Moderate',
        'injury.severity_severe': 'Severe',
        'injury.side_left': 'Left',
        'injury.side_right': 'Right',
        'injury.side_both': 'Both',
        'injury.submit': 'Report',
        'common.close': 'Close',
        'common.back': 'Back',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock useModalA11y
vi.mock('../../hooks/useModalA11y', () => ({
  useModalA11y: vi.fn(),
}))

describe('InjuryReport Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onReport: vi.fn(),
  }

  function renderModal(props = {}) {
    return render(<InjuryReport {...defaultProps} {...props} />)
  }

  it('renders body area selection (8 areas)', () => {
    renderModal()
    const areas = ['Shoulder', 'Knee', 'Lower Back', 'Elbow', 'Wrist', 'Hip', 'Neck', 'Ankle']
    for (const area of areas) {
      expect(screen.getByText(area)).toBeDefined()
    }
  })

  it('each area is a clickable button with localized name', () => {
    renderModal()
    const buttons = screen.getAllByRole('button')
    // 8 area buttons + 1 close button = 9
    expect(buttons.length).toBeGreaterThanOrEqual(9)
    expect(screen.getByText('Shoulder')).toBeDefined()
    expect(screen.getByText('Knee')).toBeDefined()
  })

  it('selecting area advances to severity step', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Shoulder'))
    // After selecting area, severity step should appear
    expect(screen.getByText('Mild')).toBeDefined()
    expect(screen.getByText('Moderate')).toBeDefined()
    expect(screen.getByText('Severe')).toBeDefined()
  })

  it('renders severity options (mild, moderate, severe)', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Shoulder'))
    expect(screen.getByText('Mild')).toBeDefined()
    expect(screen.getByText('Moderate')).toBeDefined()
    expect(screen.getByText('Severe')).toBeDefined()
  })

  it('selecting severity advances to side step', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Shoulder'))
    await user.click(screen.getByText('Moderate'))
    expect(screen.getByText('Left')).toBeDefined()
    expect(screen.getByText('Right')).toBeDefined()
    expect(screen.getByText('Both')).toBeDefined()
  })

  it('renders side options (left, right, both)', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByText('Shoulder'))
    await user.click(screen.getByText('Mild'))
    expect(screen.getByText('Left')).toBeDefined()
    expect(screen.getByText('Right')).toBeDefined()
    expect(screen.getByText('Both')).toBeDefined()
  })

  it('submit button calls onReport with area, severity, side', async () => {
    const onReport = vi.fn()
    const user = userEvent.setup()
    renderModal({ onReport })
    await user.click(screen.getByText('Knee'))
    await user.click(screen.getByText('Severe'))
    await user.click(screen.getByText('Left'))
    expect(onReport).toHaveBeenCalledWith('knee', 'severe', 'left')
  })

  it('back button goes to previous step', async () => {
    const user = userEvent.setup()
    renderModal()
    // Go to step 2
    await user.click(screen.getByText('Shoulder'))
    expect(screen.getByText('Mild')).toBeDefined()
    // Go back
    await user.click(screen.getByLabelText('Back'))
    // Should be back at area selection
    expect(screen.getByText('Shoulder')).toBeDefined()
    expect(screen.getByText('Knee')).toBeDefined()
  })

  it('close button calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has role="dialog" and aria-modal', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('ESC key closes modal', async () => {
    const onClose = vi.fn()
    // useModalA11y handles ESC — test the hook integration
    // Since we mock useModalA11y, we test the keyboard handler directly
    renderModal({ onClose })
    const user = userEvent.setup()
    await user.keyboard('{Escape}')
    // useModalA11y is mocked, but the component also has its own handler
    expect(onClose).toHaveBeenCalled()
  })

  it('returns null when not open', () => {
    const { container } = render(
      <InjuryReport isOpen={false} onClose={vi.fn()} onReport={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })
})
