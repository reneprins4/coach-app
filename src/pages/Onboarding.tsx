import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { saveSettings } from '../lib/settings'
import { useAuthContext } from '../App'

const TOTAL_STEPS = 6 // goal, experience, equipment, profile, frequency, completion

export default function Onboarding() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [bodyweight, setBodyweight] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const CARD_STEPS = [
    {
      title: t('onboarding.goal_question'),
      sub: t('onboarding.goal_sub'),
      key: 'goal',
      options: [
        { value: 'hypertrophy', label: t('onboarding.goal_muscle'), sub: t('onboarding.goal_muscle_sub') },
        { value: 'strength', label: t('onboarding.goal_strength'), sub: t('onboarding.goal_strength_sub') },
        { value: 'endurance', label: t('onboarding.goal_endurance'), sub: t('onboarding.goal_endurance_sub') },
      ],
    },
    {
      title: t('onboarding.experience_question'),
      sub: t('onboarding.experience_sub'),
      key: 'experienceLevel',
      options: [
        { value: 'beginner', label: t('onboarding.exp_beginner'), sub: t('onboarding.exp_beginner_sub') },
        { value: 'returning', label: t('onboarding.exp_returning'), sub: t('onboarding.exp_returning_sub') },
        { value: 'intermediate', label: t('onboarding.exp_intermediate'), sub: t('onboarding.exp_intermediate_sub') },
        { value: 'advanced', label: t('onboarding.exp_advanced'), sub: t('onboarding.exp_advanced_sub') },
      ],
    },
    {
      title: t('onboarding.equipment_question'),
      sub: t('onboarding.equipment_sub'),
      key: 'equipment',
      options: [
        { value: 'full_gym', label: t('onboarding.equip_full'), sub: t('onboarding.equip_full_sub') },
        { value: 'dumbbells', label: t('onboarding.equip_dumbbells'), sub: t('onboarding.equip_dumbbells_sub') },
        { value: 'bodyweight', label: t('onboarding.equip_bodyweight'), sub: t('onboarding.equip_bodyweight_sub') },
      ],
    },
  ]

  const FREQUENCY_OPTIONS = [
    { value: '2x', label: t('onboarding.freq_2x'), sub: t('onboarding.freq_2x_sub') },
    { value: '3x', label: t('onboarding.freq_3x'), sub: t('onboarding.freq_3x_sub') },
    { value: '4x', label: t('onboarding.freq_4x'), sub: t('onboarding.freq_4x_sub') },
    { value: '5x', label: t('onboarding.freq_5x'), sub: t('onboarding.freq_5x_sub') },
  ]

  const isCardStep = step < CARD_STEPS.length
  const isProfileStep = step === CARD_STEPS.length
  const isFrequencyStep = step === CARD_STEPS.length + 1
  const current = isCardStep ? CARD_STEPS[step]! : null
  const totalVisibleSteps = TOTAL_STEPS - 1

  function handleCardSelect(value: string) {
    const newSelections = { ...selections, [current!.key]: value }
    setSelections(newSelections)
    setStep(step + 1)
  }

  function handleProfileContinue() {
    const newSelections: Record<string, string> = { ...selections }
    if (name.trim()) newSelections.name = name.trim()
    if (bodyweight) newSelections.bodyweight = bodyweight
    setSelections(newSelections)
    setStep(step + 1)
  }

  function handleFrequencySelect(value: string) {
    const finalSettings: Record<string, unknown> = { ...selections, frequency: value, onboardingCompleted: true }
    saveSettings(finalSettings as Partial<import('../types').UserSettings>, user?.id ?? null)
    window.dispatchEvent(new Event('storage'))
    
    // Show completion screen with fade-in
    setShowCompletion(true)
    setTimeout(() => setFadeIn(true), 50)
  }

  function handleStartTraining() {
    navigate('/log', { replace: true })
  }

  // Completion screen
  if (showCompletion) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-5 py-6">
        <div 
          className={`text-center transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
        >
          <h1 className="text-display mb-3">{t('onboarding.ready')}</h1>
          <p className="mb-10 text-gray-500">{t('onboarding.ready_sub')}</p>
          
          <button
            onClick={handleStartTraining}
            className="btn-primary"
          >
            {t('onboarding.start_first')}
          </button>
        </div>
      </div>
    )
  }

  // Profile step (name + bodyweight)
  if (isProfileStep) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
        {/* Step indicator */}
        <div className="flex gap-2 pt-6 pb-8 justify-center">
          {Array.from({ length: totalVisibleSteps }, (_, i) => (
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

        {/* Content */}
        <div className="flex-1">
          <h1 className="text-display mb-2">{t('onboarding.profile_title')}</h1>
          <p className="mb-8 text-sm text-gray-500">{t('onboarding.profile_sub')}</p>

          <div className="space-y-6">
            <div>
              <label className="label-caps mb-2 block">{t('onboarding.name_label')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder={t('onboarding.name_placeholder')}
                aria-label={t('onboarding.name_label')}
                maxLength={30}
                className="h-12 w-full rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="label-caps mb-2 block">{t('onboarding.weight_label')}</label>
              <input
                type="number"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                onBlur={(e) => {
                  const val = Number(e.target.value)
                  if (e.target.value !== '' && (val < 30 || val > 250)) {
                    setBodyweight('')
                  }
                }}
                placeholder="75"
                min={30}
                max={250}
                aria-label={t('onboarding.weight_label')}
                className="h-12 w-full rounded-xl px-4 text-white placeholder-gray-600 outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-gray-600">{t('onboarding.weight_hint')}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep(step + 1)}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            {t('onboarding.skip')}
          </button>
          <button
            onClick={handleProfileContinue}
            className="btn-primary w-auto px-6 h-12"
          >
            {t('onboarding.continue')}
          </button>
        </div>
      </div>
    )
  }

  // Frequency step
  if (isFrequencyStep) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
        {/* Step indicator */}
        <div className="flex gap-2 pt-6 pb-8 justify-center">
          {Array.from({ length: totalVisibleSteps }, (_, i) => (
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

        {/* Content */}
        <div className="flex-1">
          <h1 className="text-display mb-2">{t('onboarding.frequency_question')}</h1>
          <p className="mb-8 text-sm text-gray-500">{t('onboarding.frequency_sub')}</p>

          <div className="space-y-3">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFrequencySelect(option.value)}
                className="card w-full px-5 py-4 text-left transition-all active:border-cyan-500/40 active:bg-cyan-500/10"
              >
                <p className="text-base font-semibold text-white">{option.label}</p>
                <p className="mt-0.5 text-sm text-gray-500">{option.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Card steps (goal, experience, equipment)
  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
      {/* Step indicator */}
      <div className="flex gap-2 pt-6 pb-8 justify-center">
        {Array.from({ length: totalVisibleSteps }, (_, i) => (
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

      {/* Content */}
      <div className="flex-1">
        <h1 className="text-display mb-2">{current!.title}</h1>
        <p className="mb-8 text-sm text-gray-500">{current!.sub}</p>

        <div className="space-y-3">
          {current!.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleCardSelect(option.value)}
              className="card w-full px-5 py-4 text-left transition-all active:border-cyan-500/40 active:bg-cyan-500/10"
            >
              <p className="text-base font-semibold text-white">{option.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{option.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
