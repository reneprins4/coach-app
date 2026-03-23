import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingDown, Minus, TrendingUp, CheckCircle, type LucideIcon } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import type { CheckInFeeling, InjuryArea } from '../lib/injuryRecovery'

interface InjuryCheckInProps {
  isOpen: boolean
  onClose: () => void
  onCheckIn: (feeling: CheckInFeeling) => void
  injuryArea: InjuryArea
}

const FEELINGS: { key: CheckInFeeling; icon: LucideIcon; color: string }[] = [
  { key: 'worse', icon: TrendingDown, color: 'text-red-400' },
  { key: 'same', icon: Minus, color: 'text-gray-400' },
  { key: 'better', icon: TrendingUp, color: 'text-green-400' },
  { key: 'recovered', icon: CheckCircle, color: 'text-cyan-400' },
]

const FEEDBACK_KEYS: Record<CheckInFeeling, string> = {
  worse: 'injury.feedback_worse',
  same: 'injury.feedback_same',
  better: 'injury.feedback_better',
  recovered: 'injury.feedback_recovered',
}

export default function InjuryCheckIn({ isOpen, onClose, onCheckIn, injuryArea }: InjuryCheckInProps) {
  const { t } = useTranslation()
  const [selectedFeeling, setSelectedFeeling] = useState<CheckInFeeling | null>(null)
  useModalA11y(isOpen, onClose)

  // Suppress unused variable warning -- injuryArea available for future use
  void injuryArea

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedFeeling(null)
    }
  }, [isOpen])

  // Auto-close after feedback shown
  useEffect(() => {
    if (!selectedFeeling) return
    const timer = setTimeout(() => {
      onClose()
    }, 3500)
    return () => clearTimeout(timer)
  }, [selectedFeeling, onClose])

  if (!isOpen) return null

  function handleSelect(feeling: CheckInFeeling) {
    setSelectedFeeling(feeling)
    onCheckIn(feeling)
  }

  const selectedConfig = FEELINGS.find(f => f.key === selectedFeeling)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-checkin-title"
        className="card w-full max-w-sm"
      >
        <h2 id="injury-checkin-title" className="text-title mb-4 text-center">
          {t('injury.check_in_title')}
        </h2>

        {!selectedFeeling ? (
          <div className="grid grid-cols-2 gap-3">
            {FEELINGS.map(({ key, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 active:bg-[var(--accent-dim)] active:border-[var(--border-accent)]"
              >
                <Icon size={28} className={color} aria-hidden="true" />
                <span className="text-sm font-medium text-white">{t(`injury.feeling_${key}`)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            {selectedConfig && (
              <selectedConfig.icon size={40} className={`mx-auto mb-3 ${selectedConfig.color}`} aria-hidden="true" />
            )}
            <p className="text-sm text-gray-300">
              {t(FEEDBACK_KEYS[selectedFeeling])}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
