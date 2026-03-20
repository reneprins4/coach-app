import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronLeft, ArrowRight } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import type { InjuryArea, InjurySeverity, InjurySide } from '../lib/injuryRecovery'

interface InjuryReportProps {
  isOpen: boolean
  onClose: () => void
  onReport: (area: InjuryArea, severity: InjurySeverity, side: InjurySide) => void
}

const BODY_AREAS: { key: InjuryArea; color: string }[] = [
  { key: 'shoulder', color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20' },
  { key: 'knee', color: 'from-green-500/20 to-green-500/5 border-green-500/20' },
  { key: 'lower_back', color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20' },
  { key: 'elbow', color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20' },
  { key: 'wrist', color: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20' },
  { key: 'hip', color: 'from-orange-500/20 to-orange-500/5 border-orange-500/20' },
  { key: 'neck', color: 'from-red-500/20 to-red-500/5 border-red-500/20' },
  { key: 'ankle', color: 'from-pink-500/20 to-pink-500/5 border-pink-500/20' },
]

const SEVERITIES: { key: InjurySeverity; color: string; accent: string; border: string }[] = [
  { key: 'mild', color: 'text-yellow-400', accent: 'bg-yellow-400', border: 'border-yellow-500/20 from-yellow-500/10 to-transparent' },
  { key: 'moderate', color: 'text-orange-400', accent: 'bg-orange-400', border: 'border-orange-500/20 from-orange-500/10 to-transparent' },
  { key: 'severe', color: 'text-red-400', accent: 'bg-red-400', border: 'border-red-500/20 from-red-500/10 to-transparent' },
]

const SIDES: { key: InjurySide; icon: string }[] = [
  { key: 'left', icon: '←' },
  { key: 'right', icon: '→' },
  { key: 'both', icon: '↔' },
]

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-report-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-gray-950 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4">
          <button
            onClick={handleBack}
            aria-label={step === 1 ? t('common.close') : t('common.back')}
            className="absolute left-3 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800 min-h-[44px] min-w-[44px]"
          >
            {step === 1 ? <X size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className="text-center">
            <p id="injury-report-title" className="text-title">{t('injury.report_title')}</p>
            {/* Step indicator */}
            <div className="mt-2 flex justify-center gap-1.5">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-cyan-500' : s < step ? 'w-6 bg-cyan-500/40' : 'w-1.5 bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-6">
          {/* Step 1: Body Area */}
          {step === 1 && (
            <div>
              <p className="label-caps mb-4">{t('injury.select_area')}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {BODY_AREAS.map(({ key, color }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectArea(key)}
                    className={`group flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-3.5 text-left transition-all active:scale-[0.97] ${color}`}
                  >
                    <span className="flex-1 text-sm font-bold text-white">
                      {t(`injury.area_${key}`)}
                    </span>
                    <ArrowRight size={14} className="text-gray-600 transition-transform group-active:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Severity */}
          {step === 2 && (
            <div>
              <p className="label-caps mb-1">{t('injury.select_severity')}</p>
              <p className="mb-4 text-sm text-gray-500">{t(`injury.area_${selectedArea}`)}</p>
              <div className="space-y-2.5">
                {SEVERITIES.map(({ key, color, accent, border }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectSeverity(key)}
                    className={`group flex w-full items-center gap-4 rounded-2xl border bg-gradient-to-r p-4 text-left transition-all active:scale-[0.97] ${border}`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent}`} />
                    <div className="flex-1">
                      <span className={`text-sm font-bold ${color}`}>
                        {t(`injury.severity_${key}`)}
                      </span>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t(`injury.severity_${key}_desc`)}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-gray-600 transition-transform group-active:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Side */}
          {step === 3 && (
            <div>
              <p className="label-caps mb-1">{t('injury.select_side')}</p>
              <p className="mb-4 text-sm text-gray-500">
                {t(`injury.area_${selectedArea}`)} — <span className={SEVERITIES.find(s => s.key === selectedSeverity)?.color}>{t(`injury.severity_${selectedSeverity}`)}</span>
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {SIDES.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectSide(key)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all active:scale-[0.97] active:border-cyan-500 active:bg-cyan-500/10"
                  >
                    <span className="text-2xl text-gray-400">{icon}</span>
                    <span className="text-sm font-bold text-white">{t(`injury.side_${key}`)}</span>
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
