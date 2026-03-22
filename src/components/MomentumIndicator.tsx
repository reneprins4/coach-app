import { useTranslation } from 'react-i18next'
import type { MomentumIndicatorProps, MomentumStatus } from '../types'

const CONFIGS: Record<MomentumStatus, { bg: string; border: string; dot: string; text: string; labelKey: string }> = {
  peak:      { bg: 'bg-green-500/10',  border: 'border-green-500/25',  dot: 'bg-green-400',  text: 'text-green-400',  labelKey: 'momentum.peak'   },
  good:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   dot: 'bg-blue-400',   text: 'text-blue-400',   labelKey: 'momentum.good' },
  declining: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', dot: 'bg-yellow-400', text: 'text-yellow-400', labelKey: 'momentum.declining'       },
  fatigue:   { bg: 'bg-red-500/10',    border: 'border-red-500/25',    dot: 'bg-red-400',    text: 'text-red-400',    labelKey: 'momentum.fatigue'     },
  deload:    { bg: 'bg-gray-500/10',   border: 'border-gray-500/25',   dot: 'bg-gray-400',   text: 'text-gray-400',   labelKey: 'momentum.deload'  },
}

const SHOW_ONLY: MomentumStatus[] = ['peak', 'fatigue', 'deload']

export default function MomentumIndicator({ momentum }: MomentumIndicatorProps) {
  const { t } = useTranslation()

  if (!momentum) return null
  if (!SHOW_ONLY.includes(momentum.status)) return null

  const config = CONFIGS[momentum.status]

  return (
    <div className={`flex items-center gap-2 rounded-lg border ${config.border} ${config.bg} px-3 py-2`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <p className={`text-xs font-semibold ${config.text}`}>{t(config.labelKey)}</p>
      {momentum.showPRHint && (
        <span className="ml-auto rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
          {t('momentum.pr_moment')}
        </span>
      )}
    </div>
  )
}
