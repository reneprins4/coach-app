import { AlertTriangle, X } from 'lucide-react'

/**
 * Waarschuwing banner voor junk volume detectie
 * Verschijnt wanneer set-kwaliteit daalt tijdens een oefening
 */
export default function JunkVolumeAlert({ warning, onDismiss }) {
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
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 p-1 text-gray-400 active:text-white"
        aria-label="Sluiten"
      >
        <X size={16} />
      </button>

      {/* Header */}
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
          {isHigh ? 'Stop - junk volume' : 'Let op - kwaliteit daalt'}
        </span>
      </div>

      {/* Message */}
      <p className="mb-2 pr-6 text-sm text-white">{warning.message}</p>

      {/* Recommendation */}
      <p
        className={`text-xs ${
          isHigh ? 'text-red-300' : 'text-orange-300'
        }`}
      >
        {warning.recommendation}
      </p>

      {/* Dismiss text */}
      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-gray-400 underline"
      >
        Ik snap het, ga verder
      </button>
    </div>
  )
}
