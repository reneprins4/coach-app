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
]

const SEVERITIES: { key: InjurySeverity; dot: string }[] = [
  { key: 'mild', dot: 'bg-yellow-400' },
  { key: 'moderate', dot: 'bg-orange-400' },
  { key: 'severe', dot: 'bg-red-400' },
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-report-title"
        className="card w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={handleBack}
            aria-label={step === 1 ? t('common.close') : t('common.back')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800 min-h-[44px] min-w-[44px]"
          >
            {step === 1 ? <X size={18} /> : <ChevronLeft size={18} />}
          </button>

          <p id="injury-report-title" className="text-title">{t('injury.report_title')}</p>

          {/* Step indicator */}
          <div className="flex gap-1.5 w-10 justify-end">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'w-3 bg-cyan-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Body Area */}
        {step === 1 && (
          <div>
            <p className="label-caps mb-3">{t('injury.select_area')}</p>
            <div className="grid grid-cols-2 gap-2">
              {BODY_AREAS.map(key => (
                <button
                  key={key}
                  onClick={() => handleSelectArea(key)}
                  className="btn-secondary h-auto py-3.5 text-sm font-bold text-white"
                >
                  {t(`injury.area_${key}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Severity */}
        {step === 2 && (
          <div>
            <p className="label-caps mb-1">{t('injury.select_severity')}</p>
            <p className="mb-3 text-sm text-gray-500">{t(`injury.area_${selectedArea}`)}</p>
            <div className="space-y-2">
              {SEVERITIES.map(({ key, dot }) => (
                <button
                  key={key}
                  onClick={() => handleSelectSeverity(key)}
                  className="btn-secondary h-auto w-full py-3.5 flex-col items-start gap-0.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="text-sm font-bold text-white">{t(`injury.severity_${key}`)}</span>
                  </span>
                  <span className="ml-[18px] text-xs text-gray-500 font-normal">{t(`injury.severity_${key}_desc`)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Side */}
        {step === 3 && (
          <div>
            <p className="label-caps mb-1">{t('injury.select_side')}</p>
            <p className="mb-3 text-sm text-gray-500">{t(`injury.area_${selectedArea}`)}</p>
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map(key => (
                <button
                  key={key}
                  onClick={() => handleSelectSide(key)}
                  className="btn-secondary h-auto py-4 text-sm font-bold text-white"
                >
                  {t(`injury.side_${key}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
