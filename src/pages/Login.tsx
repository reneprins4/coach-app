import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2, Dumbbell, ArrowLeft } from 'lucide-react'
import type { LoginProps } from '../types'

export default function Login({ onSendOtp, onVerifyOtp }: LoginProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  useEffect(() => {
    if (step === 2 && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [step])

  async function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError(null)

    const { error: sendError } = await onSendOtp(email.trim())

    if (sendError) {
      setError(sendError.message ?? t('login.unknown_error'))
      setLoading(false)
    } else {
      setStep(2)
      setResendTimer(60)
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    const token = code.join('')
    if (token.length !== 6 || loading) return

    setLoading(true)
    setError(null)

    const { error: verifyError } = await onVerifyOtp(email.trim(), token)

    if (verifyError) {
      setError(t('login.wrong_code'))
      setLoading(false)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  async function handleResendCode() {
    if (resendTimer > 0 || loading) return

    setLoading(true)
    setError(null)

    const { error: sendError } = await onSendOtp(email.trim())

    if (sendError) {
      setError(sendError.message)
    } else {
      setResendTimer(60)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
    setLoading(false)
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)

    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      const newCode = [...code]
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || ''
      }
      setCode(newCode)
      const lastFilledIndex = Math.min(pasted.length - 1, 5)
      inputRefs.current[lastFilledIndex]?.focus()
    }
  }

  function handleBack() {
    setStep(1)
    setCode(['', '', '', '', '', ''])
    setError(null)
  }

  const codeComplete = code.every(d => d !== '')

  // Step 2: OTP code entry
  if (step === 2) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500 glow-cyan">
              <Dumbbell size={32} className="text-white" />
            </div>
            <h1 className="text-title mb-2">{t('login.enter_code')}</h1>
            <p className="text-sm text-gray-400">
              {t('login.code_sent_to')}{' '}
              <span className="font-medium text-white">{email}</span>
            </p>
          </div>

          <div className="mb-8 flex justify-center gap-3" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                aria-label={t('login.otp_digit', { n: index + 1 })}
                className={`h-16 w-13 rounded-xl bg-white/[0.04] text-center text-2xl font-bold text-white outline-none border transition-all backdrop-blur-sm disabled:opacity-50 ${
                  digit ? 'border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]' : 'border-white/[0.06]'
                } focus:border-cyan-500/60 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)]`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-center text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyCode}
            disabled={!codeComplete || loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> {t('login.verifying')}</>
            ) : (
              t('login.verify')
            )}
          </button>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={handleResendCode}
              disabled={resendTimer > 0 || loading}
              className="text-sm text-cyan-500 hover:text-cyan-400 disabled:text-gray-600"
            >
              {resendTimer > 0 ? t('login.resend_timer', { seconds: resendTimer }) : t('login.resend_code')}
            </button>

            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-400"
            >
              <ArrowLeft size={14} />
              {t('login.use_other_email')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Email entry
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500 glow-cyan">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-display">Kravex</h1>
          <p className="mt-2 text-sm text-gray-500">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSendCode} className="space-y-5">
          <div>
            <label htmlFor="email" className="label-caps mb-2 block">
              {t('login.email_label')}
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                className="h-14 w-full rounded-xl pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> {t('login.sending')}</>
            ) : (
              t('login.send_code')
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-600">
          {t('login.otp_hint')}
        </p>
      </div>
    </div>
  )
}
