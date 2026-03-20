import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle } from 'lucide-react'
import { analyzeWeaknesses } from '../lib/weaknessHunter'
import type { Workout } from '../types'

interface WeaknessHunterProps {
  workouts: Workout[]
  priorityMuscles?: string[]
}

// Cyan-based palette — consistent with app accent color
const MG_ACCENT_HEX = {
  chest:     '#06b6d4',
  back:      '#3b82f6',
  legs:      '#10b981',
  shoulders: '#8b5cf6',
  arms:      '#f59e0b',
  core:      '#ec4899',
}

export default function WeaknessHunter({ workouts, priorityMuscles = [] }: WeaknessHunterProps) {
  const { t } = useTranslation()
  const [weeksBack, setWeeksBack] = useState(4)

  const analysis = useMemo(() => analyzeWeaknesses(workouts, weeksBack), [workouts, weeksBack])
  const maxSets = Math.max(...(analysis.sortedGroups || []).map(g => g.sets), 1)

  if (!analysis.hasEnoughData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
          <CheckCircle size={24} className="text-gray-600" />
        </div>
        <p className="label-caps mb-1">{t('weakness.insufficient_data')}</p>
        <p className="text-sm text-gray-500">{t('weakness.insufficient_sub', { weeks: weeksBack })}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">{t('weakness.title')}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-white">{analysis.workoutCount}</span>
            <span className="text-sm text-gray-500">{t('dashboard.workouts').toLowerCase()}</span>
            <span className="text-gray-700">·</span>
            <span className="text-2xl font-black tracking-tight text-white">{analysis.totalSets}</span>
            <span className="text-sm text-gray-500">{t('common.sets')}</span>
          </div>
        </div>

        {/* Week selector — tab bar style */}
        <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
          {[2, 4, 8].map(w => (
            <button
              key={w}
              onClick={() => setWeeksBack(w)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                weeksBack === w
                  ? 'bg-white text-black'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {w}w
            </button>
          ))}
        </div>
      </div>

      {/* Volume bars card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="label-caps mb-4">{t('weakness.volume_per_group')}</p>
        <div className="space-y-4">
          {analysis.sortedGroups.map(group => {
            const pct = Math.round((group.sets / maxSets) * 100)
            const hex = (MG_ACCENT_HEX as Record<string, string>)[group.key] || '#06b6d4'
            const isPriority = priorityMuscles.includes(group.key)
            return (
              <div key={group.key}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight text-white">{group.name}</span>
                    {isPriority && (
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
                        {t('priority_muscles.focus_badge')}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-sm font-bold text-gray-300">
                    {group.sets} <span className="font-normal text-gray-600">{t('common.sets')}</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: hex, minWidth: group.sets > 0 ? '6px' : '0' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Imbalances */}
      {analysis.imbalances.length > 0 ? (
        <div className="space-y-3">
          <p className="label-caps">{t('weakness.needs_attention')}</p>
          {analysis.imbalances.map((imb, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4"
              style={
                imb.severity === 'high'
                  ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
                  : { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }
              }
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black tracking-tight text-white">{imb.weakNL}</span>
                <span
                  className="rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums"
                  style={
                    imb.severity === 'high'
                      ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                      : { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
                  }
                >
                  -{imb.deficit}%
                </span>
              </div>
              <p className="mb-2 text-xs text-gray-400">
                {imb.dominantNL}: <span className="font-bold text-gray-300">{imb.dominantSets}</span> {t('common.sets')} &nbsp;·&nbsp;
                {imb.weakNL}: <span className="font-bold text-gray-300">{imb.weakSets}</span> {t('common.sets')}
              </p>
              <p className="text-xs text-gray-500">{imb.advice}</p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-white">{t('weakness.good_balance')}</p>
              <p className="text-xs text-gray-500">{t('weakness.no_imbalances', { weeks: weeksBack })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
