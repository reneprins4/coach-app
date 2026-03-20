import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { RestTimerBarProps } from '../types'

interface ExtendedRestTimerBarProps extends RestTimerBarProps {
  onSetDuration?: (seconds: number) => void
  onAddTime?: (seconds: number) => void
}

const QUICK_DURATIONS = [30, 60, 90, 120] as const

export default function RestTimerBar({ remaining, total, onStop, onSetDuration, onAddTime }: ExtendedRestTimerBarProps) {
  const { t } = useTranslation()
  const progress = total > 0 ? (total - remaining) / total : 0

  function getRestLabel(totalSeconds: number): string {
    if (totalSeconds >= 180) return t('rest_timer.heavy_set')
    if (totalSeconds >= 150) return t('rest_timer.intense_set')
    if (totalSeconds <= 75)  return t('rest_timer.light_set')
    return t('rest_timer.rest')
  }

  const label = getRestLabel(total)
  const isAdaptive = total !== 90

  return (
    <div className="border-b border-gray-800 bg-gray-900 px-4 py-3" role="timer" aria-live="off" aria-label={t('rest_timer.rest')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="tabular text-lg font-bold text-cyan-500" aria-label={`${Math.floor(remaining / 60)} ${t('finish_modal.minutes') || 'minutes'} ${remaining % 60} seconds`}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          <div>
            <span className="text-sm text-gray-400">{isAdaptive ? label : t('rest_timer.rest')}</span>
            {isAdaptive && (
              <span className="ml-2 text-[10px] text-gray-600">({total}s)</span>
            )}
          </div>
        </div>
        <button onClick={onStop} aria-label={t('rest_timer.stop') || 'Stop timer'} className="p-2 text-gray-500 active:text-white min-h-[44px] min-w-[44px]">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {/* Quick duration buttons */}
      <div className="flex gap-1.5 mt-2" data-testid="quick-buttons">
        {QUICK_DURATIONS.map(seconds => (
          <button
            key={seconds}
            type="button"
            onClick={() => onSetDuration?.(seconds)}
            aria-label={`${seconds}s`}
            className="flex-1 rounded-xl bg-gray-800 py-2 text-xs font-medium text-gray-300 active:bg-gray-700 min-h-[44px] transition-colors"
          >
            {seconds}s
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAddTime?.(30)}
          aria-label="+30s"
          className="flex-1 rounded-xl bg-gray-800 py-2 text-xs font-medium text-cyan-400 active:bg-gray-700 min-h-[44px] transition-colors"
        >
          +30s
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label={t('rest_timer.skip') || 'Skip'}
          className="flex-1 rounded-xl bg-gray-800 py-2 text-xs font-medium text-gray-500 active:bg-gray-700 min-h-[44px] transition-colors"
        >
          {t('rest_timer.skip')}
        </button>
      </div>
    </div>
  )
}
