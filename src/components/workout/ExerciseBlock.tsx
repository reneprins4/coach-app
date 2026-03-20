import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, MoreVertical, X, ChevronDown, Trophy, RotateCcw } from 'lucide-react'
import { getExerciseHistory, type ExerciseHistorySet } from '../../hooks/useWorkouts'
import { detectPR } from '../../lib/prDetector'
import { hapticFeedback } from '../../lib/native'
import { isCompound, generateWarmupSets } from '../../lib/warmupCalculator'
import ExerciseGuide from '../ExerciseGuide'
import RpeButtons from './RpeButtons'
import type { ActiveExercise, PRBanner } from '../../types'

// Helper function for progressive overload suggestion
function suggestNextWeight(kg: number): number | null {
  if (!kg || kg <= 0) return null
  const next = kg + 2.5
  return Math.round(next * 2) / 2
}

interface SetData {
  weight_kg: number
  reps: number
  rpe: number | null
}

interface LastUsedData {
  weight_kg: number
  reps: number
}

interface HistoricalSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
}

export interface ExerciseBlockProps {
  exercise: ActiveExercise
  userId: string | undefined
  onAddSet: (data: SetData) => void
  onRemoveSet: (id: string, setData: SetData) => void
  onRemove: () => void
  onSwap: () => void
  onOpenPlateCalc: (weight: number) => void
  lastUsed: LastUsedData | null
  compact?: boolean
  prefetchedHistory?: ExerciseHistorySet[] | null
  beginnerMode?: boolean
}

const ExerciseBlock = React.memo(function ExerciseBlock({
  exercise,
  userId,
  onAddSet,
  onRemoveSet,
  onRemove,
  onSwap,
  onOpenPlateCalc,
  lastUsed,
  compact,
  prefetchedHistory,
  beginnerMode,
}: ExerciseBlockProps) {
  const { t } = useTranslation()
  const [weight, setWeight] = useState(
    exercise.plan?.weight_kg?.toString() || lastUsed?.weight_kg?.toString() || ''
  )
  const [reps, setReps] = useState(
    exercise.plan?.reps_min?.toString() || lastUsed?.reps?.toString() || ''
  )
  const [rpe, setRpe] = useState<number | null>(null)
  const [prevData, setPrevData] = useState<{ weight: number; reps: number } | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // PR Banner state
  const [prBanner, setPrBanner] = useState<PRBanner | null>(null)
  const [historicalSets, setHistoricalSets] = useState<HistoricalSet[]>([])

  // Warmup state
  const [showWarmup, setShowWarmup] = useState(false)
  const [warmupDone, setWarmupDone] = useState<number[]>([])

  // Check if this is a compound exercise
  const isCompoundExercise = isCompound(exercise.name)
  const workingWeight = parseFloat(exercise.plan?.weight_kg?.toString() || '') || parseFloat(weight) || 0
  const warmupSets = useMemo(() => {
    if (!isCompoundExercise || exercise.sets.length > 0) return []
    return generateWarmupSets(exercise.name, workingWeight)
  }, [isCompoundExercise, exercise.name, workingWeight, exercise.sets.length])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Load previous session data and historical sets for PR detection
  useEffect(() => {
    let cancelled = false

    function applyHistory(data: { weight_kg: number | null; reps: number | null }[]) {
      if (cancelled || data.length === 0) return
      setHistoricalSets(data.map(s => ({
        exercise: exercise.name,
        weight_kg: s.weight_kg,
        reps: s.reps,
      })))
      const latest = data[0]!
      setPrevData({ weight: latest.weight_kg ?? 0, reps: latest.reps ?? 0 })
      if (!exercise.plan?.reps_min) {
        setReps(prev => prev || latest.reps?.toString() || '')
      }
      if (!exercise.plan?.weight_kg) {
        setWeight(prev => prev || latest.weight_kg?.toString() || '')
      }
    }

    if (prefetchedHistory) {
      applyHistory(prefetchedHistory)
    } else if (userId && exercise.name) {
      getExerciseHistory(exercise.name, userId).then(data => applyHistory(data))
    }
    return () => { cancelled = true }
  }, [exercise.name, userId, prefetchedHistory])

  // Auto-dismiss PR banner after 4 seconds
  useEffect(() => {
    if (prBanner) {
      const timer = setTimeout(() => setPrBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [prBanner])

  function handleAdd() {
    const w = parseFloat(weight) || 0
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return

    let isPR = false
    if (historicalSets.length > 0) {
      const pr = detectPR(exercise.name, w, r, historicalSets)
      if (pr && pr.isPR) {
        isPR = true
        setPrBanner({
          weight: w,
          reps: r,
          improvement: pr.improvement,
          type: pr.type,
        })
      }
    }

    // Haptic feedback: heavy for PR, light for normal set
    hapticFeedback(isPR ? 'heavy' : 'light')

    onAddSet({ weight_kg: w, reps: r, rpe })
  }

  function adjustWeight(delta: number) {
    const current = parseFloat(weight) || 0
    setWeight(String(Math.max(0, current + delta)))
  }

  function adjustReps(delta: number) {
    const current = parseInt(reps, 10) || 0
    setReps(String(Math.max(0, current + delta)))
  }

  // Build AI target string
  const aiTarget = exercise.plan ? (
    `${exercise.plan.sets}x${exercise.plan.reps_min}${exercise.plan.reps_max && exercise.plan.reps_max !== exercise.plan.reps_min ? `-${exercise.plan.reps_max}` : ''} @ ${exercise.plan.weight_kg}kg${exercise.plan.rpe_target ? ` · RPE ${exercise.plan.rpe_target}` : ''}`
  ) : null

  const plannedSets = exercise.plan?.sets ?? null
  const loggedSets = exercise.sets?.length ?? 0
  const isDone = plannedSets !== null && loggedSets >= plannedSets

  return (
    <div className={`rounded-2xl border min-w-0 w-full transition-colors ${
      isDone
        ? (compact ? 'border-green-500/30 bg-gray-800/50' : 'border-green-500/25 bg-gray-900')
        : (compact ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900')
    }`}>
      {/* Header */}
      <div className={`border-b border-gray-800 px-4 ${compact ? 'py-3' : 'py-4'}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Exercise thumbnail */}
          {exercise.image_url_0 && (
            <img
              src={exercise.image_url_0}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg bg-gray-800 object-cover"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`font-black tracking-tight text-white truncate ${compact ? 'text-base' : 'text-xl'}`}>{exercise.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              {exercise.muscle_group && (
                <span className="label-caps">{exercise.muscle_group}</span>
              )}
              {aiTarget && (
                <span className="label-caps text-cyan-500">{aiTarget}</span>
              )}
              {plannedSets !== null && (
                <span className={`label-caps font-bold ${isDone ? 'text-green-400' : 'text-gray-500'}`}>
                  {isDone ? `\u2713 ${loggedSets}/${plannedSets} sets` : `${loggedSets}/${plannedSets} sets`}
                </span>
              )}
            </div>
          </div>

          {/* Form button + 3-dot menu */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-400 active:bg-gray-800 active:text-white transition-colors"
            >
              {t('logger.technique')}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label={t('logger.menu') || 'Menu'}
                aria-expanded={showMenu}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 active:text-gray-400 min-h-[44px] min-w-[44px]"
              >
                <MoreVertical size={18} aria-hidden="true" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900 shadow-2xl">
                  <button
                    onClick={() => { setShowGuide(true); setShowMenu(false) }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-gray-800"
                  >
                    {t('logger.explain')}
                  </button>
                  <button
                    onClick={() => { onSwap(); setShowMenu(false) }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-gray-800"
                  >
                    {t('logger.swap_exercise')}
                  </button>
                  <div className="mx-4 border-t border-gray-800" />
                  <button
                    onClick={() => { onRemove(); setShowMenu(false) }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-red-400 active:bg-gray-800"
                  >
                    {t('logger.remove')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showGuide && <ExerciseGuide exercise={exercise} onClose={() => setShowGuide(false)} />}

      {/* Warmup section for compound exercises */}
      {isCompoundExercise && exercise.sets.length === 0 && warmupSets.length > 0 && (
        <div className="border-b border-gray-800 px-4 py-3">
          <button
            onClick={() => setShowWarmup(!showWarmup)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-800/50 px-3 py-2.5 text-left active:bg-gray-700/50"
          >
            <span className="text-sm font-semibold text-gray-400">
              {showWarmup ? t('warmup.title') : t('warmup.calculate')}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform ${showWarmup ? 'rotate-180' : ''}`}
            />
          </button>

          {showWarmup && (
            <div className="mt-2 space-y-1.5">
              {warmupSets.map((ws, idx) => {
                const wsIsDone = warmupDone.includes(idx)
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      wsIsDone ? 'bg-green-500/10' : 'bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="label-caps w-8 text-right">{idx + 1}</span>
                      <span className="text-sm font-bold text-white tabular-nums">
                        {ws.isBarOnly ? (
                          <span className="text-gray-400">{t('warmup.bar_only')}</span>
                        ) : (
                          <>{ws.weight_kg}<span className="text-xs font-normal text-gray-500">kg</span></>
                        )}
                        <span className="mx-1.5 text-gray-600">x</span>
                        {ws.reps}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (wsIsDone) {
                          setWarmupDone(prev => prev.filter(i => i !== idx))
                        } else {
                          const newDone = [...warmupDone, idx]
                          setWarmupDone(newDone)
                          if (newDone.length === warmupSets.length) {
                            setTimeout(() => setShowWarmup(false), 300)
                          }
                        }
                      }}
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                        wsIsDone
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-400 active:bg-gray-700'
                      }`}
                    >
                      {wsIsDone ? <Check size={14} /> : t('warmup.done_btn')}
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => setShowWarmup(false)}
                className="mt-2 w-full py-1 text-center text-xs text-gray-600 active:text-gray-400"
              >
                {t('warmup.hide')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logged sets */}
      {exercise.sets.length > 0 && (
        <div className="border-b border-gray-800 px-4 py-3 space-y-1.5">
          {exercise.sets.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onRemoveSet(s.id, { weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe })}
              className="flex w-full items-center justify-between rounded-xl bg-gray-800/70 px-4 py-2.5 active:bg-gray-700/80"
            >
              <div className="flex items-center gap-3">
                <span className="label-caps w-8 text-right">{i + 1}</span>
                <span className="text-base font-bold tracking-tight text-white tabular">
                  {s.weight_kg}<span className="text-sm font-normal text-gray-500">kg</span>
                  <span className="mx-1.5 text-gray-600">{'\u00D7'}</span>
                  {s.reps}<span className="text-sm font-normal text-gray-500"> reps</span>
                </span>
                {s.rpe && <span className="label-caps">RPE {s.rpe}</span>}
              </div>
              <Check size={14} className="text-green-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Repeat last set button */}
      {exercise.sets.length > 0 && (() => {
        const lastSet = exercise.sets[exercise.sets.length - 1]!
        return (
          <div className="px-4 pt-3">
            <button
              onClick={() => onAddSet({ weight_kg: lastSet.weight_kg, reps: lastSet.reps, rpe: lastSet.rpe })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 text-sm font-medium text-gray-400 active:bg-gray-800 active:text-white min-h-[44px]"
            >
              <RotateCcw size={14} />
              {t('logger.repeat_set')} {lastSet.weight_kg}kg {'\u00D7'} {lastSet.reps}
            </button>
          </div>
        )
      })()}

      {/* PR Banner */}
      {prBanner && (
        <div role="status" aria-live="polite" className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-cyan-400 shrink-0" />
            <span className="text-sm font-bold text-cyan-400">
              {t('pr.new_record')}: {prBanner.weight}kg {'\u00B7'} {prBanner.reps} reps
              {prBanner.improvement > 0 && (
                <span className="ml-2 text-cyan-300">+{prBanner.improvement}kg</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setPrBanner(null)}
            className="p-1 text-cyan-500 active:text-cyan-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input section */}
      <div className="px-4 py-4 space-y-4">
        {/* Weight + Reps side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weight */}
          <div>
            <div className="mb-2 flex h-5 items-center justify-between">
              <span className="label-caps">{t('logger.weight')}</span>
              <button
                type="button"
                onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)}
                className="label-caps text-cyan-500 active:text-cyan-400"
              >
                {t('logger.plates')}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                aria-label={t('logger.weight') + ' -2.5kg'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700 min-h-[44px] min-w-[44px]"
              >
                {'\u2212'}
              </button>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="\u2014"
                aria-label={t('logger.weight')}
                className="h-11 min-w-0 flex-1 rounded-xl bg-gray-800 px-2 text-center text-lg font-black tracking-tight text-white tabular outline-none placeholder-gray-700"
              />
              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                aria-label={t('logger.weight') + ' +2.5kg'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700 min-h-[44px] min-w-[44px]"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps */}
          <div>
            <div className="mb-2 flex h-5 items-center">
              <span className="label-caps">{t('logger.reps_label')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                aria-label={t('logger.reps_label') + ' -1'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700 min-h-[44px] min-w-[44px]"
              >
                {'\u2212'}
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="\u2014"
                aria-label={t('logger.reps_label')}
                className="h-11 min-w-0 flex-1 rounded-xl bg-gray-800 px-2 text-center text-lg font-black tracking-tight text-white tabular outline-none placeholder-gray-700"
              />
              <button
                type="button"
                onClick={() => adjustReps(1)}
                aria-label={t('logger.reps_label') + ' +1'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-light text-gray-400 active:bg-gray-700 min-h-[44px] min-w-[44px]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Previous session hint with progressive overload suggestion */}
        {prevData && (
          <p className="text-center label-caps">
            {t('logger.last_session')}: <span className="text-gray-400">{prevData.weight}kg {'\u00D7'} {prevData.reps}</span>
            {suggestNextWeight(prevData.weight) && (
              <span className="text-cyan-400 font-medium"> {'\u2014'} {t('logger.try')}: {suggestNextWeight(prevData.weight)}kg</span>
            )}
          </p>
        )}

        {/* RPE hint for junk volume analysis */}
        {exercise.sets.length >= 3 && !exercise.sets.some(s => s.rpe) && (
          <p className="text-center text-[10px] text-gray-700">{t('logger.rpe_hint')}</p>
        )}

        {/* RPE buttons */}
        <RpeButtons value={rpe} onChange={setRpe} beginnerMode={beginnerMode} />

        {/* Done state banner */}
        {isDone ? (
          <div className="flex items-center justify-between rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Check size={15} className="text-green-400 shrink-0" />
              <span className="text-sm font-semibold text-green-400">{t('logger.exercise_done')}</span>
            </div>
            <button
              onClick={handleAdd}
              className="text-xs font-medium text-gray-500 active:text-gray-300"
            >
              {t('logger.extra_set')}
            </button>
          </div>
        ) : (
          <>
            {/* Add set button */}
            <button
              onClick={handleAdd}
              className="btn-primary"
            >
              {t('logger.log_set')}
            </button>

            {/* Skip */}
            <button
              onClick={onRemove}
              className="w-full py-1 text-xs font-medium text-gray-600 active:text-gray-400"
            >
              {t('common.skip')}
            </button>
          </>
        )}
      </div>
    </div>
  )
})

export default ExerciseBlock
