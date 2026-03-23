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
    <div className={`card min-w-0 w-full p-0 overflow-hidden transition-colors ${isDone ? 'border-green-500/20' : ''}`}>

      {/* ━━ Identity zone ━━ */}
      <div className={`px-5 ${compact ? 'py-3' : 'pt-5 pb-4'}`}>
        {/* Row 1: Image + Name + Menu */}
        <div className="flex items-center gap-3 mb-1">
          {exercise.image_url_0 && (
            <img src={exercise.image_url_0} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white/[0.04] object-cover" loading="lazy" />
          )}
          <h3 className={`flex-1 min-w-0 font-black tracking-tight text-white ${compact ? 'text-base' : 'text-lg leading-tight'}`}>
            {exercise.name}
          </h3>
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
                <button onClick={() => { setShowGuide(true); setShowMenu(false) }} className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-white/[0.04]">{t('logger.technique')}</button>
                <button onClick={() => { onSwap(); setShowMenu(false) }} className="block w-full px-4 py-3 text-left text-sm font-medium text-white active:bg-white/[0.04]">{t('logger.swap_exercise')}</button>
                <div className="mx-4 border-t border-white/[0.04]" />
                <button onClick={() => { onRemove(); setShowMenu(false) }} className="block w-full px-4 py-3 text-left text-sm font-medium text-red-400 active:bg-white/[0.04]">{t('logger.remove')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Muscle + Set progress */}
        <div className="flex items-center gap-2 flex-wrap">
          {exercise.muscle_group && <span className="label-caps">{exercise.muscle_group}</span>}
          {plannedSets !== null && (
            <span className={`label-caps font-bold ${isDone ? 'text-green-400' : 'text-gray-600'}`}>
              {isDone ? `\u2713 ${loggedSets}/${plannedSets} sets` : `${loggedSets}/${plannedSets} sets`}
            </span>
          )}
        </div>

        {/* Row 3: AI target — own line, always readable */}
        {aiTarget && (
          <p className="mt-1 text-xs font-semibold tabular text-cyan-500">{aiTarget}</p>
        )}
      </div>

      {showGuide && <ExerciseGuide exercise={exercise} onClose={() => setShowGuide(false)} />}

      {/* ━━ Warmup zone ━━ */}
      {isCompoundExercise && exercise.sets.length === 0 && warmupSets.length > 0 && (
        <div className="border-t border-white/[0.04] px-5 py-3">
          <button
            onClick={() => setShowWarmup(!showWarmup)}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5 text-left active:bg-white/[0.06]"
          >
            <span className="text-sm font-semibold text-gray-400">{showWarmup ? t('warmup.title') : t('warmup.calculate')}</span>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${showWarmup ? 'rotate-180' : ''}`} />
          </button>

          {showWarmup && (
            <div className="mt-2 space-y-1.5">
              {warmupSets.map((ws, idx) => {
                const wsIsDone = warmupDone.includes(idx)
                return (
                  <div key={idx} className={`flex items-center justify-between rounded-xl px-3 py-2 ${wsIsDone ? 'bg-green-500/5' : 'bg-white/[0.02]'}`}>
                    <div className="flex items-center gap-3">
                      <span className="label-caps w-6 text-right text-gray-700">{idx + 1}</span>
                      <span className="text-sm font-bold text-white tabular">
                        {ws.isBarOnly ? <span className="text-gray-500">{t('warmup.bar_only')}</span> : <>{ws.weight_kg}<span className="text-xs font-normal text-gray-600">kg</span></>}
                        <span className="mx-1.5 text-gray-700">x</span>{ws.reps}
                      </span>
                    </div>
                    <button
                      onClick={() => { wsIsDone ? setWarmupDone(prev => prev.filter(i => i !== idx)) : (() => { const nd = [...warmupDone, idx]; setWarmupDone(nd); if (nd.length === warmupSets.length) setTimeout(() => setShowWarmup(false), 300) })() }}
                      className={`flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors ${wsIsDone ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.04] text-gray-500 active:bg-white/[0.08]'}`}
                    >{wsIsDone ? <Check size={14} /> : t('warmup.done_btn')}</button>
                  </div>
                )
              })}
              <button onClick={() => setShowWarmup(false)} className="mt-2 w-full py-1 text-center text-xs text-gray-700 active:text-gray-500">{t('warmup.hide')}</button>
            </div>
          )}
        </div>
      )}

      {/* ━━ Data zone: Logged sets ━━ */}
      {exercise.sets.length > 0 && (
        <div className="border-t border-white/[0.04] px-5 py-3 space-y-1.5">
          {exercise.sets.map((s, i) => (
            <button key={s.id} onClick={() => onRemoveSet(s.id, { weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe })}
              className={`flex w-full items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-2.5 active:bg-white/[0.06] transition-colors ${isDone ? 'border-l-2 border-l-green-500/40' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-sm tabular font-bold text-gray-700 w-5 text-right">{i + 1}</span>
                <span className="text-[0.9375rem] font-bold tracking-tight text-white tabular">
                  {s.weight_kg}<span className="text-xs text-gray-600">kg</span>
                  <span className="mx-1.5 text-gray-700">{'\u00D7'}</span>
                  {s.reps}
                </span>
                {s.rpe && <span className="text-[10px] font-semibold text-gray-600 tabular">RPE {s.rpe}</span>}
              </div>
              <Check size={13} className="text-green-400/70 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ━━ Repeat ━━ */}
      {exercise.sets.length > 0 && (() => {
        const lastSet = exercise.sets[exercise.sets.length - 1]!
        return (
          <div className="px-5 pt-2">
            <button onClick={() => onAddSet({ weight_kg: lastSet.weight_kg, reps: lastSet.reps, rpe: lastSet.rpe })}
              className="btn-secondary h-11 w-full text-sm">
              <RotateCcw size={13} /> {t('logger.repeat_set')} {lastSet.weight_kg}kg {'\u00D7'} {lastSet.reps}
            </button>
          </div>
        )
      })()}

      {/* ━━ PR celebration ━━ */}
      {prBanner && (
        <div role="status" aria-live="polite" className="card-accent mx-5 mt-3 flex items-center justify-between p-3 glow-cyan">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-cyan-400 shrink-0" />
            <span className="text-sm font-bold text-cyan-400">
              {t('pr.new_record')}: {prBanner.weight}kg · {prBanner.reps} reps
              {prBanner.improvement > 0 && <span className="ml-1.5 text-cyan-300">+{prBanner.improvement}kg</span>}
            </span>
          </div>
          <button onClick={() => setPrBanner(null)} className="p-1 text-cyan-700 active:text-cyan-400"><X size={13} /></button>
        </div>
      )}

      {/* ━━ Controls zone ━━ */}
      <div className="px-4 pt-4 pb-5 space-y-4">
        {/* Weight + Reps */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-2 flex h-5 items-center justify-between">
              <span className="label-caps">{t('logger.weight')}</span>
              <button type="button" onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)} className="label-caps text-cyan-500 active:text-cyan-400">{t('logger.plates')}</button>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => adjustWeight(-2.5)} aria-label={t('logger.weight') + ' -2.5kg'}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-base text-gray-500 active:bg-white/[0.08] active:text-white min-h-[44px]">{'\u2212'}</button>
              <input type="number" inputMode="decimal" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="\u2014" aria-label={t('logger.weight')}
                className="h-12 min-w-0 flex-1 rounded-xl px-1 text-center text-xl font-black tracking-tight text-white tabular outline-none placeholder-gray-700" />
              <button type="button" onClick={() => adjustWeight(2.5)} aria-label={t('logger.weight') + ' +2.5kg'}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-base text-gray-500 active:bg-white/[0.08] active:text-white min-h-[44px]">+</button>
            </div>
          </div>
          <div>
            <div className="mb-2 flex h-5 items-center">
              <span className="label-caps">{t('logger.reps_label')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => adjustReps(-1)} aria-label={t('logger.reps_label') + ' -1'}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-base text-gray-500 active:bg-white/[0.08] active:text-white min-h-[44px]">{'\u2212'}</button>
              <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="\u2014" aria-label={t('logger.reps_label')}
                className="h-12 min-w-0 flex-1 rounded-xl px-1 text-center text-xl font-black tracking-tight text-white tabular outline-none placeholder-gray-700" />
              <button type="button" onClick={() => adjustReps(1)} aria-label={t('logger.reps_label') + ' +1'}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-base text-gray-500 active:bg-white/[0.08] active:text-white min-h-[44px]">+</button>
            </div>
          </div>
        </div>

        {/* Previous session */}
        {prevData && (
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="label-caps">{t('logger.last_session')}:</span>
            <span className="text-xs font-semibold tabular text-gray-400">{prevData.weight}kg {'\u00D7'} {prevData.reps}</span>
            {suggestNextWeight(prevData.weight) && (
              <span className="text-xs font-bold tabular text-cyan-400">{t('logger.try')}: {suggestNextWeight(prevData.weight)}kg</span>
            )}
          </div>
        )}

        {exercise.sets.length >= 3 && !exercise.sets.some(s => s.rpe) && (
          <p className="text-center text-[10px] text-gray-700">{t('logger.rpe_hint')}</p>
        )}

        <RpeButtons value={rpe} onChange={setRpe} beginnerMode={beginnerMode} />

        {isDone ? (
          <div className="flex items-center justify-between rounded-2xl border border-green-500/15 bg-green-500/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-green-400 shrink-0" />
              <span className="text-sm font-semibold text-green-400">{t('logger.exercise_done')}</span>
            </div>
            <button onClick={handleAdd} className="text-xs font-medium text-gray-600 active:text-gray-400">{t('logger.extra_set')}</button>
          </div>
        ) : (
          <>
            <button onClick={handleAdd} className="btn-primary">{t('logger.log_set')}</button>
            <button onClick={onRemove} className="w-full py-1 text-xs font-medium text-gray-700 active:text-gray-500">{t('common.skip')}</button>
          </>
        )}
      </div>
    </div>
  )
})

export default ExerciseBlock
