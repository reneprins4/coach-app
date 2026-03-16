import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, LogOut, Trash2, AlertTriangle, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut, settings: globalSettings, updateSettings } = useAuthContext()
  const [localSettings, setLocalSettings] = useState(globalSettings)
  const [loggingOut, setLoggingOut] = useState(false)
  const { workouts } = useWorkouts(user?.id)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [tab, setTab] = useState('personal')
  const [showSaved, setShowSaved] = useState(false)

  const settings = localSettings
  const debounceRef = useRef(null)

  // Auto-save with 500ms debounce
  const debouncedSave = useCallback((newSettings) => {
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
    { value: 'beginner',     label: t('profile.experience_beginner'),     sub: '< 1 jaar' },
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

  function update(key, value) {
    const newSettings = { ...localSettings, [key]: value }
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
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalVol = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0)
    const memberSinceDate = settings.memberSince ? new Date(settings.memberSince) : null
    const memberSince = memberSinceDate && !isNaN(memberSinceDate)
      ? memberSinceDate.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long', year: 'numeric' })
      : t('profile.unknown')
    return { totalWorkouts, totalVol, memberSince }
  }, [workouts, settings.memberSince, i18n.language, t])

  function exportWorkoutsCSV() {
    const headers = ['Datum', 'Training ID', 'Oefening', 'Gewicht (kg)', 'Herhalingen', 'RPE', 'Volume (kg)']
    const rows = [headers]
    for (const w of workouts) {
      const date = new Date(w.created_at).toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB')
      for (const s of (w.workout_sets || [])) {
        const volume = ((s.weight_kg || 0) * (s.reps || 0)).toFixed(1)
        rows.push([date, w.id.slice(0, 8), s.exercise, s.weight_kg || 0, s.reps || 0, s.rpe || '', volume])
      }
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kravex-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const profileComplete = settings.name && settings.bodyweight && settings.experienceLevel

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 pb-24">

      {/* Header — always visible above tabs */}
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">{t('profile.subtitle')}</p>
          <h1 className="text-3xl font-black tracking-tight text-white">{t('profile.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {showSaved && (
            <span className="flex items-center gap-1 text-sm text-emerald-400 animate-pulse">
              <Check size={14} />
              {t('profile.autosaved')}
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 active:bg-gray-900 active:text-white"
          >
            <LogOut size={16} />
            {loggingOut ? t('profile.logging_out') : t('profile.logout')}
          </button>
        </div>
      </div>
      {user?.email && <p className="mb-4 text-sm text-slate-500">{user.email}</p>}

      {/* Incomplete banner */}
      {!profileComplete && (
        <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400">
          {t('profile.incomplete_banner')}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-900 p-1">
        {[
          { value: 'personal', label: t('profile.tab_personal') },
          { value: 'training', label: t('profile.tab_training') },
          { value: 'account', label: t('profile.tab_account') },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
              tab === t.value ? 'bg-white text-black' : 'text-gray-500 active:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: JIJ (Personal Info)
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'personal' && (
        <div className="space-y-6">
          {/* Naam */}
          <div>
            <p className="label-caps mb-2">{t('profile.name_label')}</p>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('profile.name_placeholder')}
              className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
            />
          </div>

          {/* Lichaamsgewicht */}
          <div>
            <p className="label-caps mb-2">{t('profile.weight_label')}</p>
            <input
              type="number"
              value={settings.bodyweight}
              onChange={(e) => update('bodyweight', e.target.value)}
              placeholder={t('profile.weight_placeholder')}
              className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
            />
            <p className="mt-1 text-xs text-gray-600">{t('profile.weight_hint')}</p>
          </div>

          {/* Geslacht */}
          <div>
            <p className="label-caps mb-2">{t('gender.label')}</p>
            <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
              {[
                { value: 'male', label: t('gender.male') },
                { value: 'female', label: t('gender.female') },
                { value: 'other', label: t('gender.other') },
              ].map(g => (
                <button
                  key={g.value}
                  onClick={() => update('gender', g.value)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
                    settings.gender === g.value ? 'bg-white text-black' : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ervaringsniveau */}
          <div>
            <p className="label-caps mb-2">{t('profile.experience_label')}</p>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => update('experienceLevel', l.value)}
                  className={`flex flex-1 flex-col items-center rounded-xl py-3 text-sm font-bold ${
                    settings.experienceLevel === l.value
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                  }`}
                >
                  <span>{l.label}</span>
                  <span className={`text-[10px] font-normal ${settings.experienceLevel === l.value ? 'text-cyan-200' : 'text-gray-600'}`}>{l.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: TRAINING (Training Preferences)
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'training' && (
        <div className="space-y-6">
          {/* Trainingsdoel */}
          <div>
            <p className="label-caps mb-2">{t('training_goal.title')}</p>
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
                  className={`flex items-center gap-4 rounded-2xl p-4 text-left ${
                    settings.trainingGoal === g.value
                      ? 'bg-cyan-500/15 ring-1 ring-cyan-500'
                      : 'bg-gray-900 ring-1 ring-gray-800 active:bg-gray-800'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`text-sm font-black tracking-tight ${settings.trainingGoal === g.value ? 'text-cyan-400' : 'text-white'}`}>{g.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{g.sub}</p>
                  </div>
                  {settings.trainingGoal === g.value && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Trainingsfase */}
            <div className="mt-3 flex gap-1 rounded-xl bg-gray-900 p-1">
              {[
                { value: 'build',    label: t('training_goal.phase_build') },
                { value: 'strength', label: t('training_goal.phase_strength') },
                { value: 'peak',     label: t('training_goal.phase_peak') },
                { value: 'deload',   label: t('training_goal.phase_deload') },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => update('trainingPhase', p.value)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold ${
                    settings.trainingPhase === p.value ? 'bg-white text-black' : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Maxima & Doelstelling */}
          <div>
            <p className="label-caps mb-1">{t('main_lift.section_title')}</p>
            <p className="mb-3 text-xs text-gray-600">{t('main_lift.section_hint')}</p>
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
                    className={`rounded-2xl p-4 ${isMain ? 'ring-1 ring-cyan-500' : 'ring-1 ring-gray-800'}`}
                    style={isMain
                      ? { background: 'linear-gradient(135deg, #0c1f2e 0%, #0d1421 100%)' }
                      : { background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)' }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className={`text-sm font-black tracking-tight ${isMain ? 'text-cyan-400' : 'text-white'}`}>{lift.label}</p>
                      <button
                        onClick={() => update('mainLift', isMain ? null : lift.value)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                          isMain
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800 text-gray-500 active:bg-gray-700'
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
                          value={(lift.settingsKey ? settings[lift.settingsKey] : settings.ohpMax) || ''}
                          onChange={(e) => {
                            const key = lift.settingsKey || 'ohpMax'
                            update(key, e.target.value ? Number(e.target.value) : null)
                          }}
                          placeholder="-"
                          className="h-11 w-full rounded-xl bg-gray-800 px-3 text-center text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-gray-600"
                        />
                      </div>
                      {isMain && (
                        <>
                          <div>
                            <p className="label-caps mb-1">{t('main_lift.goal_kg')}</p>
                            <input
                              type="number"
                              value={settings.mainLiftGoalKg || ''}
                              onChange={(e) => update('mainLiftGoalKg', e.target.value ? Number(e.target.value) : null)}
                              placeholder="100"
                              className="h-11 w-full rounded-xl bg-gray-800 px-3 text-center text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-gray-600"
                            />
                          </div>
                          <div>
                            <p className="label-caps mb-1">{t('main_lift.goal_date')}</p>
                            <input
                              type="date"
                              value={settings.mainLiftGoalDate ? settings.mainLiftGoalDate.split('T')[0] : ''}
                              onChange={(e) => update('mainLiftGoalDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="h-11 w-full rounded-xl bg-gray-800 px-3 text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-gray-600"
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

          {/* Spiergroep focus */}
          <div>
            <p className="label-caps mb-1">{t('priority_muscles.title')}</p>
            <p className="mb-3 text-xs text-gray-500">{t('priority_muscles.subtitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              {['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'].map(muscle => {
                const isSelected = (settings.priorityMuscles || []).includes(muscle)
                const canSelect = isSelected || (settings.priorityMuscles || []).length < 2
                return (
                  <button
                    key={muscle}
                    onClick={() => {
                      if (!canSelect) return
                      const current = settings.priorityMuscles || []
                      update('priorityMuscles', isSelected ? current.filter(m => m !== muscle) : [...current, muscle])
                    }}
                    disabled={!canSelect}
                    className={`rounded-xl py-3 text-xs font-bold ${
                      isSelected
                        ? 'bg-cyan-500 text-white'
                        : canSelect
                          ? 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                          : 'cursor-not-allowed bg-gray-900/50 text-gray-700 ring-1 ring-gray-800/50'
                    }`}
                  >
                    {t(`muscles.${muscle}`)}
                  </button>
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
                  className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
                />
              </div>
            )}
          </div>

          {/* Equipment */}
          <div>
            <p className="label-caps mb-2">{t('profile.equipment_label')}</p>
            <div className="flex gap-2">
              {EQUIPMENT.map(e => (
                <button
                  key={e.value}
                  onClick={() => update('equipment', e.value)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                    settings.equipment === e.value
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trainingsfrequentie */}
          <div>
            <p className="label-caps mb-1">{t('profile.frequency_label')}</p>
            <p className="mb-3 text-xs text-gray-600">{t('profile.frequency_hint')}</p>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f}
                  onClick={() => update('frequency', f)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                    settings.frequency === f
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                  }`}
                >
                  {f}/{t('profile.week_abbr')}
                </button>
              ))}
            </div>
          </div>

          {/* Rusttijd */}
          <div>
            <p className="label-caps mb-1">{t('profile.rest_label')}</p>
            <p className="mb-3 text-xs text-gray-600">{t('profile.rest_hint')}</p>
            <div className="flex gap-2">
              {REST_TIMES.map(time => (
                <button
                  key={time}
                  onClick={() => update('restTime', time)}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                    settings.restTime === time
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: ACCOUNT
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'account' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('profile.stats_workouts'),    value: stats.totalWorkouts },
              { label: t('profile.stats_volume'),      value: stats.totalVol >= 1000 ? `${(stats.totalVol / 1000).toFixed(1)}t` : `${stats.totalVol.toFixed(0)}kg` },
              { label: t('profile.member_since_label'), value: stats.memberSince },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xl font-black tabular-nums text-white">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Taal */}
          <div>
            <p className="label-caps mb-2">{t('profile.language_label')}</p>
            <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
              {[{ value: 'nl', label: 'NL' }, { value: 'en', label: 'EN' }].map(lang => (
                <button
                  key={lang.value}
                  onClick={() => { i18n.changeLanguage(lang.value); localStorage.setItem('coach-lang', lang.value) }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    i18n.language === lang.value ? 'bg-white text-black' : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data exporteren */}
          <div>
            <button
              onClick={exportWorkoutsCSV}
              disabled={workouts.length === 0}
              className="flex w-full items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-left text-sm text-gray-300 ring-1 ring-gray-800 active:ring-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} className="text-gray-500" />
              <div className="flex-1">
                <p>{t('profile.export_data')}</p>
                <p className="text-xs text-gray-500">
                  {workouts.length === 0
                    ? t('profile.no_export')
                    : `${workouts.length} ${t('profile.export_sub')}`}
                </p>
              </div>
            </button>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="text-xs text-gray-500 active:text-gray-400">{t('profile.privacy')}</Link>
            <Link to="/terms"   className="text-xs text-gray-500 active:text-gray-400">{t('profile.terms_label')}</Link>
          </div>

          {/* Versie info */}
          <div className="rounded-2xl bg-gray-900 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-600 font-mono">versie</span>
            <span className="text-xs text-gray-500 font-mono">{__GIT_HASH__} · {__GIT_DATE__}</span>
          </div>

          {/* Account verwijderen */}
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(239,68,68,0.10)' }}>
            <p className="mb-2 text-sm font-bold text-red-400">{t('profile.danger_zone')}</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-sm font-bold text-red-400 ring-1 ring-red-500/30 active:bg-red-500/20"
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
                    className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-bold text-gray-300 active:bg-gray-700 disabled:opacity-50"
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
        </div>
      )}
    </div>
  )
}
