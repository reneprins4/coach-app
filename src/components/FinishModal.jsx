import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, Loader2, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  classifyExercise,
  analyzeTraining,
  scoreSplits,
  RECOVERY_HOURS,
  SPLIT_MUSCLES,
} from '../lib/training-analysis'

export default function FinishModal({ result, onClose, onSaveTemplate }) {
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
  const [loading, setLoading] = useState(true)
  const [prs, setPrs] = useState([])
  const [nextWorkout, setNextWorkout] = useState(null)

  // Detect split from exercises
  const detectedSplit = useMemo(() => {
    const muscles = new Set()
    for (const name of result.exerciseNames || []) {
      const m = classifyExercise(name)
      if (m) muscles.add(m)
    }
    
    // Check which split best matches
    const muscleArr = Array.from(muscles)
    for (const [splitName, splitMuscles] of Object.entries(SPLIT_MUSCLES)) {
      const matches = muscleArr.filter(m => splitMuscles.includes(m)).length
      if (matches >= muscleArr.length * 0.7 && matches >= 2) {
        return splitName
      }
    }
    return null
  }, [result.exerciseNames])

  // Calculate recovery forecast
  const recoveryForecast = useMemo(() => {
    const now = new Date()
    const trainedMuscles = new Set()
    
    for (const name of result.exerciseNames || []) {
      const m = classifyExercise(name)
      if (m) trainedMuscles.add(m)
    }
    
    const forecast = []
    for (const muscle of trainedMuscles) {
      const hours = RECOVERY_HOURS[muscle] || 72
      const readyDate = new Date(now.getTime() + hours * 3600000)
      forecast.push({
        muscle,
        hours,
        readyDate,
        daysFromNow: hours / 24,
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
        // Check for PRs
        const workoutDate = new Date().toISOString()
        const exerciseNames = [...new Set(result.workout_sets?.map(s => s.exercise) || [])]
        
        if (exerciseNames.length > 0) {
          const { data: history, error: historyError } = await supabase
            .from('workout_sets')
            .select('exercise, weight_kg, reps')
            .eq('user_id', user.id)
            .lt('created_at', workoutDate)
            .in('exercise', exerciseNames)
          
          if (historyError) throw historyError
          if (cancelled) return
          
          const bestByExercise = {}
          for (const h of (history || [])) {
            const vol = (h.weight_kg || 0) * (h.reps || 0)
            if (!bestByExercise[h.exercise] || vol > bestByExercise[h.exercise].volume) {
              bestByExercise[h.exercise] = {
                volume: vol,
                weight: h.weight_kg,
                reps: h.reps,
              }
            }
          }
          
          const newPrs = []
          for (const set of (result.workout_sets || [])) {
            const currentVol = (set.weight_kg || 0) * (set.reps || 0)
            const best = bestByExercise[set.exercise]
            
            if (!best) continue // First time doing this exercise
            
            if (currentVol > best.volume || set.weight_kg > best.weight) {
              // Check if we already have a PR for this exercise
              if (!newPrs.find(p => p.exercise === set.exercise)) {
                newPrs.push({
                  exercise: set.exercise,
                  weight: set.weight_kg,
                  reps: set.reps,
                  isWeightPr: set.weight_kg > best.weight,
                })
              }
            }
          }
          if (!cancelled) setPrs(newPrs)
        }

        if (cancelled) return

        // Get next workout recommendation
        const { data: workouts, error: workoutsError } = await supabase
          .from('workouts')
          .select('id, created_at, workout_sets(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (workoutsError) throw workoutsError
        if (cancelled) return

        // Add current workout to analysis
        const currentWorkout = {
          id: result.id,
          created_at: new Date().toISOString(),
          workout_sets: result.workout_sets || [],
        }
        const allWorkouts = [currentWorkout, ...(workouts || [])]
        
        const muscleStatus = analyzeTraining(allWorkouts)
        const splits = scoreSplits(muscleStatus)
        
        if (splits.length > 0 && !cancelled) {
          const best = splits[0]
          
          // Find when the slowest recovering muscle of this split is 80%+ ready
          const splitMuscles = SPLIT_MUSCLES[best.name] || []
          let maxHoursNeeded = 0
          
          for (const muscle of splitMuscles) {
            const hours = RECOVERY_HOURS[muscle] || 72
            // 80% recovery = hours * 0.8
            const hoursFor80 = hours * 0.8
            if (hoursFor80 > maxHoursNeeded) {
              maxHoursNeeded = hoursFor80
            }
          }
          
          const bestDate = new Date(Date.now() + maxHoursNeeded * 3600000)
          
          setNextWorkout({
            split: best.name,
            reasoning: best.reasoning,
            bestDate,
            hoursUntil: maxHoursNeeded,
          })
        }
      } catch (err) {
        console.error('Failed to load finish data:', err)
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
    try {
      await onSaveTemplate(templateName.trim())
      setSaved(true)
      setShowTemplateInput(false)
    } catch (err) {
      console.error('Failed to save template:', err)
    } finally {
      setSaving(false)
    }
  }

  function handlePlanNext() {
    onClose()
    navigate('/coach')
  }

  function formatDate(date) {
    const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-US'
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
  }

  function formatTime(date) {
    return date.toLocaleTimeString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getMuscleLabel(muscle) {
    return t(`muscles.${muscle}`, muscle)
  }

  function getRecoveryColor(daysFromNow) {
    if (daysFromNow > 3) return 'text-red-400'
    if (daysFromNow > 1) return 'text-orange-400'
    return 'text-green-400'
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-950">
      <div className="min-h-full px-4 py-8">
        <div className="mx-auto max-w-sm">
          
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-black tracking-tight text-white">
              {t('finish_modal.title')}
            </h1>
            <p className="mt-2 text-gray-400">
              {detectedSplit && <span className="text-cyan-500">{detectedSplit}</span>}
              {detectedSplit && ' — '}
              {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-900 p-4 text-center">
              <p className="text-3xl font-black tracking-tight text-white">{mins}</p>
              <p className="label-caps mt-1 text-gray-500">{t('finish_modal.minutes')}</p>
            </div>
            <div className="rounded-2xl bg-gray-900 p-4 text-center">
              <p className="text-3xl font-black tracking-tight text-white">{formatVol(result.totalVolume)}</p>
              <p className="label-caps mt-1 text-gray-500">{t('finish_modal.volume')}</p>
            </div>
            <div className="rounded-2xl bg-gray-900 p-4 text-center">
              <p className="text-3xl font-black tracking-tight text-white">{totalSets}</p>
              <p className="label-caps mt-1 text-gray-500">{t('common.sets')}</p>
            </div>
          </div>

          {/* Loading spinner */}
          {loading && (
            <div className="mb-3 flex items-center justify-center rounded-2xl bg-gray-900 p-6">
              <Loader2 size={24} className="animate-spin text-cyan-500" />
            </div>
          )}

          {/* PRs Section */}
          {!loading && prs.length > 0 && (
            <div className="mb-3 rounded-2xl bg-gray-900 p-4">
              <h3 className="label-caps mb-3 text-cyan-500">{t('finish_modal.new_pr')}</h3>
              <div className="space-y-2">
                {prs.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white">{pr.exercise}</span>
                    <span className="font-bold text-cyan-400">{pr.weight}kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Forecast */}
          {!loading && recoveryForecast.length > 0 && (
            <div className="mb-3 rounded-2xl bg-gray-900 p-4">
              <h3 className="label-caps mb-3 text-gray-400">{t('finish_modal.recovery')}</h3>
              <div className="space-y-2">
                {recoveryForecast.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{getMuscleLabel(item.muscle)}</span>
                    <span className={getRecoveryColor(item.daysFromNow)}>
                      {t('finish_modal.ready_on')} {formatDate(item.readyDate)} {formatTime(item.readyDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Workout Recommendation */}
          {!loading && nextWorkout && (
            <div className="mb-3 rounded-2xl bg-gray-900 p-4">
              <h3 className="label-caps mb-3 text-gray-400">{t('finish_modal.next_workout')}</h3>
              <div className="mb-2">
                <span className="text-xl font-bold text-white">{nextWorkout.split}</span>
              </div>
              <div className="mb-2 text-sm text-cyan-400">
                {t('finish_modal.best_time')}: {formatDate(nextWorkout.bestDate)}
              </div>
              {nextWorkout.reasoning && (
                <p className="text-xs text-gray-500">{nextWorkout.reasoning}</p>
              )}
            </div>
          )}

          {/* Save Template */}
          {onSaveTemplate && !saved && (
            <div className="mb-3 rounded-2xl bg-gray-900 p-4">
              {!showTemplateInput ? (
                <button
                  onClick={() => setShowTemplateInput(true)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700 transition-colors active:bg-gray-800 active:scale-[0.97]"
                >
                  <BookmarkPlus size={16} />
                  {t('finish_modal.save_template')}
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('finish_modal.template_name_placeholder')}
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
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
                      {t('finish_modal.save')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {saved && (
            <div className="mb-3 rounded-xl bg-green-500/10 px-4 py-2 text-center text-sm text-green-400">
              {t('finish_modal.template_saved')}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={onClose}
              className="h-14 w-full rounded-2xl bg-cyan-500 text-lg font-bold text-white transition-transform active:scale-[0.97]"
            >
              {t('finish_modal.done')}
            </button>
            <button
              onClick={handlePlanNext}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700 transition-colors active:bg-gray-900 active:scale-[0.97]"
            >
              <Calendar size={16} />
              {t('finish_modal.plan_next')}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()}`
}
