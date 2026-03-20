import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { detectPlateaus } from '../lib/plateauDetector'
import type { PlateauAlertProps } from '../types'

const STATUS_CONFIG = {
  plateau: {
    labelKey: 'plateau_alert.plateau',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400'
  },
  slowing: {
    labelKey: 'plateau_alert.slowing',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400'
  }
}

export default function PlateauAlert({ workouts, maxItems = 3 }: PlateauAlertProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const plateaus = useMemo(() => {
    if (!workouts || workouts.length < 5) return []
    return detectPlateaus(workouts)
  }, [workouts])

  if (plateaus.length === 0) return null

  const visiblePlateaus = expanded ? plateaus : plateaus.slice(0, maxItems)
  const hasMore = plateaus.length > maxItems

  return (
    <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t('plateau_alert.title', 'Attention Points')}
        </p>
        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
          {t('plateau_alert.exercise_count', { count: plateaus.length, defaultValue: `${plateaus.length} exercise${plateaus.length !== 1 ? 's' : ''}` })}
        </span>
      </div>

      <div className="space-y-3">
        {visiblePlateaus.map((item, idx) => {
          const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]

          return (
            <div
              key={idx}
              className={`rounded-lg border ${config.border} ${config.bg} p-3`}
            >
              <div className="flex items-start gap-3">
                <TrendingDown size={16} className={`mt-0.5 shrink-0 ${config.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">{item.exercise}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badge}`}>
                      {t(config.labelKey, item.status === 'plateau' ? 'Plateau' : 'Slowing')}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>e1RM: {item.currentE1rm}kg</span>
                    <span>{item.weeklyGrowthPct}%/week</span>
                  </div>

                  {/* Mini trend grafiek */}
                  {item.weeklyData && item.weeklyData.length > 2 && (
                    <div className="mb-2 h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={item.weeklyData}>
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                          <Line
                            type="monotone"
                            dataKey="e1rm"
                            stroke={item.status === 'plateau' ? '#ef4444' : '#eab308'}
                            strokeWidth={2}
                            dot={{ r: 2, fill: item.status === 'plateau' ? '#ef4444' : '#eab308' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">{item.recommendation}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-800 py-2 text-xs text-gray-400 transition-colors active:bg-gray-700"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} />
              {t('common.show_less', 'Show less')}
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              {t('common.show_more', { count: plateaus.length - maxItems, defaultValue: `Show ${plateaus.length - maxItems} more` })}
            </>
          )}
        </button>
      )}
    </div>
  )
}
