import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, type PanInfo } from 'motion/react'
import { Check, ChevronUp, X } from 'lucide-react'
import FocusExerciseCard from './FocusExerciseCard'
import type { ActiveExercise } from '../../types'
import type { ExerciseHistorySet } from '../../hooks/useWorkouts'

export interface FocusModeProps {
  exercises: ActiveExercise[]
  userId: string | undefined
  onAddSet: (exerciseName: string, data: { weight_kg: number; reps: number; rpe: number | null }) => void
  onRemoveSet: (exerciseName: string, id: string, setData: { weight_kg: number; reps: number; rpe: number | null }) => void
  onRemove: (exerciseName: string) => void
  onSwap: (exercise: ActiveExercise) => void
  onOpenPlateCalc: (weight: number) => void
  getLastUsed: (name: string) => { weight_kg: number; reps: number } | null
  exerciseHistoryMap: Map<string, ExerciseHistorySet[]>
  beginnerMode?: boolean
  workoutNotes: string
  onUpdateNotes: (notes: string) => void
  onAddExercise?: () => void
}

// Slide transition settings
const SLIDE_OFFSET = 300
const slideTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 50

function isExerciseDone(exercise: ActiveExercise): boolean {
  const planned = exercise.plan?.sets ?? null
  if (planned === null) return false
  return exercise.sets.length >= planned
}

export default function FocusMode({
  exercises,
  userId,
  onAddSet,
  onRemoveSet,
  onRemove,
  onSwap,
  onOpenPlateCalc,
  getLastUsed,
  exerciseHistoryMap,
  beginnerMode,
  workoutNotes,
  onUpdateNotes,
  onAddExercise,
}: FocusModeProps) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0) // -1 = back, 1 = forward
  const [showOverview, setShowOverview] = useState(false)
  const [advanceToast, setAdvanceToast] = useState<string | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSetsLengthRef = useRef<number[]>([])

  // Clamp index when exercises change (e.g., exercise removed)
  useEffect(() => {
    if (currentIndex >= exercises.length && exercises.length > 0) {
      setCurrentIndex(exercises.length - 1)
    }
  }, [exercises.length, currentIndex])

  // Track set counts for auto-advance detection
  useEffect(() => {
    const currentLengths = exercises.map(e => e.sets.length)
    const prevLengths = prevSetsLengthRef.current

    // Only auto-advance if a set was just added to the current exercise
    if (prevLengths.length === currentLengths.length && currentIndex < exercises.length) {
      const currentExercise = exercises[currentIndex]
      if (currentExercise) {
        const prevCount = prevLengths[currentIndex] ?? 0
        const newCount = currentLengths[currentIndex] ?? 0

        // A set was added and the exercise is now complete
        if (newCount > prevCount && isExerciseDone(currentExercise)) {
          const nextUndone = findNextUndoneIndex(currentIndex)
          if (nextUndone !== null) {
            const nextExercise = exercises[nextUndone]
            if (nextExercise) {
              setAdvanceToast(nextExercise.name)
              autoAdvanceTimerRef.current = setTimeout(() => {
                setDirection(1)
                setCurrentIndex(nextUndone)
                setAdvanceToast(null)
              }, 1500)
            }
          }
        }
      }
    }

    prevSetsLengthRef.current = currentLengths
  }, [exercises, currentIndex])

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current)
      }
    }
  }, [])

  function findNextUndoneIndex(fromIndex: number): number | null {
    for (let i = fromIndex + 1; i < exercises.length; i++) {
      if (!isExerciseDone(exercises[i]!)) return i
    }
    // Wrap search from beginning
    for (let i = 0; i < fromIndex; i++) {
      if (!isExerciseDone(exercises[i]!)) return i
    }
    return null
  }

  const goTo = useCallback((index: number) => {
    if (index === currentIndex || index < 0 || index >= exercises.length) return
    // Cancel any pending auto-advance
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
      setAdvanceToast(null)
    }
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }, [currentIndex, exercises.length])

  const goNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) goTo(currentIndex + 1)
  }, [currentIndex, exercises.length, goTo])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const { offset, velocity } = info
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      goNext()
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      goPrev()
    }
  }

  const currentExercise = exercises[currentIndex]

  // Empty state — no exercises yet
  if (!currentExercise || exercises.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
          <ChevronUp size={28} className="text-[var(--text-3)]" />
        </div>
        <p className="text-sm text-[var(--text-2)] mb-6">{t('logger.add_exercise_hint')}</p>
        {onAddExercise && (
          <button onClick={onAddExercise} className="btn-primary max-w-xs">
            {t('logger.add_exercise')}
          </button>
        )}
      </div>
    )
  }

  // Variants for AnimatePresence with custom direction
  const variants = {
    enter: (dir: number) => ({
      x: dir >= 0 ? SLIDE_OFFSET : -SLIDE_OFFSET,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir >= 0 ? -SLIDE_OFFSET : SLIDE_OFFSET,
      opacity: 0,
    }),
  }

  return (
    <div className="flex flex-col w-full overflow-hidden relative" style={{ minHeight: 'calc(100dvh - 52px)' }}>
      {/* -- Progress dots -- */}
      <div className="flex items-center justify-center gap-1.5 py-3 shrink-0 px-4" role="tablist" aria-label={t('logger.exercises') || 'Exercises'}>
        {exercises.map((exercise, i) => {
          const done = isExerciseDone(exercise)
          const isCurrent = i === currentIndex
          return (
            <button
              key={exercise.name}
              role="tab"
              onClick={() => goTo(i)}
              aria-label={`${exercise.name}${done ? ' - ' + (t('logger.exercise_done') || 'done') : ''}`}
              aria-selected={isCurrent}
              className="p-2 -m-2"
            >
              <div
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  isCurrent
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                    : done
                      ? 'bg-white'
                      : 'bg-white/20'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* -- Auto-advance toast -- */}
      <AnimatePresence>
        {advanceToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 left-4 right-4 z-10 flex items-center justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-2">
              <span className="text-xs font-semibold text-cyan-400">
                {t('logger.next') || 'Next'}: {advanceToast}
              </span>
              <button
                onClick={() => {
                  if (autoAdvanceTimerRef.current) {
                    clearTimeout(autoAdvanceTimerRef.current)
                    autoAdvanceTimerRef.current = null
                  }
                  setAdvanceToast(null)
                }}
                className="text-cyan-600 active:text-cyan-400"
                aria-label={t('common.cancel') || 'Cancel'}
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Swipeable exercise card area -- */}
      <div className="flex-1 min-h-0 relative overflow-hidden" role="tabpanel" aria-label={currentExercise.name}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentExercise.name + '-' + currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 px-4 py-2 flex flex-col"
            style={{ touchAction: 'pan-y' }}
          >
            <FocusExerciseCard
              exercise={currentExercise}
              userId={userId}
              onAddSet={(data) => onAddSet(currentExercise.name, data)}
              onRemoveSet={(id, setData) => onRemoveSet(currentExercise.name, id, setData)}
              onRemove={() => onRemove(currentExercise.name)}
              onSwap={() => onSwap(currentExercise)}
              onOpenPlateCalc={onOpenPlateCalc}
              lastUsed={getLastUsed(currentExercise.name)}
              prefetchedHistory={exerciseHistoryMap.get(currentExercise.name) || null}
              beginnerMode={beginnerMode}
              isCurrent
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* -- Overview button -- */}
      <div className="shrink-0">
        <button
          onClick={() => setShowOverview(true)}
          className="flex items-center justify-center gap-1.5 w-full py-3 rounded-t-xl bg-white/[0.03] border-t border-white/[0.06] text-xs font-semibold text-gray-500 active:text-gray-300"
          aria-label={t('logger.overview')}
        >
          <ChevronUp size={14} />
          {t('logger.overview')}
        </button>
      </div>

      {/* -- Overview bottom sheet -- */}
      <AnimatePresence>
        {showOverview && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOverview(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[var(--bg-elevated)] border-t border-white/[0.08] max-h-[70vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="focus-overview-title"
              onKeyDown={(e) => { if (e.key === 'Escape') setShowOverview(false) }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2 shrink-0">
                <div className="h-1 w-8 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <h3 id="focus-overview-title" className="text-title">{t('logger.overview')}</h3>
                <button
                  onClick={() => setShowOverview(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 active:text-white min-h-[44px] min-w-[44px]"
                  aria-label={t('common.close') || 'Close'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Exercise list */}
              <div className="flex-1 overflow-y-auto px-5 space-y-1.5" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 1rem))' }}>
                {exercises.map((exercise, i) => {
                  const done = isExerciseDone(exercise)
                  const isCurrent = i === currentIndex
                  const planned = exercise.plan?.sets ?? 0
                  const logged = exercise.sets.length
                  return (
                    <button
                      key={exercise.name}
                      onClick={() => { goTo(i); setShowOverview(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isCurrent
                          ? 'bg-cyan-500/10 border border-cyan-500/20'
                          : 'bg-white/[0.02] border border-transparent active:bg-white/[0.04]'
                      }`}
                    >
                      {/* Status indicator */}
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        done
                          ? 'bg-emerald-500/20'
                          : isCurrent
                            ? 'bg-cyan-500/20'
                            : 'bg-white/[0.04]'
                      }`}>
                        {done ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <span className={`text-[10px] font-bold tabular ${isCurrent ? 'text-cyan-400' : 'text-gray-600'}`}>
                            {i + 1}
                          </span>
                        )}
                      </div>

                      {/* Exercise info */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold truncate block ${done ? 'text-gray-500' : 'text-white'}`}>
                          {exercise.name}
                        </span>
                        {exercise.muscle_group && (
                          <span className="label-caps">{exercise.muscle_group}</span>
                        )}
                      </div>

                      {/* Set count */}
                      {planned > 0 && (
                        <span className={`text-xs font-bold tabular ${done ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {logged}/{planned}
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Add exercise button */}
                {onAddExercise && (
                  <div className="pt-3">
                    <button
                      onClick={() => { setShowOverview(false); onAddExercise() }}
                      className="btn-secondary w-full"
                    >
                      {t('logger.add_exercise')}
                    </button>
                  </div>
                )}

                {/* Notes section inside overview */}
                <div className="pt-3 pb-4">
                  <label className="mb-1.5 block label-caps">{t('logger.notes')}</label>
                  <textarea
                    value={workoutNotes}
                    onChange={(e) => onUpdateNotes(e.target.value)}
                    placeholder={t('logger.notes_placeholder')}
                    rows={2}
                    className="w-full resize-none rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
