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

const BODY_AREAS: { key: InjuryArea; emoji: string }[] = [
  { key: 'shoulder', emoji: '💪' },
  { key: 'knee', emoji: '🦵' },
  { key: 'lower_back', emoji: '🔙' },
  { key: 'elbow', emoji: '💪' },
  { key: 'wrist', emoji: '✋' },
  { key: 'hip', emoji: '🦴' },
  { key: 'neck', emoji: '🫠' },
  { key: 'ankle', emoji: '🦶' },
]

const SEVERITIES: { key: InjurySeverity; color: string; bg: string }[] = [
  { key: 'mild', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  { key: 'moderate', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  { key: 'severe', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
]

const SIDES: InjurySide[] = ['left', 'right', 'both']

export default function InjuryReport({ isOpen, onClose, onReport }: InjuryReportProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [selectedArea, setSelectedArea] = useState<InjuryArea | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<InjurySeverity | null>(null)
  useModalA11y(isOpen, onClose)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedArea(null)
      setSelectedSeverity(null)
    }
  }, [isOpen])

  // ESC key handler (in addition to useModalA11y)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
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
    if (step === 1) {
      onClose()
    } else {
      setStep(step - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-report-title"
        className="w-full max-w-md rounded-2xl bg-gray-900 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900 p-4">
          <button
            onClick={handleBack}
            aria-label={step === 1 ? t('common.close') : t('common.back')}
            className="text-gray-400 active:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {step === 1 ? <X size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}
          </button>
          <span id="injury-report-title" className="text-sm font-semibold text-white">
            {t('injury.report_title')}
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
          {/* Step 1: Body Area */}
          {step === 1 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-white">{t('injury.select_area')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {BODY_AREAS.map(({ key, emoji }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectArea(key)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/50 p-4 text-center active:border-cyan-500 active:bg-cyan-500/10"
                  >
                    <span aria-hidden="true" className="text-2xl">{emoji}</span>
                    <span className="text-sm font-medium text-white">{t(`injury.area_${key}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Severity */}
          {step === 2 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-white">{t('injury.select_severity')}</h2>
              <div className="space-y-3">
                {SEVERITIES.map(({ key, color, bg }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectSeverity(key)}
                    className={`w-full rounded-xl border p-4 text-left ${bg} active:opacity-80`}
                  >
                    <span className={`text-sm font-semibold ${color}`}>
                      {t(`injury.severity_${key}`)}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      {t(`injury.severity_${key}_desc`)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Side */}
          {step === 3 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-white">{t('injury.select_side')}</h2>
              <div className="space-y-3">
                {SIDES.map(side => (
                  <button
                    key={side}
                    onClick={() => handleSelectSide(side)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-800/50 p-4 text-left text-sm font-semibold text-white active:border-cyan-500 active:bg-cyan-500/10"
                  >
                    {t(`injury.side_${side}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
