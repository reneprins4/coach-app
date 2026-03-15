import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSettings } from '../lib/settings'
import { useAuthContext } from '../App'

const CARD_STEPS = [
  {
    title: 'Wat wil je bereiken?',
    sub: 'We passen je trainingen hierop aan',
    key: 'goal',
    options: [
      { value: 'hypertrophy', label: 'Spieren opbouwen', sub: 'Meer spiermassa en kracht' },
      { value: 'strength', label: 'Sterker worden', sub: 'Meer gewicht tillen' },
      { value: 'endurance', label: 'Fitter worden', sub: 'Conditie en uithoudingsvermogen' },
    ],
  },
  {
    title: 'Hoe lang train je al?',
    sub: 'Dit helpt ons het juiste niveau kiezen',
    key: 'experienceLevel',
    options: [
      { value: 'beginner', label: 'Nieuw', sub: 'Minder dan 1 jaar' },
      { value: 'intermediate', label: 'Gevorderd', sub: '1 tot 3 jaar' },
      { value: 'advanced', label: 'Ervaren', sub: 'Meer dan 3 jaar' },
    ],
  },
  {
    title: 'Waar train je?',
    sub: 'Zo kiezen we de juiste oefeningen',
    key: 'equipment',
    options: [
      { value: 'full_gym', label: 'Volledige gym', sub: 'Alle machines en gewichten' },
      { value: 'dumbbells', label: 'Thuis met dumbbells', sub: 'Vrije gewichten thuis' },
      { value: 'bodyweight', label: 'Eigen lichaam', sub: 'Geen apparatuur nodig' },
    ],
  },
]

const FREQUENCY_OPTIONS = [
  { value: '2x', label: '2x per week', sub: 'Minimaal, maar effectief' },
  { value: '3x', label: '3x per week', sub: 'De gouden standaard' },
  { value: '4x', label: '4x per week', sub: 'Serieus bezig' },
  { value: '5x', label: '5x of meer', sub: 'Topsport niveau' },
]

const TOTAL_STEPS = CARD_STEPS.length + 3 // +3 for profile, frequency, and completion

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState({})
  const [name, setName] = useState('')
  const [bodyweight, setBodyweight] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const isCardStep = step < CARD_STEPS.length
  const isProfileStep = step === CARD_STEPS.length
  const isFrequencyStep = step === CARD_STEPS.length + 1
  const current = isCardStep ? CARD_STEPS[step] : null

  function handleCardSelect(value) {
    const newSelections = { ...selections, [current.key]: value }
    setSelections(newSelections)
    setStep(step + 1)
  }

  function handleProfileContinue() {
    const newSelections = { ...selections }
    if (name.trim()) newSelections.name = name.trim()
    if (bodyweight) newSelections.bodyweight = bodyweight
    setSelections(newSelections)
    setStep(step + 1)
  }

  function handleFrequencySelect(value) {
    const finalSettings = { ...selections, frequency: value, onboardingCompleted: true }
    saveSettings(finalSettings, user?.id)
    window.dispatchEvent(new Event('storage'))
    
    // Show completion screen with fade-in
    setShowCompletion(true)
    setTimeout(() => setFadeIn(true), 50)
  }

  function handleStartTraining() {
    navigate('/coach', { replace: true })
  }

  // Completion screen
  if (showCompletion) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-5 py-6">
        <div 
          className={`text-center transition-opacity duration-1000 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
        >
          <h1 className="mb-3 text-3xl font-bold text-white">Klaar om te starten</h1>
          <p className="mb-10 text-gray-500">Je eerste training staat voor je klaar</p>
          
          <button
            onClick={handleStartTraining}
            className="h-14 w-full rounded-2xl bg-cyan-500 px-8 text-lg font-bold text-white active:scale-[0.97] transition-transform"
          >
            Genereer mijn eerste training
          </button>
        </div>
      </div>
    )
  }

  // Profile step (name + bodyweight)
  if (isProfileStep) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
        {/* Progress bar */}
        <div className="mb-12 h-0.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold text-white">Over jou</h1>
          <p className="mb-8 text-sm text-gray-500">Dit helpt ons je training personaliseren</p>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="Je naam"
                maxLength={30}
                className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Lichaamsgewicht (kg)</label>
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
                className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
              />
              <p className="mt-1 text-xs text-gray-600">Gebruikt om startgewichten te schatten</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep(step + 1)}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            Overslaan
          </button>
          <button
            onClick={handleProfileContinue}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-white active:scale-[0.97] transition-transform"
          >
            Doorgaan
          </button>
        </div>

        {/* Step indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Stap {step + 1} van {TOTAL_STEPS - 1}
          </p>
        </div>
      </div>
    )
  }

  // Frequency step
  if (isFrequencyStep) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
        {/* Progress bar */}
        <div className="mb-12 h-0.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold text-white">Hoe vaak train je?</h1>
          <p className="mb-8 text-sm text-gray-500">We stemmen je trainingsschema hierop af</p>

          <div className="space-y-3">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFrequencySelect(option.value)}
                className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left ring-1 ring-gray-800 transition-all active:ring-cyan-500 active:bg-cyan-500/10"
              >
                <p className="text-base font-semibold text-white">{option.label}</p>
                <p className="mt-0.5 text-sm text-gray-500">{option.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            Stap {step + 1} van {TOTAL_STEPS - 1}
          </p>
        </div>
      </div>
    )
  }

  // Card steps (goal, experience, equipment)
  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
      {/* Progress bar */}
      <div className="mb-12 h-0.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h1 className="mb-2 text-2xl font-bold text-white">{current.title}</h1>
        <p className="mb-8 text-sm text-gray-500">{current.sub}</p>

        <div className="space-y-3">
          {current.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleCardSelect(option.value)}
              className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left ring-1 ring-gray-800 transition-all active:ring-cyan-500 active:bg-cyan-500/10"
            >
              <p className="text-base font-semibold text-white">{option.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{option.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step indicator */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-600">
          Stap {step + 1} van {TOTAL_STEPS - 1}
        </p>
      </div>
    </div>
  )
}
