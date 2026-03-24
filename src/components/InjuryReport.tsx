import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
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

const SEVERITIES: { key: InjurySeverity; color: string; selectedColor: string; glow: string }[] = [
  {
    key: 'mild',
    color: 'border-white/[0.06] bg-white/[0.03]',
    selectedColor: 'border-yellow-500/30 bg-yellow-500/10',
    glow: 'bg-yellow-400',
  },
  {
    key: 'moderate',
    color: 'border-white/[0.06] bg-white/[0.03]',
    selectedColor: 'border-orange-500/30 bg-orange-500/10',
    glow: 'bg-orange-400',
  },
  {
    key: 'severe',
    color: 'border-white/[0.06] bg-white/[0.03]',
    selectedColor: 'border-red-500/30 bg-red-500/10',
    glow: 'bg-red-400',
  },
]

const SIDES: InjurySide[] = ['left', 'right', 'both']

export default function InjuryReport({ isOpen, onClose, onReport }: InjuryReportProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [selectedArea, setSelectedArea] = useState<InjuryArea | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<InjurySeverity | null>(null)
  useModalA11y(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setDirection(1)
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

  function handleSelectArea(area: InjuryArea) {
    setSelectedArea(area)
    setDirection(1)
    setStep(2)
  }

  function handleSelectSeverity(severity: InjurySeverity) {
    setSelectedSeverity(severity)
    setDirection(1)
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
      setDirection(-1)
      setStep(step - 1)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="injury-report-title"
            className="glass w-full max-w-md max-h-[85vh] overflow-y-auto p-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  onClick={handleBack}
                  aria-label={step === 1 ? t('common.close') : t('common.back')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.06] min-h-[44px] min-w-[44px] -ml-2"
                  style={{ color: 'var(--text-3)' }}
                  whileTap={{ scale: 0.92 }}
                >
                  {step === 1 ? <X size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
                </motion.button>

                {/* Animated step indicator (matches Onboarding pattern) */}
                <div className="flex gap-2.5">
                  {[1, 2, 3].map(s => (
                    <motion.div
                      key={s}
                      className="h-1 rounded-full"
                      animate={{
                        width: s < step ? 32 : s === step ? 32 : 8,
                        backgroundColor: s < step
                          ? 'rgba(6,182,212,0.4)'
                          : s === step
                            ? 'rgb(6,182,212)'
                            : 'rgba(255,255,255,0.08)',
                        boxShadow: s === step ? '0 0 10px rgba(6,182,212,0.6)' : '0 0 0px rgba(6,182,212,0)',
                      }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </div>

                {/* Spacer to balance close button */}
                <div className="w-10" />
              </div>

              <h2 id="injury-report-title" className="text-title text-center mb-1">
                {step === 1 && t('injury.select_area')}
                {step === 2 && t('injury.select_severity')}
                {step === 3 && t('injury.select_side')}
              </h2>

              {/* Context breadcrumb */}
              {step >= 2 && (
                <motion.p
                  className="text-center text-sm mb-1"
                  style={{ color: 'var(--text-2)' }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {t(`injury.area_${selectedArea}`)}
                  {step === 3 && selectedSeverity && (
                    <span style={{ color: 'var(--text-3)' }}> · {t(`injury.severity_${selectedSeverity}`)}</span>
                  )}
                </motion.p>
              )}
            </div>

            {/* Content with step transitions */}
            <div className="px-6 pb-6 pt-4">
              <AnimatePresence mode="wait" custom={direction}>

                {/* Step 1: Body Area */}
                {step === 1 && (
                  <motion.div
                    key="step-area"
                    className="grid grid-cols-2 gap-3"
                    variants={slideVariants}
                    custom={direction}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {BODY_AREAS.map(key => (
                      <motion.button
                        key={key}
                        onClick={() => handleSelectArea(key)}
                        className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/[0.10]"
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="text-[0.9375rem] font-semibold" style={{ color: 'var(--text-1)' }}>
                          {t(`injury.area_${key}`)}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* Step 2: Severity */}
                {step === 2 && (
                  <motion.div
                    key="step-severity"
                    className="space-y-3"
                    variants={slideVariants}
                    custom={direction}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {SEVERITIES.map(({ key, color, glow }) => (
                      <motion.button
                        key={key}
                        onClick={() => handleSelectSeverity(key)}
                        className={`group relative w-full overflow-hidden rounded-2xl border px-5 py-5 text-left transition-colors duration-150 hover:bg-white/[0.06] ${color}`}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="flex items-start gap-3.5">
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${glow}`} />
                          <div className="min-w-0">
                            <p className="text-[0.9375rem] font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>
                              {t(`injury.severity_${key}`)}
                            </p>
                            <p className="mt-1.5 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                              {t(`injury.severity_${key}_desc`)}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* Step 3: Side */}
                {step === 3 && (
                  <motion.div
                    key="step-side"
                    className="grid grid-cols-3 gap-3"
                    variants={slideVariants}
                    custom={direction}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {SIDES.map(key => (
                      <motion.button
                        key={key}
                        onClick={() => handleSelectSide(key)}
                        className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-5 text-center transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/[0.10]"
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="text-[0.9375rem] font-semibold" style={{ color: 'var(--text-1)' }}>
                          {t(`injury.side_${key}`)}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
