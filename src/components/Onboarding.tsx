import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
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

  // Track direction for slide transitions
  const [direction, setDirection] = useState(1)

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
    setDirection(1)
    setStep(1)
  }

  function handleNext() {
    setDirection(1)
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
    setDirection(1)
    setStep(0)
  }

  // Animated step indicator (skip for language step)
  function StepIndicator() {
    if (step < 0) return null
    return (
      <div className="flex justify-center gap-2.5 pt-8 pb-10">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full"
            animate={{
              width: i < step ? 32 : i === step ? 32 : 8,
              backgroundColor: i < step
                ? 'rgba(6,182,212,0.4)'
                : i === step
                  ? 'rgb(6,182,212)'
                  : 'rgba(255,255,255,0.08)',
              boxShadow: i === step ? '0 0 10px rgba(6,182,212,0.6)' : '0 0 0px rgba(6,182,212,0)',
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    )
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-6">
      <StepIndicator />

      <AnimatePresence mode="wait" custom={direction}>
        {/* Step -1: Language selection */}
        {step === -1 && (
          <motion.div
            key="language"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-1 flex-col items-center justify-center"
          >
            {/* Atmospheric glow */}
            <div
              className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '360px',
                height: '360px',
                background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 70%)',
              }}
            />

            <motion.p
              className="text-display text-4xl relative mb-5 tracking-[0.35em] text-cyan-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Kravex
            </motion.p>
            <motion.h1
              className="text-display relative mb-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              Choose your language
            </motion.h1>

            {/* Gradient accent line between titles */}
            <motion.div
              className="mx-auto mb-3 h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />

            <motion.p
              className="relative mb-16 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              Kies je taal
            </motion.p>

            <div className="relative w-full max-w-xs space-y-3">
              {[
                { lang: 'nl', label: 'Nederlands', sub: 'Dutch', code: 'NL' },
                { lang: 'en', label: 'English', sub: 'Engels', code: 'EN' },
              ].map((item, index) => (
                <motion.button
                  key={item.lang}
                  onClick={() => handleSelectLanguage(item.lang)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-left transition-all active:border-cyan-500/30 active:bg-cyan-500/5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-lg font-black tracking-wide text-cyan-400 transition-colors group-active:bg-cyan-500/20">
                    {item.code}
                  </span>
                  <div>
                    <p className="text-base font-bold text-white">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.sub}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <motion.div
            key="welcome"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <motion.h1
              className="text-display mb-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('onboarding.beginners.welcome_title')}
            </motion.h1>
            <motion.p
              className="mb-16 max-w-[280px] text-lg leading-relaxed text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t('onboarding.beginners.welcome_sub')}
            </motion.p>

            <motion.button
              onClick={handleStart}
              className="btn-primary max-w-xs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('onboarding.beginners.begin')}
            </motion.button>
          </motion.div>
        )}

        {/* Step 1: How it works */}
        {step === 1 && (
          <motion.div
            key="concepts"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1">
              <h1 className="text-display mb-2">
                {t('onboarding.beginners.how_title')}
              </h1>
              <p className="mb-8 text-sm text-gray-500">
                {t('onboarding.beginners.step_indicator', { current: 2, total: 3 })}
              </p>

              <div className="space-y-4">
                {[
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
                ].map((concept, i) => (
                  <motion.div
                    key={i}
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                        {concept.icon}
                      </div>
                      <h2 className="text-title">{concept.title}</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">{concept.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="py-8">
              <button
                onClick={handleNext}
                className="btn-primary"
              >
                {t('common.next')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <motion.div
            key="preferences"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto pb-4">
              <h1 className="text-display mb-2">
                {t('onboarding.beginners.pref_title')}
              </h1>
              <p className="mb-8 text-sm text-gray-500">
                {t('onboarding.beginners.step_indicator', { current: 3, total: 3 })}
              </p>

              {/* Name (optional) */}
              <div className="mb-8">
                <label className="label-caps mb-2.5 block">
                  {t('onboarding.beginners.name_label')} <span className="text-gray-600">({t('profile.optional')})</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder={t('onboarding.name_placeholder')}
                  aria-label={t('onboarding.beginners.name_label')}
                  maxLength={30}
                  className="h-13 w-full rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors"
                />
              </div>

              {/* Goal */}
              <div className="mb-8">
                <label className="label-caps mb-2.5 block">
                  {t('onboarding.beginners.goal_label')}
                </label>
                <div className="flex gap-2.5">
                  {goalOptions.map((opt) => (
                    <motion.button
                      key={opt.value}
                      onClick={() => setGoal(opt.value)}
                      className={`flex-1 rounded-xl px-3 py-3.5 text-sm font-medium border transition-shadow ${
                        goal === opt.value
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                          : 'bg-white/[0.03] text-gray-400 border-white/[0.06]'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      animate={goal === opt.value ? {
                        borderColor: 'rgba(6,182,212,0.3)',
                        backgroundColor: 'rgba(6,182,212,0.1)',
                      } : {
                        borderColor: 'rgba(255,255,255,0.06)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="mb-8">
                <label className="label-caps mb-2.5 block">
                  {t('onboarding.beginners.time_label')}
                </label>
                <div className="flex gap-2.5">
                  {timeOptions.map((opt) => (
                    <motion.button
                      key={opt.value}
                      onClick={() => setTime(opt.value)}
                      className={`flex-1 rounded-xl px-3 py-3.5 text-sm font-medium border transition-shadow ${
                        time === opt.value
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                          : 'bg-white/[0.03] text-gray-400 border-white/[0.06]'
                      }`}
                      whileTap={{ scale: 0.95 }}
                      animate={time === opt.value ? {
                        borderColor: 'rgba(6,182,212,0.3)',
                        backgroundColor: 'rgba(6,182,212,0.1)',
                      } : {
                        borderColor: 'rgba(255,255,255,0.06)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="mb-8">
                <label className="label-caps mb-2.5 block">
                  {t('onboarding.beginners.equipment_label')}
                </label>
                <div className="flex flex-col gap-2.5">
                  {equipmentOptions.map((opt) => (
                    <motion.button
                      key={opt.value}
                      onClick={() => setEquipment(opt.value)}
                      className={`rounded-xl px-5 py-4 text-left text-sm font-medium border transition-shadow ${
                        equipment === opt.value
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                          : 'bg-white/[0.03] text-gray-400 border-white/[0.06]'
                      }`}
                      whileTap={{ scale: 0.97 }}
                      animate={equipment === opt.value ? {
                        borderColor: 'rgba(6,182,212,0.3)',
                        backgroundColor: 'rgba(6,182,212,0.1)',
                      } : {
                        borderColor: 'rgba(255,255,255,0.06)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <div className="py-8">
              <button
                onClick={handleFinish}
                disabled={!goal || !time || !equipment}
                className={`btn-primary ${!goal || !time || !equipment ? 'opacity-40' : ''}`}
              >
                {t('onboarding.beginners.start_training')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
