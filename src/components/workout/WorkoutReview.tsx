import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronDown, ChevronUp, Clock, ArrowRightLeft, Play } from 'lucide-react'
import SwapModal from './SwapModal'
import { getSettings } from '../../lib/settings'
import type { AIWorkoutResponse, AIExercise, ActiveExercise, SubstituteExercise, UserSettings } from '../../types'

export interface WorkoutReviewProps {
  workout: AIWorkoutResponse
  split: string
  estimatedDuration: number
  onStart: () => void
  onBack: () => void
  onSwapExercise: (index: number, exercise: AIExercise) => void
}

export function WorkoutReview({ workout, split, estimatedDuration, onStart, onBack, onSwapExercise }: WorkoutReviewProps) {
  const { t } = useTranslation()
  const [showReasoning, setShowReasoning] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{ index: number; exercise: AIExercise } | null>(null)

  const settings = getSettings() as UserSettings
  const exercises = workout.exercises ?? []

  const exercisesByMuscle = useMemo(() => {
    const groups: { muscle: string; exercises: { exercise: AIExercise; globalIndex: number }[] }[] = []
    const seen = new Map<string, number>()
    exercises.forEach((ex, i) => {
      const key = ex.muscle_group || 'other'
      if (seen.has(key)) {
        groups[seen.get(key)!]!.exercises.push({ exercise: ex, globalIndex: i })
      } else {
        seen.set(key, groups.length)
        groups.push({ muscle: key, exercises: [{ exercise: ex, globalIndex: i }] })
      }
    })
    return groups
  }, [exercises])

  const currentExerciseNames = exercises.map(ex => ex.name)

  function handleSwapAccept(substitute: SubstituteExercise) {
    if (!swapTarget) return
    const newExercise: AIExercise = {
      name: substitute.name,
      muscle_group: (substitute.muscle_group || swapTarget.exercise.muscle_group) as AIExercise['muscle_group'],
      sets: substitute.sets ?? swapTarget.exercise.sets,
      reps_min: substitute.reps_min ?? swapTarget.exercise.reps_min,
      reps_max: substitute.reps_max ?? swapTarget.exercise.reps_max,
      weight_kg: substitute.weight_kg ?? swapTarget.exercise.weight_kg,
      rpe_target: substitute.rpe_target ?? swapTarget.exercise.rpe_target,
      rest_seconds: substitute.rest_seconds ?? swapTarget.exercise.rest_seconds,
      notes: substitute.notes ?? '',
      vs_last_session: 'new',
    }
    onSwapExercise(swapTarget.index, newExercise)
    setSwapTarget(null)
  }

  function toActiveExercise(ex: AIExercise): ActiveExercise {
    return {
      name: ex.name, muscle_group: ex.muscle_group, sets: [],
      plan: { sets: ex.sets, reps_min: ex.reps_min, reps_max: ex.reps_max, weight_kg: ex.weight_kg, rpe_target: ex.rpe_target, rest_seconds: ex.rest_seconds, notes: ex.notes },
    }
  }

  return (
    <div className="min-h-dvh bg-gray-950 px-5 pt-6 pb-28">
      {/* ━━ Header ━━ */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="flex h-10 items-center gap-1.5 rounded-xl text-sm font-medium text-gray-600 transition-colors active:text-white min-h-[44px] -ml-1" aria-label={t('common.back')}>
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <span className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-400">
          {split}
        </span>
      </div>

      {/* ━━ Title ━━ */}
      <div className="mb-6">
        <h1 className="text-display">{t('review.your_ai_workout')}</h1>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            <span className="font-bold tabular text-white">{exercises.length}</span> {t('common.exercises')}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock size={13} /> ~{estimatedDuration} min
          </span>
        </div>
      </div>

      {/* ━━ Exercises ━━ */}
      {exercisesByMuscle.map(({ muscle, exercises: groupExercises }) => (
        <div key={muscle} className="mb-5">
          <p className="label-caps mb-2">{t(`muscles.${muscle}`)}</p>
          <div className="space-y-2">
            {groupExercises.map(({ exercise: ex, globalIndex }) => (
              <div key={globalIndex} className="card flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="tabular">{ex.sets}&times;{ex.reps_min}-{ex.reps_max}</span>
                    <span className="font-semibold text-cyan-400 tabular">{ex.weight_kg}kg</span>
                    <span>RPE {ex.rpe_target}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSwapTarget({ index: globalIndex, exercise: ex })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-500 transition-colors active:bg-white/[0.08] min-h-[44px] min-w-[44px]"
                  aria-label={t('logger.swap_exercise')}
                >
                  <ArrowRightLeft size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ━━ Reasoning ━━ */}
      {workout.reasoning && (
        <div className="mb-6">
          <button onClick={() => setShowReasoning(!showReasoning)} className="card flex w-full items-center justify-between text-sm text-gray-500 p-4">
            <span>{t('aicoach.why_this_training')}</span>
            {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showReasoning && (
            <div className="card mt-1 p-4">
              <p className="text-sm leading-relaxed text-gray-400">{workout.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* ━━ Start ━━ */}
      <button onClick={onStart} className="btn-primary" aria-label={t('aicoach.start_workout')}>
        <Play size={18} fill="white" /> {t('aicoach.start_workout')}
      </button>

      {swapTarget && (
        <SwapModal exercise={toActiveExercise(swapTarget.exercise)} settings={settings} currentExerciseNames={currentExerciseNames} onAccept={handleSwapAccept} onClose={() => setSwapTarget(null)} />
      )}
    </div>
  )
}
