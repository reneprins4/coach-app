const CONFIGS = {
  peak:     { bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-400',  label: 'In de zone'       },
  good:     { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   label: 'Goede sessie'     },
  declining:{ bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Let op'           },
  fatigue:  { bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400',    label: 'Vermoeid'         },
}

export default function MomentumIndicator({ momentum }) {
  if (!momentum) return null

  const config = CONFIGS[momentum.status] || CONFIGS.good

  return (
    <div className={`flex items-center gap-2 rounded-lg border ${config.border} ${config.bg} px-3 py-2`}>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${config.text}`}>{config.label}</p>
        <p className="text-[11px] text-gray-400 truncate">{momentum.message}</p>
      </div>
      {momentum.showPRHint && (
        <span className="shrink-0 rounded bg-green-500/20 px-2 py-1 text-[10px] font-bold text-green-400">
          PR MOMENT
        </span>
      )}
    </div>
  )
}
