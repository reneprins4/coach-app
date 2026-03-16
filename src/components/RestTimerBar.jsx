import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export default function RestTimerBar({ remaining, total, onStop }) {
  const { t } = useTranslation()
  const progress = total > 0 ? (total - remaining) / total : 0

  // Label based on rest time
  function getRestLabel(total) {
    if (total >= 180) return t('rest_timer.heavy_set')
    if (total >= 150) return t('rest_timer.intense_set')
    if (total <= 75)  return t('rest_timer.light_set')
    return t('rest_timer.rest')
  }

  const label = getRestLabel(total)
  const isAdaptive = total !== 90 // show label only if it differs from default

  return (
    <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="tabular text-lg font-bold text-cyan-500">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          <div>
            <span className="text-sm text-gray-400">{isAdaptive ? label : t('rest_timer.rest')}</span>
            {isAdaptive && (
              <span className="ml-2 text-[10px] text-gray-600">({total}s)</span>
            )}
          </div>
        </div>
        <button onClick={onStop} className="p-2 text-gray-500 active:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
