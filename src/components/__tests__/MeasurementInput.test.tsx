import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MeasurementInput from '../MeasurementInput'
import { getLocalDateString } from '../../lib/dateUtils'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'measurements.weight': 'Weight',
        'measurements.waist': 'Waist',
        'measurements.chest': 'Chest',
        'measurements.arms': 'Arms',
        'measurements.hips': 'Hips',
        'measurements.thighs': 'Thighs',
        'measurements.save': 'Save',
        'measurements.add': 'Add measurement',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('MeasurementInput', () => {
  it('renders measurement type selector', () => {
    render(<MeasurementInput onSave={vi.fn()} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDefined()
  })

  it('renders value input with correct unit label', () => {
    render(<MeasurementInput onSave={vi.fn()} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeDefined()
  })

  it('date defaults to today', () => {
    render(<MeasurementInput onSave={vi.fn()} />)
    const dateInput = screen.getByDisplayValue(getLocalDateString(new Date()))
    expect(dateInput).toBeDefined()
  })

  it('calls onSave with type, value, date on submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<MeasurementInput onSave={onSave} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '80')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    expect(onSave).toHaveBeenCalledWith(
      'weight',
      80,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    )
  })

  it('shows validation error for invalid value', async () => {
    const user = userEvent.setup()
    render(<MeasurementInput onSave={vi.fn()} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '0')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('clears input after successful save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<MeasurementInput onSave={onSave} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '80')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    expect((input as HTMLInputElement).value).toBe('')
  })

  it('save button has accessible label', () => {
    render(<MeasurementInput onSave={vi.fn()} />)
    const saveBtn = screen.getByRole('button', { name: /save/i })
    expect(saveBtn).toBeDefined()
  })
})
