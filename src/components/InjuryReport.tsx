import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronLeft } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import type { InjuryArea, InjurySeverity, InjurySide } from '../lib/injuryRecovery'

interface InjuryReportProps {
  isOpen: boolean
  onClose: () => void
  onReport: (area: InjuryArea, severity: InjurySeverity, side: InjurySide) => void
}

const BODY_AREAS: InjuryArea[] = [
  'shoulder', 'knee', 'lower_back', 'elbow', 'wrist', 'hip', 'neck', 'ankle',
  'upper_back', 'chest', 'groin', 'foot',
]

const SEVERITIES: { key: InjurySeverity; color: string; glow: string }[] = [
  { key: 'mild',     color: 'border-yellow-500/25 hover:border-yellow-500/40', glow: 'bg-yellow-400' },
  { key: 'moderate', color: 'border-orange-500/25 hover:border-orange-500/40', glow: 'bg-orange-400' },
  { key: 'severe',   color: 'border-red-500/25 hover:border-red-500/40',       glow: 'bg-red-400' },
]

const SIDES: InjurySide[] = ['left', 'right', 'both']

export default function InjuryReport({ isOpen, onClose, onReport }: InjuryReportProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [selectedArea, setSelectedArea] = useState<InjuryArea | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<InjurySeverity | null>(null)
  useModalA11y(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedArea(null)
      setSelectedSeverity(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSelectArea(area: InjuryArea) {
    setSelectedArea(area)
    setStep(2)
  }

  function handleSelectSeverity(severity: InjurySeverity) {
    setSelectedSeverity(severity)
    setStep(3)
  }

  function handleSelectSide(side: InjurySide) {
    if (selectedArea && selectedSeverity) {
      onReport(selectedArea, selectedSeverity, side)
    }
  }

  function handleBack() {
    if (step === 1) onClose()
    else setStep(step - 1)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-report-title"
        className="card w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              aria-label={step === 1 ? t('common.close') : t('common.back')}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors active:bg-white/5 min-h-[44px] min-w-[44px] -ml-2"
            >
              {step === 1 ? <X size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
            </button>

            {/* Step indicator */}
            <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-500 ease-out ${
                    s < step
                      ? 'w-8 bg-cyan-500/40'
                      : s === step
                        ? 'w-8 bg-cyan-500'
                        : 'w-2 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Spacer to balance close button */}
            <div className="w-10" />
          </div>

          <h2 id="injury-report-title" className="text-display text-center mb-1">
            {step === 1 && t('injury.select_area')}
            {step === 2 && t('injury.select_severity')}
            {step === 3 && t('injury.select_side')}
          </h2>

          {/* Context breadcrumb */}
          {step >= 2 && (
            <p className="text-center text-sm text-gray-500 mb-1">
              {t(`injury.area_${selectedArea}`)}
              {step === 3 && selectedSeverity && (
                <span className="text-gray-600"> · {t(`injury.severity_${selectedSeverity}`)}</span>
              )}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">

          {/* Step 1: Body Area */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {BODY_AREAS.map(key => (
                <button
                  key={key}
                  onClick={() => handleSelectArea(key)}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-left transition-all duration-150 active:scale-[0.97] active:border-cyan-500/30 active:bg-cyan-500/5"
                >
                  <span className="text-[0.9375rem] font-semibold text-white">
                    {t(`injury.area_${key}`)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Severity */}
          {step === 2 && (
            <div className="space-y-3">
              {SEVERITIES.map(({ key, color, glow }) => (
                <button
                  key={key}
                  onClick={() => handleSelectSeverity(key)}
                  className={`group relative w-full overflow-hidden rounded-2xl border bg-white/[0.02] px-5 py-5 text-left transition-all duration-150 active:scale-[0.97] ${color}`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${glow}`} />
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-semibold text-white leading-tight">
                        {t(`injury.severity_${key}`)}
                      </p>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-gray-500">
                        {t(`injury.severity_${key}_desc`)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Side */}
          {step === 3 && (
            <div className="grid grid-cols-3 gap-3">
              {SIDES.map(key => (
                <button
                  key={key}
                  onClick={() => handleSelectSide(key)}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-5 text-center transition-all duration-150 active:scale-[0.97] active:border-cyan-500/30 active:bg-cyan-500/5"
                >
                  <span className="text-[0.9375rem] font-semibold text-white">
                    {t(`injury.side_${key}`)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
