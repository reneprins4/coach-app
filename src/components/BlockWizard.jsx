import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronLeft, ChevronRight, Zap, TrendingUp, Target, Battery, Check } from 'lucide-react'
import { startBlock, PHASES } from '../lib/periodization'
import { saveSettings, getSettings } from '../lib/settings'

const PHASE_COLORS = {
  accumulation: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  intensification: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  strength: { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' },
  deload: { bg: 'bg-gray-500/20', text: 'text-gray-400', bar: 'bg-gray-500' },
}

const PHASE_ICONS = {
  accumulation: Zap,
  intensification: TrendingUp,
  strength: Target,
  deload: Battery,
}

const GOALS = [
  {
    id: 'muscle',
    titleKey: 'block_wizard.goal_muscle',
    descKey: 'block_wizard.goal_muscle_desc',
    icon: Zap,
    phases: [
      { type: 'accumulation', weeks: 4 },
      { type: 'accumulation', weeks: 4 },
      { type: 'intensification', weeks: 4 },
      { type: 'deload', weeks: 1 },
    ],
  },
  {
    id: 'strength',
    titleKey: 'block_wizard.goal_strength',
    descKey: 'block_wizard.goal_strength_desc',
    icon: Target,
    phases: [
      { type: 'accumulation', weeks: 4 },
      { type: 'intensification', weeks: 4 },
      { type: 'intensification', weeks: 4 },
      { type: 'strength', weeks: 3 },
      { type: 'deload', weeks: 1 },
    ],
  },
  {
    id: 'both',
    titleKey: 'block_wizard.goal_both',
    descKey: 'block_wizard.goal_both_desc',
    icon: TrendingUp,
    phases: [
      { type: 'accumulation', weeks: 4 },
      { type: 'intensification', weeks: 4 },
      { type: 'strength', weeks: 3 },
      { type: 'deload', weeks: 1 },
    ],
  },
]

/**
 * Generate the block configuration for a goal
 */
export function generateBlockConfig(goalId, startDate) {
  const goal = GOALS.find(g => g.id === goalId)
  if (!goal) return null
  
  const phases = goal.phases.map((p, i) => {
    const phase = PHASES[p.type]
    return {
      type: p.type,
      label: phase?.label || p.type,
      weeks: p.weeks,
      description: phase?.description || '',
    }
  })
  
  const totalWeeks = phases.reduce((sum, p) => sum + p.weeks, 0)
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + totalWeeks * 7)
  
  return {
    goalId,
    phases,
    totalWeeks,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

/**
 * Calculate total weeks for a goal
 */
export function getTotalWeeks(goalId) {
  const goal = GOALS.find(g => g.id === goalId)
  if (!goal) return 0
  return goal.phases.reduce((sum, p) => sum + p.weeks, 0)
}

export default function BlockWizard({ isOpen, onClose, onStart, userId }) {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(1)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const config = selectedGoal ? generateBlockConfig(selectedGoal, startDate) : null
  const totalWeeks = selectedGoal ? getTotalWeeks(selectedGoal) : 0

  async function handleConfirm() {
    if (!config) return
    setLoading(true)
    try {
      // Start with the first phase, pass full plan for multi-phase tracking
      const firstPhase = config.phases[0]
      const fullPlan = config.phases.map(p => p.type)
      await onStart(firstPhase.type, userId, fullPlan)
      
      // Sync wizard goal to profile settings
      const goalMap = { muscle: 'hypertrophy', strength: 'strength', both: 'hypertrophy' }
      const mappedGoal = goalMap[selectedGoal] || 'hypertrophy'
      const current = getSettings()
      saveSettings({ ...current, goal: mappedGoal })
      
      onClose()
    } catch (err) {
      console.error('Failed to start block:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (step === 1) {
      onClose()
    } else {
      setStep(step - 1)
    }
  }

  function handleNext() {
    if (step === 1 && selectedGoal) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr)
    const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-US'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900 p-4">
          <button onClick={handleBack} className="text-gray-400 active:text-white">
            {step === 1 ? <X size={20} /> : <ChevronLeft size={20} />}
          </button>
          <span className="text-sm font-semibold text-white">
            {t('block_wizard.title')}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <span
                key={s}
                className={`h-1.5 w-1.5 rounded-full ${s === step ? 'bg-cyan-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Goal Selection */}
          {step === 1 && (
            <div>
              <h2 className="mb-2 text-xl font-bold text-white">{t('block_wizard.goal_question')}</h2>
              <p className="mb-5 text-sm text-gray-500">
                {t('block_wizard.goal_sub')}
              </p>
              
              <div className="space-y-3">
                {GOALS.map(goal => {
                  const Icon = goal.icon
                  const isSelected = selectedGoal === goal.id
                  return (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-800 bg-gray-800/50 active:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${isSelected ? 'bg-cyan-500/20' : 'bg-gray-800'}`}>
                          <Icon size={20} className={isSelected ? 'text-cyan-400' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{t(goal.titleKey)}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{t(goal.descKey)}</p>
                          <p className="mt-2 text-xs text-gray-600">
                            {getTotalWeeks(goal.id)} {t('block_wizard.weeks_program')}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={20} className="text-cyan-400" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleNext}
                disabled={!selectedGoal}
                className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
                  selectedGoal
                    ? 'bg-cyan-500 text-white active:bg-cyan-600'
                    : 'bg-gray-800 text-gray-600'
                }`}
              >
                {t('common.next')}
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Start Date */}
          {step === 2 && (
            <div>
              <h2 className="mb-2 text-xl font-bold text-white">{t('block_wizard.when_start')}</h2>
              <p className="mb-5 text-sm text-gray-500">
                {t('block_wizard.when_sub')}
              </p>

              <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                <label className="mb-2 block text-xs text-gray-500">{t('block_wizard.start_date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white outline-none ring-1 ring-gray-700 focus:ring-cyan-500"
                />
              </div>

              <div className="mt-4 rounded-xl bg-gray-800/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{t('block_wizard.program_duration')}</span>
                  <span className="font-semibold text-white">{totalWeeks} {t('plan.weeks')}</span>
                </div>
                {config && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">{t('block_wizard.end_date')}</span>
                    <span className="text-sm text-cyan-400">{formatDate(config.endDate)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleNext}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-semibold text-white active:bg-cyan-600"
              >
                {t('block_wizard.view_program')}
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 3: Preview & Confirm */}
          {step === 3 && config && (
            <div>
              <h2 className="mb-2 text-xl font-bold text-white">{t('block_wizard.your_program')}</h2>
              <p className="mb-5 text-sm text-gray-500">
                {totalWeeks} {t('block_wizard.program_sub')}
              </p>

              {/* Timeline */}
              <div className="mb-5 space-y-2">
                {config.phases.map((phase, i) => {
                  const colors = PHASE_COLORS[phase.type]
                  const Icon = PHASE_ICONS[phase.type]
                  const phaseStart = new Date(config.startDate)
                  config.phases.slice(0, i).forEach(p => {
                    phaseStart.setDate(phaseStart.getDate() + p.weeks * 7)
                  })
                  
                  return (
                    <div
                      key={`${phase.type}-${i}`}
                      className={`flex items-center gap-3 rounded-xl p-3 ${colors.bg}`}
                    >
                      <div className={`rounded-lg p-2 ${colors.bg}`}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{phase.label}</span>
                          <span className={`text-xs ${colors.text}`}>{phase.weeks} {t('plan.weeks')}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                          {phase.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="mb-5 rounded-xl border border-gray-800 bg-gray-800/50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('block_wizard.start')}</span>
                  <span className="text-white">{formatDate(config.startDate)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('block_wizard.end')}</span>
                  <span className="text-cyan-400">{formatDate(config.endDate)}</span>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-bold text-white active:bg-cyan-600 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    {t('block_wizard.start_program')}
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
