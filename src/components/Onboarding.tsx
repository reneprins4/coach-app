import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { saveSettings } from '../lib/settings'
import { useAuthContext } from '../App'


export default function Onboarding() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [step, setStep] = useState(-1) // -1 = language selection
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)

  const goalOptions = [
    { value: 'hypertrophy', label: t('onboarding.beginners.goal_muscle') },
    { value: 'strength', label: t('onboarding.beginners.goal_strength') },
    { value: 'endurance', label: t('onboarding.beginners.goal_endurance') },
  ]

  const timeOptions = [
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
  ]

  const equipmentOptions = [
    { value: 'full_gym', label: t('onboarding.beginners.equip_full') },
    { value: 'dumbbells', label: t('onboarding.beginners.equip_dumbbells') },
    { value: 'barbell', label: t('onboarding.beginners.equip_barbell') },
  ]

  function handleStart() {
    setStep(1)
  }

  function handleNext() {
    setStep(2)
  }

  function handleFinish() {
    const settings: Record<string, unknown> = {
      onboardingCompleted: true,
      goal: goal || 'hypertrophy',
      time: time || 60,
      equipment: equipment || 'full_gym',
      language: i18n.language,
    }
    if (name.trim()) {
      (settings as Record<string, unknown>).name = name.trim()
    }
    saveSettings(settings as Partial<import('../types').UserSettings>, user?.id ?? null)
    window.dispatchEvent(new Event('storage'))
    navigate('/', { replace: true })
  }

  function handleSelectLanguage(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('coach-lang', lang)
    setStep(0)
  }

  // Animated step indicator (skip for language step)
  function StepIndicator() {
    if (step < 0) return null
    return (
      <div className="flex justify-center gap-2 pt-6 pb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ease-out ${
              i < step
                ? 'w-8 bg-cyan-500/40'
                : i === step
                  ? 'w-8 bg-cyan-500 glow-bar'
                  : 'w-2 bg-white/10'
            }`}
          />
        ))}
      </div>
    )
  }

  // Step 0: Language selection — the very first impression
  if (step === -1) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-6">
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* Brand mark */}
          <p className="label-caps mb-4 tracking-[0.35em] text-cyan-500">Kravex</p>
          <h1 className="text-display mb-2">Choose your language</h1>
          <p className="text-sm text-gray-600 mb-14">Kies je taal</p>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => handleSelectLanguage('nl')}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all active:scale-[0.97] active:border-cyan-500/30 active:bg-cyan-500/5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-base font-black tracking-wide text-white transition-colors group-active:bg-cyan-500/20 group-active:text-cyan-400">NL</span>
              <div>
                <p className="text-base font-bold text-white">Nederlands</p>
                <p className="text-xs text-gray-600">Dutch</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectLanguage('en')}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-all active:scale-[0.97] active:border-cyan-500/30 active:bg-cyan-500/5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-base font-black tracking-wide text-white transition-colors group-active:bg-cyan-500/20 group-active:text-cyan-400">EN</span>
              <div>
                <p className="text-base font-bold text-white">English</p>
                <p className="text-xs text-gray-600">Engels</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Welcome
  if (step === 0) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5">
        <StepIndicator />

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-display mb-4">
            {t('onboarding.beginners.welcome_title')}
          </h1>
          <p className="mb-12 text-lg text-gray-400">
            {t('onboarding.beginners.welcome_sub')}
          </p>

          <button
            onClick={handleStart}
            className="btn-primary max-w-xs"
          >
            {t('onboarding.beginners.begin')}
          </button>
        </div>
      </div>
    )
  }

  // Step 2: How it works
  if (step === 1) {
    const concepts = [
      {
        title: t('onboarding.beginners.concept_splits'),
        desc: t('onboarding.beginners.concept_splits_desc'),
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        ),
      },
      {
        title: t('onboarding.beginners.concept_rpe'),
        desc: t('onboarding.beginners.concept_rpe_desc'),
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        title: t('onboarding.beginners.concept_recovery'),
        desc: t('onboarding.beginners.concept_recovery_desc'),
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      },
    ]

    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5">
        <StepIndicator />

        <div className="flex-1">
          <h1 className="text-display mb-2">
            {t('onboarding.beginners.how_title')}
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            {t('onboarding.beginners.step_indicator', { current: 2, total: 3 })}
          </p>

          <div className="space-y-3">
            {concepts.map((concept, i) => (
              <div
                key={i}
                className="card"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-cyan-500">
                    {concept.icon}
                  </div>
                  <h2 className="text-lg font-bold text-white">{concept.title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-gray-400">{concept.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="py-6">
          <button
            onClick={handleNext}
            className="btn-primary"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    )
  }

  // Step 3: Preferences
  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-5">
      <StepIndicator />

      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-display mb-2">
          {t('onboarding.beginners.pref_title')}
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {t('onboarding.beginners.step_indicator', { current: 3, total: 3 })}
        </p>

        {/* Name (optional) */}
        <div className="mb-6">
          <label className="label-caps mb-2 block">
            {t('onboarding.beginners.name_label')} <span className="text-gray-600">({t('profile.optional')})</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder={t('onboarding.name_placeholder')}
            aria-label={t('onboarding.beginners.name_label')}
            maxLength={30}
            className="h-12 w-full rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors"
          />
        </div>

        {/* Goal */}
        <div className="mb-6">
          <label className="label-caps mb-2 block">
            {t('onboarding.beginners.goal_label')}
          </label>
          <div className="flex gap-2">
            {goalOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                className={`flex-1 rounded-xl px-3 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                  goal === opt.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="mb-6">
          <label className="label-caps mb-2 block">
            {t('onboarding.beginners.time_label')}
          </label>
          <div className="flex gap-2">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTime(opt.value)}
                className={`flex-1 rounded-xl px-3 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                  time === opt.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-6">
          <label className="label-caps mb-2 block">
            {t('onboarding.beginners.equipment_label')}
          </label>
          <div className="flex flex-col gap-2">
            {equipmentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEquipment(opt.value)}
                className={`rounded-xl px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.97] ${
                  equipment === opt.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-6">
        <button
          onClick={handleFinish}
          disabled={!goal || !time || !equipment}
          className={`btn-primary ${!goal || !time || !equipment ? 'opacity-40' : ''}`}
        >
          {t('onboarding.beginners.start_training')}
        </button>
      </div>
    </div>
  )
}
