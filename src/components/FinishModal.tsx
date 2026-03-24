import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, Loader2, Calendar, CheckCircle, Trophy, Star, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import ShareCard from './ShareCard'
import { generateShareCardData, buildShareText } from '../lib/shareCard'
import type { ShareCardData } from '../lib/shareCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useModalA11y } from '../hooks/useModalA11y'
import {
  classifyExercise,
  analyzeTraining,
  scoreSplits,
  RECOVERY_HOURS,
  SPLIT_MUSCLES,
} from '../lib/training-analysis'
import { buildAchievementContext, syncAchievements } from '../lib/achievements'
import type { Achievement } from '../lib/achievements'
import { getIcon } from '../lib/iconMap'
import { getSettings } from '../lib/settings'
import type { FinishModalProps } from '../types'

export default function FinishModal({ result, onClose, onSaveTemplate }: FinishModalProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const duration = result.duration || 0
  const mins = Math.floor(duration / 60)
  const totalSets = result.workout_sets?.length || 0

  const [showTemplateInput, setShowTemplateInput] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [prs, setPrs] = useState<Array<{ exercise: string; weight: number | null; reps: number | null; isWeightPr: boolean; prevWeight?: number | null }>>([])
  const [nextWorkout, setNextWorkout] = useState<{ split: string; reasoning: string; bestDate: Date; hoursUntil: number } | null>(null)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [showShareCard, setShowShareCard] = useState(false)

  // Detect split from exercises
  const detectedSplit = useMemo(() => {
    const muscles = new Set()
    for (const name of result.exerciseNames || []) {
      const m = classifyExercise(name)
      if (m) muscles.add(String(m))
    }

    // Check which split best matches
    const muscleArr = Array.from(muscles) as string[]
    for (const [splitName, splitMuscles] of Object.entries(SPLIT_MUSCLES)) {
      const matches = muscleArr.filter(m => (splitMuscles as string[]).includes(m)).length
      if (matches >= muscleArr.length * 0.7 && matches >= 2) {
        return splitName
      }
    }
    return null
  }, [result.exerciseNames])

  // Calculate recovery forecast
  const recoveryForecast = useMemo(() => {
    const now = new Date()
    const trainedMuscles = new Set<string>()

    for (const name of result.exerciseNames || []) {
      const m = classifyExercise(name)
      if (m) trainedMuscles.add(String(m))
    }

    const forecast: Array<{ muscle: string; hours: number; readyDate: Date; daysFromNow: number; progressPercent: number }> = []
    for (const muscle of trainedMuscles) {
      const hours = (RECOVERY_HOURS as unknown as Record<string, number>)[muscle] || 72
      const readyDate = new Date(now.getTime() + hours * 3600000)
      // Calculate how far along recovery is (0% at start, 100% when ready)
      const elapsedHours = 0 // Just finished, so 0 elapsed
      const progressPercent = Math.min(100, Math.round((elapsedHours / hours) * 100))
      forecast.push({
        muscle,
        hours,
        readyDate,
        daysFromNow: hours / 24,
        progressPercent,
      })
    }

    // Sort longest to shortest
    return forecast.sort((a, b) => b.hours - a.hours)
  }, [result.exerciseNames])

  // Load PRs and next workout recommendation
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!user?.id) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const workoutDate = new Date().toISOString()
        const exerciseNames = [...new Set(result.workout_sets?.map(s => s.exercise) || [])]

        // Run both queries in parallel
        const [historyResult, workoutsResult] = await Promise.all([
          // Query 1: Get exercise history for PR detection
          exerciseNames.length > 0
            ? supabase
                .from('sets')
                .select('exercise, weight_kg, reps')
                .eq('user_id', user.id)
                .lt('created_at', workoutDate)
                .in('exercise', exerciseNames)
            : Promise.resolve({ data: [], error: null }),
          // Query 2: Get recent workouts for next recommendation
          supabase
            .from('workouts')
            .select('id, created_at, sets(exercise, weight_kg, reps, rpe)') /* sets table join */
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)
        ])

        if (cancelled) return

        const { data: history, error: historyError } = historyResult
        const { data: workouts, error: workoutsError } = workoutsResult

        // Process PRs
        if (!historyError && history && history.length > 0) {
          const bestByExercise: Record<string, { volume: number; weight: number | null; reps: number | null }> = {}
          for (const h of history) {
            const vol = (h.weight_kg || 0) * (h.reps || 0)
            if (!bestByExercise[h.exercise as string] || vol > bestByExercise[h.exercise as string]!.volume) {
              bestByExercise[h.exercise as string] = {
                volume: vol,
                weight: h.weight_kg,
                reps: h.reps,
              }
            }
          }

          const newPrs: Array<{ exercise: string; weight: number | null; reps: number | null; isWeightPr: boolean; prevWeight?: number | null }> = []
          for (const set of (result.workout_sets || [])) {
            const currentVol = (set.weight_kg || 0) * (set.reps || 0)
            const best = bestByExercise[set.exercise as string]

            if (!best) continue // First time doing this exercise

            if (best && (currentVol > best.volume || (set.weight_kg ?? 0) > (best.weight ?? 0))) {
              // Check if we already have a PR for this exercise
              if (!newPrs.find(p => p.exercise === set.exercise)) {
                newPrs.push({
                  exercise: set.exercise,
                  weight: set.weight_kg,
                  reps: set.reps,
                  isWeightPr: (set.weight_kg ?? 0) > (best.weight ?? 0),
                  prevWeight: best.weight,
                })
              }
            }
          }
          if (!cancelled) setPrs(newPrs)
        }

        // Process next workout recommendation
        if (!workoutsError && !cancelled) {
          // Add current workout to analysis
          const currentWorkout = {
            id: result.id,
            created_at: new Date().toISOString(),
            workout_sets: result.workout_sets || [],
          }
          const allWorkouts = [
            currentWorkout,
            ...(workouts || []).map(w => ({
              ...w,
              workout_sets: (w as Record<string, unknown>).sets as import('../types').WorkoutSet[] || [],  // normalize table name
            }))
          ]

          const muscleStatus = analyzeTraining(allWorkouts as unknown as import('../types').Workout[])
          const splits = scoreSplits(muscleStatus)

          if (splits.length > 0) {
            const best = splits[0]!

            // Find when the slowest recovering muscle of this split is 80%+ ready
            const splitMuscles = (SPLIT_MUSCLES as Record<string, string[]>)[best!.name] || []
            let maxHoursNeeded = 0

            for (const muscle of splitMuscles) {
              const hours = (RECOVERY_HOURS as unknown as Record<string, number>)[String(muscle)] || 72
              // 80% recovery = hours * 0.8
              const hoursFor80 = hours * 0.8
              if (hoursFor80 > maxHoursNeeded) {
                maxHoursNeeded = hoursFor80
              }
            }

            const bestDate = new Date(Date.now() + maxHoursNeeded * 3600000)

            setNextWorkout({
              split: best.name,
              reasoning: best.reasoning ?? '',
              bestDate,
              hoursUntil: maxHoursNeeded,
            })
          }
        }
        // Check for new achievements
        if (!cancelled) {
          try {
            const settings = getSettings()
            const bodyweight = parseFloat(settings.bodyweight) || 0
            const allWorkoutsForAchievements = [
              {
                id: result.id || 'current',
                user_id: user.id,
                split: '',
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                notes: null,
                workout_sets: (result.workout_sets || []).map(s => ({
                  id: '',
                  workout_id: result.id || 'current',
                  user_id: user.id,
                  exercise: s.exercise,
                  weight_kg: s.weight_kg,
                  reps: s.reps,
                  rpe: s.rpe ?? null,
                  created_at: new Date().toISOString(),
                })),
                totalVolume: result.totalVolume || 0,
                exerciseNames: result.exerciseNames || [],
              },
              ...(workouts || []).map(w => {
                const row = w as Record<string, unknown>
                const wSets = ((row.sets as import('../types').WorkoutSet[]) || [])
                return {
                  id: row.id as string,
                  user_id: user.id,
                  split: (row.split as string) || '',
                  created_at: row.created_at as string,
                  completed_at: (row.completed_at as string | null) ?? null,
                  notes: null,
                  workout_sets: wSets,
                  totalVolume: wSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0),
                  exerciseNames: [...new Set(wSets.map(s => s.exercise))],
                }
              }),
            ] as import('../types').Workout[]

            const achievementCtx = buildAchievementContext(
              allWorkoutsForAchievements,
              bodyweight,
              settings.memberSince,
            )
            const unlocked = syncAchievements(achievementCtx)
            if (unlocked.length > 0) {
              setNewAchievements(unlocked)
            }
          } catch {
            // Achievement detection is non-critical
          }
        }

      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load finish data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => { cancelled = true }
  }, [user?.id, result])

  async function handleSaveTemplate() {
    if (!templateName.trim() || saving) return
    setSaving(true)
    setTemplateError(null)
    try {
      await onSaveTemplate!(templateName.trim())
      setSaved(true)
      setShowTemplateInput(false)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save template:', err)
      setTemplateError(t('finish_modal.template_save_error', 'Opslaan mislukt, probeer opnieuw'))
    } finally {
      setSaving(false)
    }
  }

  function handlePlanNext() {
    onClose()
    navigate('/log')
  }

  function formatDate(date: Date): string {
    const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-US'
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getMuscleLabel(muscle: string): string {
    return t(`muscles.${muscle}`, muscle)
  }

  function getRecoveryBarColor(daysFromNow: number): string {
    if (daysFromNow > 3) return 'bg-red-500'
    if (daysFromNow > 1) return 'bg-orange-400'
    return 'bg-green-400'
  }

  function getRecoveryGlowColor(daysFromNow: number): string {
    if (daysFromNow > 3) return 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    if (daysFromNow > 1) return 'shadow-[0_0_8px_rgba(251,146,60,0.5)]'
    return 'shadow-[0_0_8px_rgba(74,222,128,0.5)]'
  }

  // Build share card data
  const shareCardData: ShareCardData | null = useMemo(() => {
    if (!showShareCard) return null
    return generateShareCardData(result, {
      locale: i18n.language,
      prs: prs.map(p => ({ exercise: p.exercise, weight: p.weight ?? 0 })),
      streak: 0, // streak is non-critical for share
      split: detectedSplit,
    })
  }, [showShareCard, result, i18n.language, prs, detectedSplit])

  const handleShare = useCallback(async () => {
    if (!shareCardData) return
    const text = buildShareText(shareCardData, t)
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled or share failed — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        // Could show a toast here in the future
      } catch {
        // Clipboard not available
      }
    }
  }, [shareCardData, t])

  useModalA11y(true, onClose)

  // Hide the nav bar while this modal is open
  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    return () => { document.documentElement.classList.remove('modal-open') }
  }, [])

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-modal-title"
      className="fixed inset-0 z-[60] overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Solid background — must be fully opaque to cover the nav bar beneath */}
      <div className="absolute inset-0 bg-[var(--bg-base)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(6,182,212,0.12)_0%,transparent_70%)]" />

      <div className="relative min-h-full px-4 py-8">
        <motion.div
          className="mx-auto max-w-sm"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* ── Hero Celebration ── */}
          <div className="mb-10 flex flex-col items-center text-center">
            <motion.div
              className="relative mb-6 flex h-28 w-28 items-center justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
              {/* Middle ring */}
              <div className="absolute inset-2.5 rounded-full border-2 border-cyan-500/20" />
              {/* Inner solid circle with pulsing glow */}
              <motion.div
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.15)',
                    '0 0 30px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.25)',
                    '0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.15)',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <CheckCircle size={30} className="text-white" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            </motion.div>

            <motion.h1
              id="finish-modal-title"
              className="text-display text-4xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              {t('finish_modal.title')}
            </motion.h1>
            <motion.p
              className="mt-3 text-sm text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {detectedSplit && <span className="font-semibold text-cyan-400">{detectedSplit}</span>}
              {detectedSplit && ' · '}
              {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </motion.p>
          </div>

          {/* ── Stats Cards ── */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { value: mins, label: t('finish_modal.minutes'), accent: false },
              { value: formatVol(result.totalVolume), label: t('finish_modal.volume'), accent: true },
              { value: totalSets, label: t('common.sets'), accent: false },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="card-accent flex flex-col items-center py-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55 + i * 0.1 }}
              >
                <p className={`text-3xl font-black tabular tracking-tight ${stat.accent ? 'text-cyan-400' : 'text-white'}`}>
                  {stat.value}
                </p>
                <p className="label-caps mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Loading spinner ── */}
          {loading && (
            <div className="card mb-6 flex items-center justify-center p-8" role="status" aria-live="polite">
              <Loader2 size={24} className="animate-spin text-cyan-500" aria-hidden="true" />
              <span className="sr-only">{t('common.loading') || 'Loading...'}</span>
            </div>
          )}

          {/* ── PRs Section ── */}
          <AnimatePresence>
            {!loading && prs.length > 0 && (
              <motion.div
                className="card-accent mb-6"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <motion.div
                    animate={{
                      filter: [
                        'drop-shadow(0 0 4px rgba(6,182,212,0.4))',
                        'drop-shadow(0 0 10px rgba(6,182,212,0.7))',
                        'drop-shadow(0 0 4px rgba(6,182,212,0.4))',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Trophy size={18} className="text-cyan-400" aria-hidden="true" />
                  </motion.div>
                  <h3 className="label-caps text-cyan-400">{t('finish_modal.new_pr')}</h3>
                </div>
                <div className="space-y-3">
                  {prs.map((pr, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-cyan-500/5 px-3 py-2.5"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.18 + i * 0.08 }}
                    >
                      <span className="text-sm font-medium text-white">{pr.exercise}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-cyan-400">{pr.weight}kg</span>
                        {pr.prevWeight != null && (
                          <span className="text-xs text-gray-500">
                            (was {pr.prevWeight}kg)
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── New Achievements ── */}
          <AnimatePresence>
            {!loading && newAchievements.length > 0 && (
              <motion.div
                className="card-gold mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <motion.div
                    animate={{
                      filter: [
                        'drop-shadow(0 0 4px rgba(234,179,8,0.4))',
                        'drop-shadow(0 0 12px rgba(234,179,8,0.7))',
                        'drop-shadow(0 0 4px rgba(234,179,8,0.4))',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Star size={18} className="text-yellow-500" aria-hidden="true" />
                  </motion.div>
                  <h3 className="label-caps text-yellow-500">{t('achievements.unlocked')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {newAchievements.map((a, i) => {
                    const Icon = getIcon(a.icon)
                    return (
                      <motion.div
                        key={a.id}
                        className="flex items-center gap-2.5 rounded-xl bg-yellow-500/8 px-3 py-3"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Icon size={22} className="shrink-0 text-yellow-500" aria-hidden="true" />
                        <span className="text-xs font-bold text-white">{t(a.nameKey)}</span>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Recovery Forecast ── */}
          {!loading && recoveryForecast.length > 0 && (
            <motion.div
              className="card mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h3 className="label-caps mb-4 text-gray-400">{t('finish_modal.recovery')}</h3>
              <div className="space-y-3.5">
                {recoveryForecast.slice(0, 5).map((item, i) => {
                  const maxHours = recoveryForecast[0]?.hours ?? 72
                  const barWidth = Math.round((1 - item.hours / maxHours) * 100) || 10
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{getMuscleLabel(item.muscle)}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.readyDate)} {formatTime(item.readyDate)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={`h-full rounded-full ${getRecoveryBarColor(item.daysFromNow)} ${getRecoveryGlowColor(item.daysFromNow)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── Next Workout Recommendation ── */}
          {!loading && nextWorkout && (
            <motion.div
              className="card-accent mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-cyan-400" aria-hidden="true" />
                <h3 className="label-caps text-cyan-400">{t('finish_modal.next_workout')}</h3>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-title">{nextWorkout.split}</span>
                <span className="text-base font-bold text-cyan-400">
                  {formatDate(nextWorkout.bestDate)}
                </span>
              </div>
              {nextWorkout.reasoning && (
                <p className="mt-1.5 text-xs text-gray-500">{nextWorkout.reasoning}</p>
              )}
            </motion.div>
          )}

          {/* ── Save Template ── */}
          {onSaveTemplate && !saved && (
            <div className="mb-6">
              {!showTemplateInput ? (
                <button
                  onClick={() => setShowTemplateInput(true)}
                  className="btn-secondary"
                >
                  <BookmarkPlus size={16} aria-hidden="true" />
                  {t('finish_modal.save_template')}
                </button>
              ) : (
                <div className="glass space-y-3 p-4">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('finish_modal.template_name_placeholder')}
                    aria-label={t('finish_modal.template_name_placeholder')}
                    className="h-11 w-full rounded-xl px-4 text-sm text-white placeholder-gray-600 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTemplateInput(false)}
                      className="btn-secondary flex-1"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim() || saving}
                      className="btn-primary flex-1"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <BookmarkPlus size={14} aria-hidden="true" />}
                      {t('finish_modal.save')}
                    </button>
                  </div>
                  {templateError && (
                    <p className="text-center text-xs text-red-400">{templateError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {saved && (
            <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-center text-sm font-medium text-green-400">
              {t('finish_modal.template_saved')}
            </div>
          )}

          {/* ── Share Card Button ── */}
          {!loading && (
            <div className="mb-6">
              <button
                onClick={() => setShowShareCard(true)}
                className="btn-secondary"
              >
                <Share2 size={16} aria-hidden="true" />
                {t('share.title')}
              </button>
            </div>
          )}

          {/* ── CTA Buttons ── */}
          <div className="mt-10 space-y-3 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
            <button onClick={onClose} className="btn-primary">
              {t('finish_modal.done')}
            </button>
            <button onClick={handlePlanNext} className="btn-secondary">
              <Calendar size={16} aria-hidden="true" />
              {t('finish_modal.plan_next')}
            </button>
          </div>

        </motion.div>
      </div>

      {/* Share Card Overlay */}
      {showShareCard && shareCardData && (
        <ShareCard
          data={shareCardData}
          onClose={() => setShowShareCard(false)}
          onShare={handleShare}
        />
      )}
    </motion.div>,
    document.body,
  )
}

function formatVol(kg: number | undefined | null): string {
  if (!kg) return '0'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()}`
}
