import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, LogOut, Trash2, AlertTriangle, Download, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useMeasurements } from '../hooks/useMeasurements'
import { useAuthContext } from '../App'
import { supabase } from '../lib/supabase'
import { getLocalDateString } from '../lib/dateUtils'
import { getCurrentBlock, getBlockProgress, clearBlock, PHASES } from '../lib/periodization'
import { buildExportData, exportToJSON, exportWorkoutsToCSV, exportMeasurementsToCSV, downloadFile } from '../lib/dataExport'
import { formatVolume, getUnitLabel } from '../lib/unitConversion'
import { ACHIEVEMENTS, buildAchievementContext, getUnlockedAchievements, syncAchievements } from '../lib/achievements'
import AchievementBadge from '../components/AchievementBadge'
import InjuryBanner from '../components/InjuryBanner'
import InjuryReport from '../components/InjuryReport'
import InjuryCheckIn from '../components/InjuryCheckIn'
import PrGoalsSection from '../components/PrGoalsSection'
import PageTransition from '../components/PageTransition'
import { useInjuries } from '../hooks/useInjuries'
import type { ActiveInjury } from '../lib/injuryRecovery'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut, settings: globalSettings, updateSettings } = useAuthContext()
  const [localSettings, setLocalSettings] = useState(globalSettings)
  const [loggingOut, setLoggingOut] = useState(false)
  const { workouts } = useWorkouts(user?.id)
  const { measurements } = useMeasurements(user?.id)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [tab, setTab] = useState('personal')
  const [showSaved, setShowSaved] = useState(false)

  // Injury management
  const { activeInjuries, addInjury, checkIn, resolve } = useInjuries(user?.id)
  const [showInjuryReport, setShowInjuryReport] = useState(false)
  const [checkInInjury, setCheckInInjury] = useState<ActiveInjury | null>(null)

  // Periodization block
  const [block, setBlock] = useState(() => getCurrentBlock(user?.id))

  const settings = localSettings
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save with 500ms debounce
  const debouncedSave = useCallback((newSettings: typeof localSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateSettings(newSettings)
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    }, 500)
  }, [updateSettings])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const LEVELS = [
    { value: 'complete_beginner', label: t('profile.experience_complete_beginner'), sub: t('profile.experience_complete_beginner_sub') },
    { value: 'beginner',     label: t('profile.experience_beginner'),     sub: '< 1 jaar' },
    { value: 'returning',    label: t('profile.experience_returning'),    sub: t('profile.experience_returning_sub') },
    { value: 'intermediate', label: t('profile.experience_intermediate'), sub: '1–3 jaar' },
    { value: 'advanced',     label: t('profile.experience_advanced'),     sub: '3+ jaar' },
  ]

  const EQUIPMENT = [
    { value: 'full_gym',      label: t('profile.equipment_full_gym') },
    { value: 'home_gym',      label: t('profile.equipment_home_gym') ?? 'Thuisgym' },
    { value: 'dumbbells_only',label: t('profile.equipment_dumbbells') },
  ]

  const FREQUENCIES = ['2x', '3x', '4x', '5x', '6x']
  const REST_TIMES  = [60, 90, 120, 180]

  function update(key: string, value: unknown) {
    const newSettings = { ...localSettings, [key]: value } as typeof localSettings
    setLocalSettings(newSettings)
    debouncedSave(newSettings)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error(t('profile.session_error'))
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('profile.delete_failed'))
      }
      localStorage.clear()
      await supabase.auth.signOut()
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err) {
      setDeleteError(String((err as Error).message ?? 'Unknown error'))
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalVol = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0)
    const memberSinceDate = settings.memberSince ? new Date(settings.memberSince) : null
    const memberSince = memberSinceDate && !isNaN(memberSinceDate.getTime())
      ? memberSinceDate.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long', year: 'numeric' })
      : t('profile.unknown')
    return { totalWorkouts, totalVol, memberSince }
  }, [workouts, settings.memberSince, i18n.language, t])

  // Compute and sync achievements
  const unlockedIds = useMemo(() => {
    if (workouts.length === 0) return getUnlockedAchievements()
    const bodyweight = parseFloat(settings.bodyweight) || 0
    const ctx = buildAchievementContext(workouts, bodyweight, settings.memberSince)
    syncAchievements(ctx)
    return getUnlockedAchievements()
  }, [workouts, settings.bodyweight, settings.memberSince])

  function handleExportJSON() {
    const data = buildExportData(workouts, measurements, settings)
    const json = exportToJSON(data)
    downloadFile(json, `kravex-backup-${getLocalDateString(new Date())}.json`, 'application/json')
  }

  function handleExportWorkoutsCSV() {
    const csv = exportWorkoutsToCSV(workouts)
    downloadFile(csv, `kravex-workouts-${getLocalDateString(new Date())}.csv`, 'text/csv')
  }

  function handleExportMeasurementsCSV() {
    const csv = exportMeasurementsToCSV(measurements)
    downloadFile(csv, `kravex-measurements-${getLocalDateString(new Date())}.csv`, 'text/csv')
  }

  const profileComplete = settings.name && settings.bodyweight && settings.experienceLevel

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageTransition>
    <div className="relative overflow-hidden px-4 py-6 pb-24">
      {/* Atmospheric glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[400px] w-[500px] bg-[radial-gradient(ellipse,rgba(6,182,212,0.08)_0%,transparent_70%)] blur-[80px] z-0" />

      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">{t('profile.subtitle')}</p>
          <h1 className="text-display">{t('profile.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {showSaved && (
            <span role="status" aria-live="polite" className="flex items-center gap-1 text-sm text-emerald-400 animate-pulse">
              <Check size={14} aria-hidden="true" />
              {t('profile.autosaved')}
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--text-2)] active:bg-white/[0.04] active:text-white"
          >
            <LogOut size={16} />
            {loggingOut ? t('profile.logging_out') : t('profile.logout')}
          </button>
        </div>
      </div>
      {user?.email && <p className="mb-4 text-sm text-[var(--text-3)]">{user.email}</p>}

      {/* Incomplete banner */}
      {!profileComplete && (
        <div className="card-accent mb-4 text-sm text-cyan-400">
          {t('profile.incomplete_banner')}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-none rounded-2xl bg-white/[0.03] border border-white/[0.06] p-1">
          {[
            { value: 'personal', label: t('profile.tab_personal') },
            { value: 'training', label: t('profile.tab_training') },
            { value: 'account', label: t('profile.tab_account') },
          ].map(tabItem => (
            <button
              key={tabItem.value}
              onClick={() => setTab(tabItem.value)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === tabItem.value
                  ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >

      {/* TAB 1: JIJ (Personal Info) */}
      {tab === 'personal' && (
        <div className="space-y-6">
          {/* Naam */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0 }}>
          <div className="card">
            <label htmlFor="profile-name" className="label-caps mb-2 block">{t('profile.name_label')}</label>
            <input
              id="profile-name"
              type="text"
              value={settings.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('profile.name_placeholder')}
              className="h-12 w-full rounded-xl px-4 text-white placeholder-[var(--text-3)] outline-none"
            />
          </div>
          </motion.div>

          {/* Gewichtseenheid */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('profile.weight_unit')}</p>
            <div className="flex gap-2">
              {[
                { value: 'kg' as const, label: t('profile.unit_kg') },
                { value: 'lbs' as const, label: t('profile.unit_lbs') },
              ].map(u => (
                <motion.button
                  key={u.value}
                  onClick={() => update('units', u.value)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    settings.units === u.value
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-[var(--text-3)] active:text-[var(--text-2)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {u.label}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>

          {/* Lichaamsgewicht */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}>
          <div className="card">
            <label htmlFor="profile-weight" className="label-caps mb-2 block">{t('profile.weight_label')} ({settings.units})</label>
            <input
              id="profile-weight"
              type="number"
              value={settings.bodyweight}
              onChange={(e) => update('bodyweight', e.target.value)}
              placeholder={t('profile.weight_placeholder')}
              className="h-12 w-full rounded-xl px-4 text-white placeholder-[var(--text-3)] outline-none"
            />
            <p className="mt-2 text-xs text-[var(--text-3)]">{t('profile.weight_hint')}</p>
          </div>
          </motion.div>

          {/* Geslacht */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('gender.label')}</p>
            <div className="flex gap-2">
              {[
                { value: 'male', label: t('gender.male') },
                { value: 'female', label: t('gender.female') },
                { value: 'other', label: t('gender.other') },
              ].map(g => (
                <motion.button
                  key={g.value}
                  onClick={() => update('gender', g.value)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    settings.gender === g.value
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-[var(--text-3)] active:text-[var(--text-2)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {g.label}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>

          {/* Ervaringsniveau */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('profile.experience_label')}</p>
            <div className="flex flex-col gap-2">
              {LEVELS.map(l => (
                <motion.button
                  key={l.value}
                  onClick={() => update('experienceLevel', l.value)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    settings.experienceLevel === l.value
                      ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
                      : 'bg-white/[0.03] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                  }`}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div>
                    <span className={`text-sm font-bold ${settings.experienceLevel === l.value ? 'text-cyan-400' : 'text-white'}`}>{l.label}</span>
                    <span className={`ml-2 text-xs font-normal ${settings.experienceLevel === l.value ? 'text-cyan-400/60' : 'text-[var(--text-3)]'}`}>{l.sub}</span>
                  </div>
                  {settings.experienceLevel === l.value && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>
        </div>
      )}

      {/* TAB 2: TRAINING */}
      {tab === 'training' && (
        <div className="space-y-6">
          {/* Blessures */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0 }}>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-caps">{t('injury.injuries_title')}</p>
              <button
                onClick={() => setShowInjuryReport(true)}
                className="text-xs font-medium text-cyan-400 active:text-cyan-300"
              >
                {t('injury.report_injury')}
              </button>
            </div>
            {activeInjuries.length > 0 ? (
              <InjuryBanner
                injuries={activeInjuries}
                onCheckIn={(injury) => setCheckInInjury(injury)}
                onResolve={(injury) => resolve(injury.id)}
              />
            ) : (
              <p className="text-xs text-[var(--text-3)]">{t('injury.no_injuries')}</p>
            )}
          </div>
          </motion.div>

          {/* Trainingsdoel */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('training_goal.title')}</p>
            <div className="flex flex-col gap-2">
              {[
                { value: 'strength',      label: t('training_goal.strength'),      sub: t('training_goal.strength_sub') },
                { value: 'hypertrophy',   label: t('training_goal.hypertrophy'),   sub: t('training_goal.hypertrophy_sub') },
                { value: 'powerbuilding', label: t('training_goal.powerbuilding'), sub: t('training_goal.powerbuilding_sub') },
                { value: 'conditioning',  label: t('training_goal.conditioning'),  sub: t('training_goal.conditioning_sub') },
              ].map(g => (
                <button
                  key={g.value}
                  onClick={() => update('trainingGoal', g.value)}
                  className={`flex items-center gap-4 rounded-2xl p-4 text-left transition-colors ${
                    settings.trainingGoal === g.value
                      ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
                      : 'bg-white/[0.03] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`text-sm font-black tracking-tight ${settings.trainingGoal === g.value ? 'text-cyan-400' : 'text-white'}`}>{g.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-3)]">{g.sub}</p>
                  </div>
                  {settings.trainingGoal === g.value && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>

          </div>
          </motion.div>

          {/* Trainingsplan */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.06 }}>
          <div className={block ? 'card-accent' : 'card'}>
            <p className="label-caps mb-3">{t('phases.training_plan')}</p>
            {block ? (() => {
              const blockPhase = PHASES[block.phase]
              const blockProgress = getBlockProgress(block)
              return (
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-title">{t(blockPhase.labelKey)}</p>
                    <span className="text-sm tabular text-gray-400">
                      {t('phases.week_of', { current: blockProgress?.currentWeek, total: blockProgress?.totalWeeks })}
                    </span>
                  </div>
                  {blockProgress && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-cyan-500 glow-bar transition-all duration-700"
                        style={{ width: `${Math.max(blockProgress.pct, 6)}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => navigate('/plan')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2.5 text-xs font-bold text-cyan-400 active:bg-cyan-500/[0.12]"
                    >
                      {t('profile.plan_view')}
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(t('profile.plan_stop_confirm'))) {
                          clearBlock(user?.id ?? null)
                          setBlock(null)
                        }
                      }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-[var(--text-3)] active:bg-white/[0.06]"
                    >
                      {t('profile.plan_stop')}
                    </button>
                  </div>
                </div>
              )
            })() : (
              <div>
                <p className="text-sm text-[var(--text-2)]">{t('profile.plan_suggestion')}</p>
                <button
                  onClick={() => navigate('/plan')}
                  className="mt-3 flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2.5 text-xs font-bold text-cyan-400 active:bg-cyan-500/[0.12]"
                >
                  {t('profile.plan_choose')}
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          </motion.div>

          {/* Maxima & Doelstelling */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}>
          <div className="card">
            <p className="label-caps mb-1">{t('main_lift.section_title')}</p>
            <p className="mb-3 text-xs text-[var(--text-3)]">{t('main_lift.section_hint')}</p>
            <div className="space-y-3">
              {[
                { value: 'bench',    label: t('main_lift.bench'),    settingsKey: 'benchMax' },
                { value: 'squat',    label: t('main_lift.squat'),    settingsKey: 'squatMax' },
                { value: 'deadlift', label: t('main_lift.deadlift'), settingsKey: 'deadliftMax' },
                { value: 'ohp',      label: t('main_lift.ohp'),      settingsKey: null },
              ].map(lift => {
                const isMain = settings.mainLift === lift.value
                return (
                  <div
                    key={lift.value}
                    className={`rounded-2xl p-4 ${isMain ? 'card-accent' : 'card'}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className={`text-sm font-black tracking-tight ${isMain ? 'text-cyan-400' : 'text-white'}`}>{lift.label}</p>
                      <button
                        onClick={() => update('mainLift', isMain ? null : lift.value)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                          isMain
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-white/[0.06] text-[var(--text-3)] active:bg-white/[0.1]'
                        }`}
                      >
                        {isMain ? t('main_lift.main_badge') : t('main_lift.set_main')}
                      </button>
                    </div>
                    <div className={`grid gap-2 ${isMain ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      <div>
                        <p className="label-caps mb-1">{t('main_lift.current_max')}</p>
                        <input
                          type="number"
                          value={String((lift.settingsKey ? (settings as unknown as Record<string, unknown>)[lift.settingsKey!] : (settings as unknown as Record<string, unknown>).ohpMax) || '')}
                          onChange={(e) => {
                            const key = lift.settingsKey || 'ohpMax'
                            update(key, e.target.value ? Number(e.target.value) : null)
                          }}
                          placeholder="-"
                          aria-label={`${lift.label} ${t('main_lift.current_max')}`}
                          className="h-11 w-full rounded-xl px-3 text-center text-white placeholder-[var(--text-3)] outline-none"
                        />
                      </div>
                      {isMain && (
                        <>
                          <div>
                            <p className="label-caps mb-1">{t('main_lift.goal_kg')} ({getUnitLabel(settings.units)})</p>
                            <input
                              type="number"
                              value={settings.mainLiftGoalKg || ''}
                              onChange={(e) => update('mainLiftGoalKg', e.target.value ? Number(e.target.value) : null)}
                              placeholder="100"
                              aria-label={`${lift.label} ${t('main_lift.goal_kg')}`}
                              className="h-11 w-full rounded-xl px-3 text-center text-white placeholder-[var(--text-3)] outline-none"
                            />
                          </div>
                          <div>
                            <p className="label-caps mb-1">{t('main_lift.goal_date')}</p>
                            <input
                              type="date"
                              value={settings.mainLiftGoalDate ? settings.mainLiftGoalDate.split('T')[0] : ''}
                              onChange={(e) => update('mainLiftGoalDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              aria-label={`${lift.label} ${t('main_lift.goal_date')}`}
                              className="h-11 w-full rounded-xl px-3 text-white placeholder-[var(--text-3)] outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          </motion.div>

          {/* PR Doelen */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}>
            <PrGoalsSection />
          </motion.div>

          {/* Spiergroep focus */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.16 }}>
          <div className="card">
            <p className="label-caps mb-1">{t('priority_muscles.title')}</p>
            <p className="mb-3 text-xs text-[var(--text-3)]">{t('priority_muscles.subtitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              {['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'].map(muscle => {
                const isSelected = (settings.priorityMuscles || []).includes(muscle as import('../types').MuscleGroup)
                const canSelect = isSelected || (settings.priorityMuscles || []).length < 2
                return (
                  <motion.button
                    key={muscle}
                    onClick={() => {
                      if (!canSelect) return
                      const current = settings.priorityMuscles || []
                      update('priorityMuscles', isSelected ? current.filter(m => m !== muscle) : [...current, muscle])
                    }}
                    disabled={!canSelect}
                    className={`rounded-xl py-3 text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white'
                        : canSelect
                          ? 'bg-white/[0.04] text-[var(--text-2)] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                          : 'cursor-not-allowed bg-white/[0.02] text-[var(--text-3)] border border-[var(--border-subtle)] opacity-40'
                    }`}
                    whileTap={canSelect ? { scale: 0.95 } : undefined}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {t(`muscles.${muscle}`)}
                  </motion.button>
                )
              })}
            </div>
            {(settings.priorityMuscles || []).length > 0 && (
              <div className="mt-3">
                <p className="label-caps mb-1">{t('priority_muscles.until')}</p>
                <input
                  type="date"
                  value={settings.priorityMusclesUntil ? settings.priorityMusclesUntil.split('T')[0] : ''}
                  onChange={(e) => update('priorityMusclesUntil', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  aria-label={t('priority_muscles.until')}
                  className="h-12 w-full rounded-xl px-4 text-white placeholder-[var(--text-3)] outline-none"
                />
              </div>
            )}
          </div>
          </motion.div>

          {/* Equipment */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('profile.equipment_label')}</p>
            <div className="flex gap-2">
              {EQUIPMENT.map(e => (
                <motion.button
                  key={e.value}
                  onClick={() => update('equipment', e.value)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                    settings.equipment === e.value
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white/[0.04] text-[var(--text-2)] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {e.label}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>

          {/* Trainingsfrequentie */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.24 }}>
          <div className="card">
            <p className="label-caps mb-1">{t('profile.frequency_label')}</p>
            <p className="mb-3 text-xs text-[var(--text-3)]">{t('profile.frequency_hint')}</p>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <motion.button
                  key={f}
                  onClick={() => update('frequency', f)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                    settings.frequency === f
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white/[0.04] text-[var(--text-2)] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {f}/{t('profile.week_abbr')}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>

          {/* Rusttijd */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.28 }}>
          <div className="card">
            <p className="label-caps mb-1">{t('profile.rest_label')}</p>
            <p className="mb-3 text-xs text-[var(--text-3)]">{t('profile.rest_hint')}</p>
            <div className="flex gap-2">
              {REST_TIMES.map(time => (
                <motion.button
                  key={time}
                  onClick={() => update('restTime', time)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
                    settings.restTime === time
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white/[0.04] text-[var(--text-2)] border border-[var(--border-subtle)] active:bg-white/[0.06]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {time}s
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>
        </div>
      )}

      {/* TAB 3: ACCOUNT */}
      {tab === 'account' && (
        <div className="space-y-6">
          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0 }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('profile.stats_workouts'),    value: stats.totalWorkouts },
              { label: t('profile.stats_volume'),      value: formatVolume(stats.totalVol, settings.units) },
              { label: t('profile.member_since_label'), value: stats.memberSince },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center">
                <p className="text-xl font-black tabular-nums text-white">{value}</p>
                <p className="mt-1 label-caps">{label}</p>
              </div>
            ))}
          </div>
          </motion.div>

          {/* Achievements */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('achievements.title')}</p>
            <div className="grid grid-cols-4 gap-2">
              {ACHIEVEMENTS.map(a => (
                <AchievementBadge
                  key={a.id}
                  achievement={a}
                  unlocked={unlockedIds.includes(a.id)}
                />
              ))}
            </div>
          </div>
          </motion.div>

          {/* Taal */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}>
          <div className="card">
            <p className="label-caps mb-3">{t('profile.language_label')}</p>
            <div className="flex gap-2">
              {[{ value: 'nl', label: 'NL' }, { value: 'en', label: 'EN' }].map(lang => (
                <motion.button
                  key={lang.value}
                  onClick={() => { i18n.changeLanguage(lang.value); localStorage.setItem('coach-lang', lang.value) }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    i18n.language === lang.value
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-[var(--text-3)] active:text-[var(--text-2)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {lang.label}
                </motion.button>
              ))}
            </div>
          </div>
          </motion.div>

          {/* Data exporteren */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}>
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-[var(--text-3)]" />
              <p className="text-sm font-bold text-white">{t('profile.export_data')}</p>
            </div>
            <p className="text-xs text-[var(--text-3)]">
              {workouts.length === 0 && measurements.length === 0
                ? t('profile.no_export')
                : `${workouts.length} ${t('profile.export_sub')}`}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportJSON}
                disabled={workouts.length === 0 && measurements.length === 0}
                className="btn-secondary flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('export.json_full')}
              </button>
              <button
                onClick={handleExportWorkoutsCSV}
                disabled={workouts.length === 0}
                className="btn-secondary flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('export.csv_workouts')}
              </button>
              <button
                onClick={handleExportMeasurementsCSV}
                disabled={measurements.length === 0}
                className="btn-secondary flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('export.csv_measurements')}
              </button>
            </div>
          </div>
          </motion.div>

          {/* Links */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}>
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="text-xs text-[var(--text-3)] active:text-[var(--text-2)]">{t('profile.privacy')}</Link>
            <Link to="/terms"   className="text-xs text-[var(--text-3)] active:text-[var(--text-2)]">{t('profile.terms_label')}</Link>
          </div>
          </motion.div>

          {/* Versie info */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.25 }}>
          <div className="card flex items-center justify-between">
            <span className="text-xs text-[var(--text-3)] font-mono">versie</span>
            <span className="text-xs text-[var(--text-3)] font-mono">{__GIT_HASH__} · {__GIT_DATE__}</span>
          </div>
          </motion.div>

          {/* Account verwijderen */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.3 }}>
          <div className="card border-red-500/10">
            <p className="label-caps mb-3 text-red-400/70">{t('profile.danger_zone')}</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary flex w-full items-center justify-center gap-2 text-sm text-red-400/70 border-red-500/15"
              >
                <Trash2 size={16} />
                {t('profile.delete_account')}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 p-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{t('profile.delete_confirm_text')}</p>
                </div>
                {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                    disabled={deleting}
                    className="btn-secondary flex-1 text-sm disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white active:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? t('profile.deleting') : t('profile.confirm_delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
          </motion.div>
        </div>
      )}

        </motion.div>
      </AnimatePresence>

      {/* Injury Report Modal */}
      <InjuryReport
        isOpen={showInjuryReport}
        onClose={() => setShowInjuryReport(false)}
        onReport={(area, severity, side) => {
          addInjury(area, severity, side)
          setShowInjuryReport(false)
        }}
      />

      {/* Injury Check-In Modal */}
      {checkInInjury && (
        <InjuryCheckIn
          isOpen={!!checkInInjury}
          onClose={() => setCheckInInjury(null)}
          onCheckIn={(feeling) => {
            checkIn(checkInInjury.id, feeling)
          }}
          injuryArea={checkInInjury.bodyArea}
        />
      )}
    </div>
    </PageTransition>
  )
}
