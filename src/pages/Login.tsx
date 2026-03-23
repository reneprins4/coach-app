import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2, Dumbbell, ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
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
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gray-950 px-6">
        {/* Atmospheric glow orb */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,rgba(6,182,212,0.03)_35%,transparent_70%)] blur-2xl" />

        <motion.div
          className="relative z-10 w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header section */}
          <div className="mb-14 text-center">
            {/* Premium emblem */}
            <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/10" />
              {/* Middle ring */}
              <div className="absolute inset-1.5 rounded-full border border-cyan-500/15" />
              {/* Inner glow surface */}
              <motion.div
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.1)',
                    '0 0 30px rgba(6,182,212,0.5), 0 0 80px rgba(6,182,212,0.15)',
                    '0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.1)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Dumbbell size={26} className="text-white" />
              </motion.div>
            </div>

            <h1 className="text-title mb-3">{t('login.enter_code')}</h1>

            {/* Accent separator */}
            <div className="mx-auto mb-4 h-px w-16 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            <p className="text-sm leading-relaxed text-gray-400">
              {t('login.code_sent_to')}{' '}
              <span className="font-medium text-white">{email}</span>
            </p>
          </div>

          {/* OTP inputs */}
          <div className="mb-10 flex justify-center gap-3" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <input
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
                  className={`glass h-16 w-13 text-center text-2xl font-bold text-white outline-none transition-all disabled:opacity-50 ${
                    digit
                      ? 'border-cyan-500/40 shadow-[0_0_16px_rgba(6,182,212,0.15),0_0_4px_rgba(6,182,212,0.1)]'
                      : 'border-white/[0.06]'
                  } focus:border-cyan-500/60 focus:shadow-[0_0_24px_rgba(6,182,212,0.2),0_0_8px_rgba(6,182,212,0.15)]`}
                />
              </motion.div>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <motion.div
              className="mb-8 glass rounded-2xl border-red-500/15 bg-red-500/[0.04] px-5 py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-center text-sm text-red-400/90">{error}</p>
            </motion.div>
          )}

          {/* Verify button */}
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

          {/* Secondary actions */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <button
              onClick={handleResendCode}
              disabled={resendTimer > 0 || loading}
              className="text-sm text-cyan-500 hover:text-cyan-400 disabled:text-gray-600 transition-colors"
            >
              {resendTimer > 0 ? t('login.resend_timer', { seconds: resendTimer }) : t('login.resend_code')}
            </button>

            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              <ArrowLeft size={14} />
              {t('login.use_other_email')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Step 1: Email entry
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gray-950 px-6">
      {/* Primary glow — large and visible */}
      <div className="pointer-events-none absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.25)_0%,rgba(6,182,212,0.08)_35%,transparent_65%)] blur-[100px]" />
      {/* Bottom accent glow */}
      <div className="pointer-events-none absolute bottom-[10%] left-1/2 -translate-x-1/2 h-[250px] w-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(6,182,212,0.10)_0%,transparent_70%)] blur-[60px]" />
      {/* Subtle top-left warm accent for color variety */}
      <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.06)_0%,transparent_70%)] blur-[80px]" />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand header */}
        <div className="mb-16 text-center">
          {/* Premium emblem with concentric rings */}
          <motion.div
            className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Outermost ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/15" />
            {/* Second ring */}
            <div className="absolute inset-2.5 rounded-full border border-cyan-500/25" />
            {/* Glow backdrop — larger and more visible */}
            <div className="absolute inset-2.5 rounded-full bg-cyan-500/15 blur-lg" />
            {/* Core icon surface */}
            <motion.div
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(6,182,212,0.35), 0 4px 15px rgba(6,182,212,0.2), 0 0 60px rgba(6,182,212,0.1)',
                  '0 0 32px rgba(6,182,212,0.5), 0 4px 20px rgba(6,182,212,0.3), 0 0 80px rgba(6,182,212,0.15)',
                  '0 0 20px rgba(6,182,212,0.35), 0 4px 15px rgba(6,182,212,0.2), 0 0 60px rgba(6,182,212,0.1)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Dumbbell size={28} className="text-white" />
            </motion.div>
          </motion.div>

          {/* App name */}
          <motion.h1
            className="text-display text-4xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Kravex
          </motion.h1>

          {/* Accent separator line */}
          <motion.div
            className="mx-auto mt-5 mb-4 h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Subtitle */}
          <motion.p
            className="text-sm tracking-wide text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            {t('login.subtitle')}
          </motion.p>
        </div>

        {/* Form card */}
        <motion.form
          onSubmit={handleSendCode}
          className="space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <label htmlFor="email" className="label-caps mb-3 block">
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
                className="glass h-14 w-full rounded-xl pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-all focus:border-cyan-500/40 focus:shadow-[0_0_16px_rgba(6,182,212,0.08),0_0_0_3px_rgba(6,182,212,0.06)]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error state */}
          {error && (
            <motion.div
              className="glass rounded-2xl border-red-500/15 bg-red-500/[0.04] px-5 py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-sm text-red-400/90">{error}</p>
            </motion.div>
          )}

          {/* Submit button */}
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
        </motion.form>

        {/* Footer hint */}
        <motion.p
          className="mt-10 text-center text-xs tracking-wide text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {t('login.otp_hint')}
        </motion.p>
      </motion.div>
    </div>
  )
}
