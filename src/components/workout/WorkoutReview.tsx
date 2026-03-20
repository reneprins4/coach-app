import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Flame, ArrowRightLeft } from 'lucide-react'
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

export function WorkoutReview({
  workout,
  split,
  estimatedDuration,
  onStart,
  onBack,
  onSwapExercise,
}: WorkoutReviewProps) {
  const { t } = useTranslation()
  const [showReasoning, setShowReasoning] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{ index: number; exercise: AIExercise } | null>(null)

  const settings = getSettings() as UserSettings
  const exercises = workout.exercises ?? []

  // Group exercises by muscle_group, preserving order
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

  // Convert AIExercise to ActiveExercise shape for SwapModal
  function toActiveExercise(ex: AIExercise): ActiveExercise {
    return {
      name: ex.name,
      muscle_group: ex.muscle_group,
      sets: [],
      plan: {
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        weight_kg: ex.weight_kg,
        rpe_target: ex.rpe_target,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      },
    }
  }

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6 pb-28">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 active:text-white"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} /> {t('common.back')}
        </button>
        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-bold text-cyan-400">
          {split}
        </span>
      </div>

      {/* Title & summary */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">
          {t('review.your_ai_workout')}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-400">
            <Flame size={14} className="text-cyan-500" />
            {exercises.length} {t('common.exercises')}
          </div>
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-400">
            <Clock size={14} />
            ~{estimatedDuration} {t('aicoach.min')}
          </div>
        </div>
      </div>

      {/* Exercises grouped by muscle */}
      {exercisesByMuscle.map(({ muscle, exercises: groupExercises }) => (
        <div key={muscle} className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 label-caps">
            <span className="h-px flex-1 bg-gray-800" />
            {t(`muscles.${muscle}`)}
            <span className="h-px flex-1 bg-gray-800" />
          </h3>
          <div className="space-y-2">
            {groupExercises.map(({ exercise: ex, globalIndex }) => (
              <div
                key={globalIndex}
                className="card flex items-center justify-between !p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{ex.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <span>{ex.sets}&times;{ex.reps_min}-{ex.reps_max}</span>
                    <span className="text-cyan-400 font-semibold">{ex.weight_kg}kg</span>
                    <span>RPE {ex.rpe_target}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSwapTarget({ index: globalIndex, exercise: ex })}
                  className="ml-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 border border-gray-700 active:bg-gray-800"
                  aria-label={t('logger.swap_exercise')}
                >
                  <ArrowRightLeft size={14} />
                  {t('logger.swap_exercise')}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* AI Reasoning (collapsible) */}
      {workout.reasoning && (
        <div className="mb-6">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400 border border-gray-800"
          >
            <span>{t('aicoach.why_this_training')}</span>
            {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showReasoning && (
            <div className="mt-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-sm leading-relaxed text-gray-300">{workout.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Start Workout button */}
      <button
        onClick={onStart}
        className="btn-primary"
        aria-label={t('aicoach.start_workout')}
      >
        {t('aicoach.start_workout')}
      </button>

      {/* SwapModal */}
      {swapTarget && (
        <SwapModal
          exercise={toActiveExercise(swapTarget.exercise)}
          settings={settings}
          currentExerciseNames={currentExerciseNames}
          onAccept={handleSwapAccept}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  )
}
