import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlateCalculator from '../PlateCalculator'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'plate_calc.title': 'Plate Calculator',
        'plate_calc.total_weight': 'Total weight',
        'plate_calc.bar_weight': 'Bar weight',
        'plate_calc.per_side': 'Per side',
        'plate_calc.bar_only': 'Just the bar',
        'plate_calc.too_light': 'Weight is less than the bar',
        'plate_calc.not_exact': 'Not exactly achievable',
        'common.close': 'Close',
      }
      return translations[key] ?? key
    },
  }),
}))

// Mock useModalA11y
vi.mock('../../hooks/useModalA11y', () => ({
  useModalA11y: vi.fn(),
}))

function renderCalculator(targetWeight?: number) {
  const onClose = vi.fn()
  const result = render(<PlateCalculator targetWeight={targetWeight} onClose={onClose} />)
  return { ...result, onClose }
}

describe('PlateCalculator', () => {
  it('renders with dialog role and accessible title', () => {
    renderCalculator(100)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('Plate Calculator')).toBeDefined()
  })

  it('has a close button with aria-label inside the dialog', () => {
    renderCalculator()
    const dialog = screen.getByRole('dialog')
    const closeBtn = within(dialog).getAllByLabelText('Close')
    expect(closeBtn.length).toBeGreaterThanOrEqual(1)
  })

  it('calculates correct plates for 60kg (20kg bar)', () => {
    renderCalculator(60)
    const dialog = screen.getByRole('dialog')
    // 60kg - 20kg bar = 40kg / 2 = 20kg per side => 1x 20kg
    expect(within(dialog).getByText(/1\u00d7/)).toBeDefined()
    expect(within(dialog).getByText('20kg', { selector: '.text-lg' })).toBeDefined()
  })

  it('calculates correct plates for 100kg (20kg bar)', () => {
    renderCalculator(100)
    const dialog = screen.getByRole('dialog')
    // 100kg - 20kg bar = 80kg / 2 = 40kg per side => 1x25 + 1x15
    const plateElements = dialog.querySelectorAll('.bg-cyan-500\\/15')
    const plateTexts = Array.from(plateElements).map(el => el.textContent)
    expect(plateTexts.some(t => t?.includes('25kg'))).toBe(true)
    expect(plateTexts.some(t => t?.includes('15kg'))).toBe(true)
  })

  it('calculates correct plates for 140kg (20kg bar)', () => {
    renderCalculator(140)
    const dialog = screen.getByRole('dialog')
    // 140kg - 20kg bar = 120kg / 2 = 60kg per side => 2x25 + 1x10
    const plateElements = dialog.querySelectorAll('.bg-cyan-500\\/15')
    const plateTexts = Array.from(plateElements).map(el => el.textContent)
    expect(plateTexts.some(t => t?.includes('25kg'))).toBe(true)
    expect(plateTexts.some(t => t?.includes('10kg'))).toBe(true)
    expect(plateTexts.some(t => t?.includes('2\u00d7'))).toBe(true)
  })

  it('shows "Just the bar" for 20kg with default bar weight', () => {
    renderCalculator(20)
    expect(screen.getByText(/Just the bar/)).toBeDefined()
  })

  it('shows weight too light message when weight is below bar weight', () => {
    renderCalculator(15)
    expect(screen.getByText(/Weight is less than the bar/)).toBeDefined()
  })

  it('allows changing bar weight via selector buttons', async () => {
    const user = userEvent.setup()
    renderCalculator(60)

    // The bar weight buttons render as "10kg", "15kg", "20kg" inside button elements
    const barButtons = screen.getByRole('dialog').querySelectorAll('.flex.gap-2 button')
    // Click the 15kg button (second one)
    await user.click(barButtons[1]!)
    // 60kg - 15kg = 45kg / 2 = 22.5kg per side => 1x20 + 1x2.5
    const plateElements = screen.getByRole('dialog').querySelectorAll('.bg-cyan-500\\/15')
    const plateTexts = Array.from(plateElements).map(el => el.textContent)
    expect(plateTexts.some(t => t?.includes('20kg'))).toBe(true)
    expect(plateTexts.some(t => t?.includes('2.5kg'))).toBe(true)
  })

  it('handles custom weight input', async () => {
    const user = userEvent.setup()
    renderCalculator()

    const input = screen.getByPlaceholderText('0')
    await user.clear(input)
    await user.type(input, '80')
    // 80kg - 20kg bar = 60kg / 2 = 30kg per side => 1x25 + 1x5
    const plateElements = screen.getByRole('dialog').querySelectorAll('.bg-cyan-500\\/15')
    const plateTexts = Array.from(plateElements).map(el => el.textContent)
    expect(plateTexts.some(t => t?.includes('25kg'))).toBe(true)
    expect(plateTexts.some(t => t?.includes('5kg'))).toBe(true)
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderCalculator(100)
    const dialog = screen.getByRole('dialog')
    const closeBtn = within(dialog).getAllByLabelText('Close')[0]!
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders bar weight selector with three options', () => {
    renderCalculator()
    const barButtons = screen.getByRole('dialog').querySelectorAll('.flex.gap-2 button')
    expect(barButtons.length).toBe(3)
    const texts = Array.from(barButtons).map(b => b.textContent)
    expect(texts).toContain('10kg')
    expect(texts).toContain('15kg')
    expect(texts).toContain('20kg')
  })
})
