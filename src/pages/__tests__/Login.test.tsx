import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../Login'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'login.subtitle': 'Your personal training coach',
        'login.email_label': 'Email',
        'login.email_placeholder': 'your@email.com',
        'login.send_code': 'Send code',
        'login.sending': 'Sending...',
        'login.otp_hint': 'You will receive a 6-digit code by email to log in.',
        'login.enter_code': 'Enter your code',
        'login.code_sent_to': 'We sent a 6-digit code to',
        'login.verify': 'Verify',
        'login.verifying': 'Verifying...',
        'login.wrong_code': 'Incorrect code. Please try again.',
        'login.unknown_error': 'Something went wrong.',
        'login.resend_code': 'Resend code',
        'login.use_other_email': 'Use a different email',
      }
      if (key === 'login.otp_digit' && opts?.n) return `Verification code digit ${opts.n} of 6`
      if (key === 'login.resend_timer' && opts?.seconds) return `Resend code (${opts.seconds}s)`
      return translations[key] ?? key
    },
  }),
}))

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
  await user.click(screen.getByRole('button', { name: /send code/i }))
  await waitFor(() => {
    expect(screen.getByText('Enter your code')).toBeDefined()
  })
}

describe('Login', () => {
  let props: ReturnType<typeof createMockProps>

  beforeEach(() => {
    props = createMockProps()
  })

  it('renders the email input field with correct label', () => {
    render(<Login {...props} />)
    expect(screen.getByLabelText('Email')).toBeDefined()
  })

  it('renders the email input with correct type and autocomplete', () => {
    render(<Login {...props} />)
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(input.type).toBe('email')
    expect(input.autocomplete).toBe('email')
  })

  it('renders a submit button that is disabled when email is empty', () => {
    render(<Login {...props} />)
    const btn = screen.getByRole('button', { name: /send code/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit button when email is entered', async () => {
    const user = userEvent.setup()
    render(<Login {...props} />)
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    const btn = screen.getByRole('button', { name: /send code/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows error message when onSendOtp returns an error', async () => {
    const user = userEvent.setup()
    props.onSendOtp.mockResolvedValue({ error: { message: 'Invalid email address' } })
    render(<Login {...props} />)
    await user.type(screen.getByLabelText('Email'), 'bad@test.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeDefined()
    })
  })

  it('calls onSendOtp with the trimmed email', async () => {
    const user = userEvent.setup()
    render(<Login {...props} />)
    await user.type(screen.getByLabelText('Email'), ' test@example.com ')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => {
      expect(props.onSendOtp).toHaveBeenCalledWith('test@example.com')
    })
  })

  it('transitions to OTP screen after successful email submission', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    expect(screen.getByText('Enter your code')).toBeDefined()
  })

  it('renders 6 OTP input fields with aria-labels', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Verification code digit ${i} of 6`)).toBeDefined()
    }
  })

  it('OTP inputs have inputMode="numeric" for mobile keyboards', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    const firstInput = screen.getByLabelText('Verification code digit 1 of 6') as HTMLInputElement
    expect(firstInput.inputMode).toBe('numeric')
  })

  it('handles paste of full OTP code', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    const firstInput = screen.getByLabelText('Verification code digit 1 of 6')
    const pasteContainer = firstInput.parentElement!
    fireEvent.paste(pasteContainer, { clipboardData: { getData: () => '123456' } })
    for (let i = 1; i <= 6; i++) {
      const input = screen.getByLabelText(`Verification code digit ${i} of 6`) as HTMLInputElement
      expect(input.value).toBe(String(i))
    }
  })

  it('back button returns to the email step', async () => {
    const user = userEvent.setup()
    await goToOtpStep(user, props)
    await user.click(screen.getByText('Use a different email'))
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
    const verifyBtn = screen.getByRole('button', { name: /verify/i })
    expect((verifyBtn as HTMLButtonElement).disabled).toBe(true)
  })
})
