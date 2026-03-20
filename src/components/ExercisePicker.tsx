import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Search } from 'lucide-react'
import { useFilteredExercises } from '../hooks/useExercises'
import { useModalA11y } from '../hooks/useModalA11y'
import type { ExercisePickerProps } from '../types'

const MUSCLE_FILTERS = ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core']
const EQUIPMENT_FILTERS = [
  { value: null, labelKey: 'exercise_picker.all' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
]

const EQUIPMENT_BADGE = {
  barbell: 'bg-blue-500/20 text-blue-400',
  dumbbell: 'bg-purple-500/20 text-purple-400',
  cable: 'bg-green-500/20 text-green-400',
  machine: 'bg-yellow-500/20 text-yellow-400',
  bodyweight: 'bg-gray-500/20 text-gray-400',
}

export default function ExercisePicker({ exercises, addedNames = [], onSelect, onClose }: ExercisePickerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null)
  const filtered = useFilteredExercises(exercises as Parameters<typeof useFilteredExercises>[0], query, muscleFilter, equipmentFilter)
  const available = filtered.filter(e => !addedNames.includes(e.name))
  useModalA11y(true, onClose)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="exercise-picker-title" className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <h2 id="exercise-picker-title" className="sr-only">{t('exercise_picker.search_placeholder')}</h2>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <button onClick={onClose} aria-label={t('common.close') || 'Close'} className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800 min-h-[44px] min-w-[44px]">
          <X size={20} aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('exercise_picker.search_placeholder')}
            aria-label={t('exercise_picker.search_placeholder')}
            autoFocus
            className="h-12 w-full rounded-xl bg-gray-900 pl-10 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
          />
        </div>
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pt-3 scrollbar-none">
        {MUSCLE_FILTERS.map(mg => (
          <button
            key={mg}
            onClick={() => setMuscleFilter(mg === 'all' ? null : mg)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              (mg === 'all' && !muscleFilter) || mg === muscleFilter
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
            }`}
          >
            {mg === 'all' ? t('exercise_picker.all') : t(`muscles.${mg}`)}
          </button>
        ))}
      </div>

      {/* Equipment filter */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
        {EQUIPMENT_FILTERS.map(eq => (
          <button
            key={eq.label || eq.labelKey}
            onClick={() => setEquipmentFilter(eq.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              equipmentFilter === eq.value
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
            }`}
          >
            {eq.labelKey ? t(eq.labelKey) : eq.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {available.length === 0 && (
          <p className="px-4 py-12 text-center text-gray-500">{t('exercise_picker.no_results')}</p>
        )}
        {available.map(exercise => (
          <button
            key={exercise.id || exercise.name}
            onClick={() => { onSelect(exercise); onClose() }}
            className="flex w-full items-center gap-3 border-b border-gray-900/50 px-4 py-3.5 text-left active:bg-gray-900"
          >
            {/* Exercise thumbnail */}
            {exercise.image_url_0 ? (
              <img
                src={exercise.image_url_0}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg bg-gray-800 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs text-gray-500">
                {exercise.muscle_group?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">
                  {exercise.name}
                  {exercise.subfocus && (
                    <span className="ml-1 text-xs text-gray-500">({exercise.subfocus})</span>
                  )}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {/* Equipment badge */}
                {exercise.equipment && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${(EQUIPMENT_BADGE as Record<string, string>)[exercise.equipment ?? ''] || 'bg-gray-800 text-gray-400'}`}>
                    {exercise.equipment}
                  </span>
                )}
                {/* Muscle tags */}
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                  {exercise.muscle_group}
                </span>
                {exercise.category === 'compound' && (
                  <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-400">
                    compound
                  </span>
                )}
              </div>
            </div>
            <span className="ml-2 text-xl text-gray-700">+</span>
          </button>
        ))}
      </div>
    </div>
  )
}
