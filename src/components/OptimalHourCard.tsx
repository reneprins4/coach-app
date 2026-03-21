import { Clock, ChevronRight } from 'lucide-react'
import type { OptimalHourConfidence } from '../types'

export interface OptimalHourCardProps {
  bestSlot: string
  percentageDifference: number
  confidence: OptimalHourConfidence
  totalWorkouts: number
  onViewDetails: () => void
}

const CONFIDENCE_LABEL: Record<OptimalHourConfidence, string> = {
  none: '',
  low: 'Lage zekerheid',
  medium: 'Gemiddelde zekerheid',
  high: 'Hoge zekerheid',
}

const CONFIDENCE_CLASS: Record<OptimalHourConfidence, string> = {
  none: 'bg-gray-800 text-gray-500',
  low: 'bg-amber-500/10 text-amber-400',
  medium: 'bg-cyan-500/10 text-cyan-400',
  high: 'bg-emerald-500/10 text-emerald-400',
}

export default function OptimalHourCard({
  bestSlot,
  percentageDifference,
  confidence,
  totalWorkouts,
  onViewDetails,
}: OptimalHourCardProps) {
  return (
    <button
      onClick={onViewDetails}
      className="card-accent mb-4 w-full text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
          <Clock size={20} className="text-cyan-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight text-white">
            Jij presteert{' '}
            <span className="text-cyan-400">{Math.round(percentageDifference)}% beter</span>{' '}
            tussen {bestSlot}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Gebaseerd op {totalWorkouts} trainingen
          </p>
        </div>

        <ChevronRight size={16} className="shrink-0 text-gray-600" />
      </div>

      {confidence !== 'none' && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CONFIDENCE_CLASS[confidence]}`}
          >
            {CONFIDENCE_LABEL[confidence]}
          </span>
        </div>
      )}
    </button>
  )
}
