import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RehabExercise } from '../lib/injuryRecovery'

interface RehabCardProps {
  exercises: RehabExercise[]
  injuryLabel: string
}

const INITIAL_VISIBLE = 2

export default function RehabCard({ exercises, injuryLabel }: RehabCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (exercises.length === 0) return null

  const visible = expanded ? exercises : exercises.slice(0, INITIAL_VISIBLE)
  const hasMore = exercises.length > INITIAL_VISIBLE

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span className="label-caps text-cyan-400">
          {t('injury.rehab_exercises')}
        </span>
        <span className="text-xs text-gray-500">{injuryLabel}</span>
      </div>

      <div className="space-y-3">
        {visible.map((exercise, i) => (
          <div key={`${exercise.name}-${i}`} className="rounded-xl bg-gray-800/50 p-3">
            <p className="text-sm font-semibold text-white">{exercise.name}</p>
            <p className="mt-0.5 text-xs text-gray-400">{exercise.description}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {exercise.sets} x {exercise.reps}
              </span>
              <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
                {exercise.frequency}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 active:text-white"
        >
          {expanded ? (
            <>
              {t('injury.show_less')} <ChevronUp size={14} />
            </>
          ) : (
            <>
              {t('injury.show_all', { count: exercises.length })} <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  )
}
