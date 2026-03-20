import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import type { JunkVolumeAlertProps } from '../types'

export default function JunkVolumeAlert({ warning, onDismiss }: JunkVolumeAlertProps) {
  const { t } = useTranslation()
  if (!warning) return null

  const isHigh = warning.severity === 'high'

  return (
    <div
      className={`relative rounded-xl border px-4 py-3 ${
        isHigh
          ? 'border-red-500/50 bg-red-500/20'
          : 'border-orange-500/50 bg-orange-500/20'
      }`}
    >
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 p-1 text-gray-400 active:text-white"
        aria-label={t('common.close')}
      >
        <X size={16} />
      </button>

      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle
          size={18}
          className={isHigh ? 'text-red-400' : 'text-orange-400'}
        />
        <span
          className={`text-sm font-bold ${
            isHigh ? 'text-red-400' : 'text-orange-400'
          }`}
        >
          {isHigh ? t('junk_volume.stop') : t('junk_volume.warning')}
        </span>
      </div>

      <p className="mb-2 pr-6 text-sm text-white">{warning.message}</p>

      <p
        className={`text-xs ${
          isHigh ? 'text-red-300' : 'text-orange-300'
        }`}
      >
        {warning.recommendation}
      </p>

      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-gray-400 underline"
      >
        {t('junk_volume.dismiss')}
      </button>
    </div>
  )
}
