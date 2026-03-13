import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSettings } from '../lib/settings'
import { useAuthContext } from '../App'

const STEPS = [
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

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState({})
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const current = STEPS[step]

  function handleSelect(value) {
    const newSelections = { ...selections, [current.key]: value }
    setSelections(newSelections)

    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      saveSettings({ ...newSelections, onboardingCompleted: true }, user?.id)
      window.dispatchEvent(new Event('storage'))
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 px-5 py-6">
      {/* Progress bar */}
      <div className="mb-12 h-0.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
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
              onClick={() => handleSelect(option.value)}
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
          Stap {step + 1} van {STEPS.length}
        </p>
      </div>
    </div>
  )
}
