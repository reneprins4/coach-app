import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, Loader2, Calendar, CheckCircle, Trophy, Star, Share2 } from 'lucide-react'
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
    navigate('/coach')
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

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="finish-modal-title" className="fixed inset-0 z-[60] overflow-y-auto bg-gray-950">
      <div className="min-h-full px-4 py-8">
        <div className="mx-auto max-w-sm">

          {/* Celebratory Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.08) 100%)',
                boxShadow: '0 0 40px rgba(6,182,212,0.3), 0 0 80px rgba(6,182,212,0.15)',
              }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  boxShadow: '0 4px 24px rgba(6,182,212,0.4)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              >
                <CheckCircle size={28} className="text-white" strokeWidth={2.5} aria-hidden="true" />
              </div>
            </div>
            <h1 id="finish-modal-title" className="text-display">
              {t('finish_modal.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {detectedSplit && <span className="font-semibold text-cyan-400">{detectedSplit}</span>}
              {detectedSplit && ' · '}
              {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>

          {/* Stats Strip */}
          <div className="card-accent mb-4 flex items-center divide-x divide-cyan-500/20">
            <div className="flex-1 py-2 text-center">
              <p className="text-3xl font-black tabular tracking-tight text-white">{mins}</p>
              <p className="label-caps mt-0.5">{t('finish_modal.minutes')}</p>
            </div>
            <div className="flex-1 py-2 text-center">
              <p className="text-3xl font-black tabular tracking-tight text-white">{formatVol(result.totalVolume)}</p>
              <p className="label-caps mt-0.5">{t('finish_modal.volume')}</p>
            </div>
            <div className="flex-1 py-2 text-center">
              <p className="text-3xl font-black tabular tracking-tight text-white">{totalSets}</p>
              <p className="label-caps mt-0.5">{t('common.sets')}</p>
            </div>
          </div>

          {/* Loading spinner */}
          {loading && (
            <div className="card mb-4 flex items-center justify-center p-6" role="status" aria-live="polite">
              <Loader2 size={24} className="animate-spin text-cyan-500" aria-hidden="true" />
              <span className="sr-only">{t('common.loading') || 'Loading...'}</span>
            </div>
          )}

          {/* PRs Section */}
          {!loading && prs.length > 0 && (
            <div
              className="mb-4 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.03) 100%)',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-cyan-400" aria-hidden="true" />
                <h3 className="label-caps text-cyan-400">{t('finish_modal.new_pr')}</h3>
              </div>
              <div className="space-y-2.5">
                {prs.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-white">{pr.exercise}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-cyan-400">{pr.weight}kg</span>
                      {pr.prevWeight != null && (
                        <span className="text-xs text-gray-500">
                          (was {pr.prevWeight}kg)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Achievements */}
          {!loading && newAchievements.length > 0 && (
            <div
              className="mb-4 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0.02) 100%)',
                border: '1px solid rgba(234,179,8,0.3)',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" aria-hidden="true" />
                <h3 className="label-caps text-yellow-500">{t('achievements.unlocked')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {newAchievements.map(a => {
                  const Icon = getIcon(a.icon)
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-yellow-500/5 p-2.5">
                      <Icon size={20} className="shrink-0 text-yellow-500" aria-hidden="true" />
                      <span className="text-xs font-bold text-white">{t(a.nameKey)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recovery Forecast */}
          {!loading && recoveryForecast.length > 0 && (
            <div className="card mb-4">
              <h3 className="label-caps mb-3 text-gray-400">{t('finish_modal.recovery')}</h3>
              <div className="space-y-3">
                {recoveryForecast.slice(0, 5).map((item, i) => {
                  const maxHours = recoveryForecast[0]?.hours ?? 72
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">{getMuscleLabel(item.muscle)}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.readyDate)} {formatTime(item.readyDate)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${getRecoveryBarColor(item.daysFromNow)}`}
                          style={{ width: `${Math.round((1 - item.hours / maxHours) * 100) || 10}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next Workout Recommendation */}
          {!loading && nextWorkout && (
            <div className="card mb-4">
              <h3 className="label-caps mb-2 text-gray-400">{t('finish_modal.next_workout')}</h3>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-white">{nextWorkout.split}</span>
                <span className="text-sm font-medium text-cyan-400">
                  {formatDate(nextWorkout.bestDate)}
                </span>
              </div>
              {nextWorkout.reasoning && (
                <p className="mt-1 text-xs text-gray-500">{nextWorkout.reasoning}</p>
              )}
            </div>
          )}

          {/* Save Template */}
          {onSaveTemplate && !saved && (
            <div className="mb-4">
              {!showTemplateInput ? (
                <button
                  onClick={() => setShowTemplateInput(true)}
                  className="btn-secondary"
                >
                  <BookmarkPlus size={16} aria-hidden="true" />
                  {t('finish_modal.save_template')}
                </button>
              ) : (
                <div className="card space-y-3">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('finish_modal.template_name_placeholder')}
                    aria-label={t('finish_modal.template_name_placeholder')}
                    className="h-10 w-full rounded-xl bg-gray-800 px-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-700 focus:ring-cyan-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTemplateInput(false)}
                      className="h-10 flex-1 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700 active:scale-[0.97]"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim() || saving}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-800 text-sm font-medium text-white disabled:opacity-50 active:scale-[0.97]"
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
            <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-2 text-center text-sm text-green-400">
              {t('finish_modal.template_saved')}
            </div>
          )}

          {/* Share Card Button */}
          {!loading && (
            <div className="mb-4">
              <button
                onClick={() => setShowShareCard(true)}
                className="btn-secondary"
              >
                <Share2 size={16} aria-hidden="true" />
                {t('share.title')}
              </button>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="mt-8 space-y-3">
            <button onClick={onClose} className="btn-primary">
              {t('finish_modal.done')}
            </button>
            <button onClick={handlePlanNext} className="btn-secondary">
              <Calendar size={16} aria-hidden="true" />
              {t('finish_modal.plan_next')}
            </button>
          </div>

        </div>
      </div>

      {/* Share Card Overlay */}
      {showShareCard && shareCardData && (
        <ShareCard
          data={shareCardData}
          onClose={() => setShowShareCard(false)}
          onShare={handleShare}
        />
      )}
    </div>
  )
}

function formatVol(kg: number | undefined | null): string {
  if (!kg) return '0'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()}`
}
