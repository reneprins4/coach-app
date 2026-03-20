import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../Login'

function createMockProps() {
  return {
    onSendOtp: vi.fn().mockResolvedValue({ error: null }),
    onVerifyOtp: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
  }
}

async function goToOtpStep(
  user: ReturnType<typeof userEvent.setup>,
  props: ReturnType<typeof createMockProps>,
  email = 'test@example.com'
) {
  render(<Login {...props} />)
  await user.type(screen.getByLabelText('Email'), email)
  await user.click(screen.getByRole('button', { name: /stuur code/i }))
  await waitFor(() => {
    expect(screen.getByText('Voer je code in')).toBeDefined()
  })
}

describe('Login', () => {
  let props: ReturnType<typeof createMockProps>

  beforeEach(() => {
    props = createMockProps()
  })

  // --- Step 1: Email screen ---

  it('renders the email input field with correct label', () => {
    render(<Login {...props} />)
    const input = screen.getByLabelText('Email')
    expect(input).toBeDefined()
  })

  it('renders the email input with correct type and autocomplete', () => {
    render(<Login {...props} />)
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(input.type).toBe('email')
    expect(input.autocomplete).toBe('email')
  })

  it('renders a submit button that is disabled when email is empty', () => {
    render(<Login {...props} />)
    const btn = screen.getByRole('button', { name: /stuur code/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit button when email is entered', async () => {
    const user = userEvent.setup()
    render(<Login {...props} />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    const btn = screen.getByRole('button', { name: /stuur code/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows error message when onSendOtp returns an error', async () => {
    const user = userEvent.setup()
    props.onSendOtp.mockResolvedValue({
      error: { message: 'Invalid email address' },
    })
    render(<Login {...props} />)

    await user.type(screen.getByLabelText('Email'), 'bad@test.com')
    await user.click(screen.getByRole('button', { name: /stuur code/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeDefined()
    })
  })

  it('calls onSendOtp with the trimmed email', async () => {
    const user = userEvent.setup()
    render(<Login {...props} />)

    const input = screen.getByLabelText('Email')
    await user.type(input, ' test@example.com ')
    await user.click(screen.getByRole('button', { name: /stuur code/i }))

    await waitFor(() => {
      expect(props.onSendOtp).toHaveBeenCalledWith('test@example.com')
    })
  })

  // --- Step 2: OTP screen ---

  it('transitions to OTP screen after successful email submission', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    expect(screen.getByText('Voer je code in')).toBeDefined()
  })

  it('renders 6 OTP input fields with aria-labels', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Verificatiecode cijfer ${i} van 6`)).toBeDefined()
    }
  })

  it('OTP inputs have inputMode="numeric" for mobile keyboards', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)

    const firstInput = screen.getByLabelText('Verificatiecode cijfer 1 van 6') as HTMLInputElement
    expect(firstInput.inputMode).toBe('numeric')
  })

  it('handles paste of full OTP code', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)

    // The onPaste handler is on the parent div wrapping the inputs
    const firstInput = screen.getByLabelText('Verificatiecode cijfer 1 van 6')
    const pasteContainer = firstInput.parentElement!

    // Use fireEvent.paste which correctly triggers React's onPaste handler
    fireEvent.paste(pasteContainer, {
      clipboardData: { getData: () => '123456' },
    })

    // All inputs should be filled
    for (let i = 1; i <= 6; i++) {
      const input = screen.getByLabelText(`Verificatiecode cijfer ${i} van 6`) as HTMLInputElement
      expect(input.value).toBe(String(i))
    }
  })

  it('back button returns to the email step', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)

    await user.click(screen.getByText('Andere email gebruiken'))

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeDefined()
    })
  })

  it('shows the email address on the OTP screen', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props, 'user@test.nl')

    expect(screen.getByText('user@test.nl')).toBeDefined()
  })

  it('verify button is disabled until all 6 digits are entered', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)

    const verifyBtn = screen.getByRole('button', { name: /verifieer/i })
    expect((verifyBtn as HTMLButtonElement).disabled).toBe(true)
  })
})
