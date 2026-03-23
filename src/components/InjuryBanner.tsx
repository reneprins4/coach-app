import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Dumbbell,
  Footprints,
  Undo2,
  Hand,
  Bone,
  Frown,
  CircleDot,
  Bandage,
  type LucideIcon,
} from 'lucide-react'
import type { ActiveInjury } from '../lib/injuryRecovery'
import { isCheckInDue, daysSinceInjury } from '../lib/injuryRecovery'

interface InjuryBannerProps {
  injuries: ActiveInjury[]
  onCheckIn: (injury: ActiveInjury) => void
  onResolve: (injury: ActiveInjury) => void
}

const AREA_ICONS: Record<string, LucideIcon> = {
  shoulder: Dumbbell,
  knee: Footprints,
  lower_back: Undo2,
  elbow: Dumbbell,
  wrist: Hand,
  hip: Bone,
  neck: Frown,
  ankle: CircleDot,
}

const SEVERITY_BORDER: Record<string, string> = {
  mild: 'border-yellow-500/40',
  moderate: 'border-orange-500/40',
  severe: 'border-red-500/40',
}

const SEVERITY_BG: Record<string, string> = {
  mild: 'bg-yellow-500/5',
  moderate: 'bg-orange-500/5',
  severe: 'bg-red-500/5',
}

export default function InjuryBanner({ injuries, onCheckIn, onResolve }: InjuryBannerProps) {
  const { t } = useTranslation()
  const [confirmingResolveId, setConfirmingResolveId] = useState<string | null>(null)

  // Filter to only active/recovering injuries
  const activeInjuries = injuries.filter(i => i.status !== 'resolved')
  if (activeInjuries.length === 0) return null

  function handleResolveClick(injury: ActiveInjury) {
    if (confirmingResolveId === injury.id) {
      // Second click: confirm resolve
      setConfirmingResolveId(null)
      onResolve(injury)
    } else {
      // First click: show confirmation
      setConfirmingResolveId(injury.id)
    }
  }

  function handleCancelResolve() {
    setConfirmingResolveId(null)
  }

  return (
    <div className="mb-4 space-y-2">
      {activeInjuries.map(injury => {
        const checkInDue = isCheckInDue(injury)
        const days = daysSinceInjury(injury)
        const borderClass = SEVERITY_BORDER[injury.severity] ?? 'border-orange-500/40'
        const bgClass = SEVERITY_BG[injury.severity] ?? 'bg-orange-500/5'
        const isConfirming = confirmingResolveId === injury.id
        const AreaIcon = AREA_ICONS[injury.bodyArea] ?? Bandage

        return (
          <div
            key={injury.id}
            className={`card ${borderClass} ${bgClass}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AreaIcon size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">
                      {t(`injury.area_${injury.bodyArea}`)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t(`injury.severity_${injury.severity}`)} · {t(`injury.side_${injury.side}`)} · {t('injury.days_ago', { days })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      injury.status === 'recovering'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {t(`injury.status_${injury.status}`)}
                    </span>
                    {injury.status === 'recovering' && (
                      <div className="h-1 flex-1 max-w-[80px] overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full w-1/2 rounded-full bg-cyan-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleResolveClick(injury)}
                aria-label={t('injury.resolve')}
                className="shrink-0 p-1 text-gray-600 active:text-gray-400"
              >
                <X size={14} />
              </button>
            </div>

            {isConfirming && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2">
                <span className="flex-1 text-xs text-gray-300">
                  {t('injury.resolve_confirm')}
                </span>
                <button
                  onClick={() => handleResolveClick(injury)}
                  className="rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-semibold text-green-400 active:bg-white/[0.08]"
                >
                  {t('common.confirm')}
                </button>
                <button
                  onClick={handleCancelResolve}
                  className="rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-semibold text-gray-400 active:bg-white/[0.08]"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}

            {checkInDue && !isConfirming && (
              <button
                onClick={() => onCheckIn(injury)}
                className="mt-2 w-full rounded-lg bg-white/[0.04] border border-white/[0.06] py-2 text-xs font-semibold text-cyan-400 active:bg-white/[0.08]"
              >
                {t('injury.check_in_prompt')}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
