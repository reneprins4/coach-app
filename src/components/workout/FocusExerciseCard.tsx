import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, MoreVertical, X, ChevronDown, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getExerciseHistory, type ExerciseHistorySet } from '../../hooks/useWorkouts'
import { detectPR } from '../../lib/prDetector'
import { hapticFeedback } from '../../lib/native'
import { isCompound, generateWarmupSets } from '../../lib/warmupCalculator'
import ExerciseGuide from '../ExerciseGuide'
import RpeButtons from './RpeButtons'
import { getSettings } from '../../lib/settings'
import { toDisplayWeight, toKg, getWeightStep, getUnitLabel } from '../../lib/unitConversion'
import type { ActiveExercise, PRBanner, Units } from '../../types'

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

interface HistoricalSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
}

export interface FocusExerciseCardProps {
  exercise: ActiveExercise
  userId: string | undefined
  onAddSet: (data: SetData) => void
  onRemoveSet: (id: string, setData: SetData) => void
  onRemove: () => void
  onSwap: () => void
  onOpenPlateCalc: (weight: number) => void
  lastUsed: { weight_kg: number; reps: number } | null
  prefetchedHistory?: ExerciseHistorySet[] | null
  beginnerMode?: boolean
  isCurrent?: boolean
}

const FocusExerciseCard = React.memo(function FocusExerciseCard({
  exercise,
  userId,
  onAddSet,
  onRemoveSet,
  onRemove,
  onSwap,
  onOpenPlateCalc,
  lastUsed,
  prefetchedHistory,
  beginnerMode,
  isCurrent,
}: FocusExerciseCardProps) {
  const { t } = useTranslation()
  const unit: Units = getSettings().units || 'kg'
  const weightStep = getWeightStep(unit)
  const unitLabel = getUnitLabel(unit)
  const [weight, setWeight] = useState(
    (() => {
      const planKg = exercise.plan?.weight_kg
      const lastKg = lastUsed?.weight_kg
      const kg = planKg ?? lastKg
      return kg != null ? String(toDisplayWeight(kg, unit)) : ''
    })()
  )
  const [reps, setReps] = useState(
    exercise.plan?.reps_min?.toString() || lastUsed?.reps?.toString() || ''
  )
  const [rpe, setRpe] = useState<number | null>(null)
  const [showRpe, setShowRpe] = useState(false)
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
        const displayVal = latest.weight_kg != null ? String(toDisplayWeight(latest.weight_kg, unit)) : ''
        setWeight(prev => prev || displayVal)
      }
    }

    if (prefetchedHistory) {
      applyHistory(prefetchedHistory)
    } else if (userId && exercise.name) {
      getExerciseHistory(exercise.name, userId).then(data => applyHistory(data))
    }
    return () => { cancelled = true }
  }, [exercise.name, userId, prefetchedHistory])

  // Auto-fill with last logged set values (convert from stored kg to display unit)
  useEffect(() => {
    if (exercise.sets.length > 0) {
      const lastSet = exercise.sets[exercise.sets.length - 1]!
      setWeight(String(toDisplayWeight(lastSet.weight_kg, unit)))
      setReps(lastSet.reps.toString())
    }
  }, [exercise.sets.length])

  // Auto-dismiss PR banner after 4 seconds
  useEffect(() => {
    if (prBanner) {
      const timer = setTimeout(() => setPrBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [prBanner])

  const plannedSets = exercise.plan?.sets ?? null
  const loggedSets = exercise.sets?.length ?? 0
  const isDone = plannedSets !== null && loggedSets >= plannedSets
  const progressPct = plannedSets ? Math.min(1, loggedSets / plannedSets) : 0

  function handleAdd() {
    const displayW = parseFloat(weight) || 0
    const w = toKg(displayW, unit)
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return

    let isPR = false
    if (historicalSets.length > 0) {
      const pr = detectPR(exercise.name, w, r, historicalSets)
      if (pr && pr.isPR) {
        isPR = true
        setPrBanner({
          weight: toDisplayWeight(w, unit),
          reps: r,
          improvement: toDisplayWeight(pr.improvement, unit),
          type: pr.type,
        })
      }
    }

    hapticFeedback(isPR ? 'heavy' : 'light')
    onAddSet({ weight_kg: w, reps: r, rpe })

    // Reset RPE after logging
    if (rpe !== null) {
      setShowRpe(false)
      setRpe(null)
    }
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
    `${exercise.plan.sets}x${exercise.plan.reps_min}${exercise.plan.reps_max && exercise.plan.reps_max !== exercise.plan.reps_min ? `-${exercise.plan.reps_max}` : ''} @ ${toDisplayWeight(exercise.plan.weight_kg, unit)}${unitLabel}${exercise.plan.rpe_target ? ` \u00B7 RPE ${exercise.plan.rpe_target}` : ''}`
  ) : null

  const nextSuggestion = prevData ? suggestNextWeight(toDisplayWeight(prevData.weight, unit)) : null

  return (
    <div className={`flex flex-col h-full min-h-0 ${!isCurrent ? 'pointer-events-none' : ''}`}>
      {showGuide && <ExerciseGuide exercise={exercise} onClose={() => setShowGuide(false)} />}

      {/* -- Identity row -- */}
      <div className="flex items-center gap-3 px-1 mb-2 shrink-0">
        {exercise.image_url_0 && (
          <img
            src={exercise.image_url_0}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl bg-white/[0.04] object-cover"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-title truncate">{exercise.name}</h3>
          {exercise.muscle_group && (
            <span className="label-caps">{exercise.muscle_group}</span>
          )}
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label={t('logger.menu') || 'Menu'}
            aria-expanded={showMenu}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 active:text-gray-400 min-h-[44px] min-w-[44px]"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-white/[0.06] bg-gray-900 shadow-2xl">
              <button
                onClick={() => { setShowGuide(true); setShowMenu(false) }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-white/[0.04]"
              >
                {t('logger.technique')}
              </button>
              <button
                onClick={() => { onSwap(); setShowMenu(false) }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-white/[0.04]"
              >
                {t('logger.swap_exercise')}
              </button>
              <button
                onClick={() => { onRemove(); setShowMenu(false) }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-400 active:bg-white/[0.04]"
              >
                {t('common.skip')}
              </button>
              <div className="mx-4 border-t border-white/[0.04]" />
              <button
                onClick={() => { onRemove(); setShowMenu(false) }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-red-400 active:bg-white/[0.04]"
              >
                {t('logger.remove')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* -- Plan target -- */}
      {aiTarget && (
        <p className="text-xs font-semibold tabular text-cyan-500 px-1 mb-2 shrink-0">{aiTarget}</p>
      )}

      {/* -- Set progress indicator -- */}
      {plannedSets !== null && (
        <div className="px-1 mb-4 shrink-0">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className={`text-lg font-bold tabular tracking-tight ${isDone ? 'text-emerald-400' : 'text-white'}`}>
              {loggedSets}
            </span>
            <span className="text-sm font-semibold text-gray-600">/ {plannedSets}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-cyan-500'}`}
              initial={false}
              animate={{ width: `${progressPct * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      )}

      {/* -- Logged sets as compact pills (above input zone for visibility) -- */}
      {exercise.sets.length > 0 && (
        <div className="px-1 mb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {exercise.sets.map((s) => (
                <motion.button
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                  onClick={() => onRemoveSet(s.id, { weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe })}
                  className={`inline-flex items-center gap-1 rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs font-bold tabular transition-colors ${
                    isDone
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.04] border border-white/[0.06] text-white'
                  } active:bg-white/[0.08]`}
                  aria-label={`${t('logger.tap_to_remove')}: ${toDisplayWeight(s.weight_kg, unit)}${unitLabel} x ${s.reps}`}
                >
                  <Check size={10} className={isDone ? 'text-emerald-400' : 'text-gray-600'} />
                  {toDisplayWeight(s.weight_kg, unit)}{unitLabel} {'\u00D7'} {s.reps}
                  {s.rpe && <span className="text-gray-600 ml-0.5">@{s.rpe}</span>}
                  <X size={12} className="ml-1 text-gray-600 shrink-0" aria-hidden="true" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          {exercise.sets.length === 1 && (
            <p className="text-[10px] text-gray-600 mt-1.5 px-0.5">{t('logger.tap_to_remove')}</p>
          )}
        </div>
      )}

      {/* -- PR celebration -- */}
      <AnimatePresence>
        {prBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            role="status"
            aria-live="polite"
            className="card-accent mx-1 mb-3 flex items-center justify-between p-3 glow-cyan shrink-0"
          >
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-cyan-400 shrink-0" />
              <span className="text-sm font-bold text-cyan-400">
                {t('pr.new_record')}: {prBanner.weight}{unitLabel} {'\u00B7'} {prBanner.reps} reps
                {prBanner.improvement > 0 && <span className="ml-1.5 text-cyan-300">+{prBanner.improvement}{unitLabel}</span>}
              </span>
            </div>
            <button onClick={() => setPrBanner(null)} className="p-1 text-cyan-700 active:text-cyan-400">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Done state -- */}
      {isDone && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 mx-1 mb-3 shrink-0">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-emerald-400">{t('logger.exercise_done')}</span>
        </div>
      )}

      {/* -- Warmup zone -- */}
      {isCompoundExercise && exercise.sets.length === 0 && warmupSets.length > 0 && (
        <div className="px-1 mb-3 shrink-0">
          <button
            onClick={() => setShowWarmup(!showWarmup)}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5 text-left active:bg-white/[0.06]"
          >
            <span className="text-sm font-semibold text-gray-400">
              {showWarmup ? t('warmup.title') : t('warmup.calculate')}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-600 transition-transform ${showWarmup ? 'rotate-180' : ''}`}
            />
          </button>

          {showWarmup && (
            <div className="mt-2 space-y-1.5">
              {warmupSets.map((ws, idx) => {
                const wsIsDone = warmupDone.includes(idx)
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${wsIsDone ? 'bg-emerald-500/5' : 'bg-white/[0.02]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="label-caps w-6 text-right text-gray-700">{idx + 1}</span>
                      <span className="text-sm font-bold text-white tabular">
                        {ws.isBarOnly
                          ? <span className="text-gray-500">{t('warmup.bar_only')}</span>
                          : <>{ws.weight_kg}<span className="text-xs font-normal text-gray-600">kg</span></>
                        }
                        <span className="mx-1.5 text-gray-700">x</span>{ws.reps}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (wsIsDone) {
                          setWarmupDone(prev => prev.filter(i => i !== idx))
                        } else {
                          const nd = [...warmupDone, idx]
                          setWarmupDone(nd)
                          if (nd.length === warmupSets.length) setTimeout(() => setShowWarmup(false), 300)
                        }
                      }}
                      className={`flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors ${
                        wsIsDone
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/[0.04] text-gray-500 active:bg-white/[0.08]'
                      }`}
                    >
                      {wsIsDone ? <Check size={14} /> : t('warmup.done_btn')}
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => setShowWarmup(false)}
                className="mt-2 w-full py-1 text-center text-xs text-gray-700 active:text-gray-500"
              >
                {t('warmup.hide')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* -- PRIMARY INPUT ZONE (thumb-friendly) -- */}
      <div className={`flex flex-col px-1 ${isDone ? 'opacity-40' : ''}`}>
        {/* Weight + Reps side by side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Weight */}
          <div>
            <div className="mb-1.5 flex h-5 items-center justify-between">
              <span className="label-caps">{t('logger.weight')} <span className="text-[var(--text-3)] ml-1">{unitLabel}</span></span>
              <button
                type="button"
                onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)}
                className="text-[10px] font-semibold text-cyan-500/70 active:text-cyan-400"
              >
                {t('logger.plates')}
              </button>
            </div>
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => adjustWeight(-weightStep)}
                aria-label={`${t('logger.weight')} -${weightStep}${unitLabel}`}
                className="flex h-14 w-11 shrink-0 items-center justify-center text-lg text-gray-500 active:bg-white/[0.06] active:text-white min-h-[44px]"
              >
                {'\u2212'}
              </button>
              <div className="flex flex-1 items-center justify-center min-w-0">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={'\u2014'}
                  aria-label={t('logger.weight')}
                  className="h-14 min-w-0 flex-1 bg-transparent px-1 text-center text-3xl font-black tracking-tight text-white tabular outline-none placeholder-gray-700 border-none!"
                />
                <span className="text-xs font-semibold text-gray-600 pr-1 shrink-0">{unitLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => adjustWeight(weightStep)}
                aria-label={`${t('logger.weight')} +${weightStep}${unitLabel}`}
                className="flex h-14 w-11 shrink-0 items-center justify-center text-lg text-gray-500 active:bg-white/[0.06] active:text-white min-h-[44px]"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps */}
          <div>
            <div className="mb-1.5 flex h-5 items-center">
              <span className="label-caps">{t('logger.reps_label')}</span>
            </div>
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                aria-label={t('logger.reps_label') + ' -1'}
                className="flex h-14 w-11 shrink-0 items-center justify-center text-lg text-gray-500 active:bg-white/[0.06] active:text-white min-h-[44px]"
              >
                {'\u2212'}
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder={'\u2014'}
                aria-label={t('logger.reps_label')}
                className="h-14 min-w-0 flex-1 bg-transparent px-1 text-center text-3xl font-black tracking-tight text-white tabular outline-none placeholder-gray-700 border-none!"
              />
              <button
                type="button"
                onClick={() => adjustReps(1)}
                aria-label={t('logger.reps_label') + ' +1'}
                className="flex h-14 w-11 shrink-0 items-center justify-center text-lg text-gray-500 active:bg-white/[0.06] active:text-white min-h-[44px]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Previous session hint */}
        {prevData && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 mb-2">
            <span className="label-caps">{t('logger.last_session')}:</span>
            <span className="text-xs font-semibold tabular text-gray-400">
              {toDisplayWeight(prevData.weight, unit)}{unitLabel} {'\u00D7'} {prevData.reps}
            </span>
            {nextSuggestion && (
              <span className="text-xs font-bold tabular text-cyan-400">
                {t('logger.try')}: {nextSuggestion}{unitLabel}
              </span>
            )}
          </div>
        )}

        {/* RPE: progressive disclosure */}
        <div className="mb-3">
          <AnimatePresence mode="wait">
            {showRpe ? (
              <motion.div
                key="rpe-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <RpeButtons value={rpe} onChange={(val) => { setRpe(val); if (val !== null) setShowRpe(false) }} beginnerMode={beginnerMode} />
              </motion.div>
            ) : (
              <motion.div
                key="rpe-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <button
                  type="button"
                  onClick={() => setShowRpe(true)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    rpe !== null
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                      : 'bg-white/[0.04] border border-white/[0.06] text-gray-500'
                  }`}
                >
                  {rpe !== null ? `RPE ${rpe}` : 'RPE'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log Set button */}
        <button
          onClick={handleAdd}
          className={`btn-primary ${isDone ? 'opacity-60' : ''}`}
          aria-label={isDone ? t('logger.extra_set') : t('logger.log_set')}
        >
          {isDone
            ? t('logger.extra_set')
            : (() => {
                const w = parseFloat(weight) || 0
                const r = parseInt(reps) || 0
                return w > 0 && r > 0
                  ? `${w}${unitLabel} \u00D7 ${r} ${t('logger.log_set').toLowerCase()}`
                  : t('logger.log_set')
              })()
          }
        </button>
      </div>

    </div>
  )
})

export default FocusExerciseCard
