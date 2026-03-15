const CONFIGS = {
  peak:      { bg: 'bg-green-500/10',  border: 'border-green-500/25',  dot: 'bg-green-400',  text: 'text-green-400',  label: 'In de zone'   },
  good:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   dot: 'bg-blue-400',   text: 'text-blue-400',   label: 'Goede sessie' },
  declining: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Let op'       },
  fatigue:   { bg: 'bg-red-500/10',    border: 'border-red-500/25',    dot: 'bg-red-400',    text: 'text-red-400',    label: 'Vermoeid'     },
}

export default function MomentumIndicator({ momentum }) {
  if (!momentum) return null

  const config = CONFIGS[momentum.status] || CONFIGS.good

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} px-3 py-2.5`}>
      <div className="flex items-start gap-2.5">
        {/* Gekleurde dot */}
        <span className={`mt-[3px] h-2 w-2 shrink-0 rounded-full ${config.dot}`} />

        <div className="min-w-0 flex-1">
          {/* Label + PR badge op één rij */}
          <div className="flex items-center gap-2">
            <p className={`text-xs font-semibold ${config.text}`}>{config.label}</p>
            {momentum.showPRHint && (
              <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                PR MOMENT
              </span>
            )}
          </div>

          {/* Bericht — volledig, geen truncate */}
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
            {momentum.message}
          </p>
        </div>
      </div>
    </div>
  )
}
