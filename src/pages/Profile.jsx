import { useState, useMemo } from 'react'
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
  const [saved, setSaved] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { workouts } = useWorkouts(user?.id)
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)



  const LEVELS = [
    { value: 'beginner', label: t('profile.experience_beginner'), sub: '< 1 year' },
    { value: 'intermediate', label: t('profile.experience_intermediate'), sub: '1-3 years' },
    { value: 'advanced', label: t('profile.experience_advanced'), sub: '3+ years' },
  ]

  const EQUIPMENT = [
    { value: 'full_gym', label: t('profile.equipment_full_gym') },
    { value: 'home_gym', label: i18n.language === 'nl' ? 'Thuisgym' : 'Home gym' },
    { value: 'dumbbells_only', label: t('profile.equipment_dumbbells') },
  ]

  const FREQUENCIES = ['2x', '3x', '4x', '5x', '6x']
  const REST_TIMES = [60, 90, 120, 180]

  // Sync local form state wanneer global settings bijgewerkt worden
  const settings = localSettings

  function update(key, value) {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    updateSettings(localSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
      
      if (!session?.access_token) {
        throw new Error(i18n.language === 'nl' ? 'Geen geldige sessie gevonden' : 'No valid session found')
      }
      
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || (i18n.language === 'nl' ? 'Account verwijderen mislukt' : 'Failed to delete account'))
      }
      
      // Clear local storage
      localStorage.clear()
      
      // Sign out and navigate to login
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
      : (i18n.language === 'nl' ? 'Onbekend' : 'Unknown')
    return { totalWorkouts, totalVol, memberSince }
  }, [workouts, settings.memberSince, i18n.language])

  const profileComplete = settings.name && settings.bodyweight && settings.experienceLevel

  function exportWorkoutsCSV() {
    const rows = [[
      i18n.language === 'nl' ? 'Datum' : 'Date', 
      'Training ID', 
      i18n.language === 'nl' ? 'Oefening' : 'Exercise', 
      i18n.language === 'nl' ? 'Gewicht (kg)' : 'Weight (kg)', 
      i18n.language === 'nl' ? 'Herhalingen' : 'Reps', 
      'RPE', 
      'Volume (kg)'
    ]]
    
    for (const w of workouts) {
      const date = new Date(w.created_at).toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB')
      for (const s of (w.workout_sets || [])) {
        const volume = ((s.weight_kg || 0) * (s.reps || 0)).toFixed(1)
        rows.push([
          date,
          w.id.slice(0, 8),
          s.exercise,
          s.weight_kg || 0,
          s.reps || 0,
          s.rpe || '',
          volume
        ])
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

  return (
    <div className="px-4 py-6 pb-24">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">{t('profile.title')}</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 active:bg-gray-900 active:text-white"
        >
          <LogOut size={16} />
          {loggingOut ? (i18n.language === 'nl' ? 'Uitloggen...' : 'Logging out...') : t('profile.logout')}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        {user?.email && <span>{user.email}</span>}
      </p>

      {!profileComplete && (
        <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400">
          {i18n.language === 'nl' ? 'Vul je gegevens in voor nauwkeurigere gewichten' : 'Fill in your details for more accurate weights'}
        </div>
      )}

      {/* Language switcher */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.language_label')}</label>
        <div className="flex gap-2">
          {[{ value: 'nl', label: '🇳🇱 Nederlands' }, { value: 'en', label: '🇬🇧 English' }].map(lang => (
            <button 
              key={lang.value}
              onClick={() => { i18n.changeLanguage(lang.value); localStorage.setItem('coach-lang', lang.value) }}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${i18n.language === lang.value ? 'bg-cyan-500 text-white' : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{i18n.language === 'nl' ? 'Naam' : 'Name'}</label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder={i18n.language === 'nl' ? 'Jouw naam' : 'Your name'}
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {/* Bodyweight */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{i18n.language === 'nl' ? 'Gewicht (kg)' : 'Weight (kg)'}</label>
        <input
          type="number"
          value={settings.bodyweight}
          onChange={(e) => update('bodyweight', e.target.value)}
          placeholder="80"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
        <p className="mt-1 text-xs text-gray-600">{i18n.language === 'nl' ? 'Helpt bij het schatten van startgewichten' : 'Helps estimate starting weights'}</p>
      </div>

      {/* Ervaringsniveau */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.experience_label')}</label>
        <div className="flex gap-2">
          {LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => update('experienceLevel', l.value)}
              className={`flex flex-1 flex-col items-center rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.experienceLevel === l.value
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              <span>{l.label}</span>
              <span className={`text-[10px] ${settings.experienceLevel === l.value ? 'text-cyan-200' : 'text-gray-600'}`}>{l.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trainingsdoel + Fase */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('training_goal.title')}</label>
        <div className="flex flex-col gap-2">
          {[
            { value: 'strength', label: t('training_goal.strength'), sub: t('training_goal.strength_sub') },
            { value: 'hypertrophy', label: t('training_goal.hypertrophy'), sub: t('training_goal.hypertrophy_sub') },
            { value: 'powerbuilding', label: t('training_goal.powerbuilding'), sub: t('training_goal.powerbuilding_sub') },
            { value: 'conditioning', label: t('training_goal.conditioning'), sub: t('training_goal.conditioning_sub') },
          ].map(g => (
            <button
              key={g.value}
              onClick={() => update('trainingGoal', g.value)}
              className={`flex items-center gap-4 rounded-2xl p-4 text-left transition-colors ${
                settings.trainingGoal === g.value
                  ? 'bg-cyan-500/15 ring-1 ring-cyan-500'
                  : 'bg-gray-900 ring-1 ring-gray-800 active:bg-gray-800'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm font-semibold ${settings.trainingGoal === g.value ? 'text-cyan-400' : 'text-white'}`}>
                  {g.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{g.sub}</p>
              </div>
              {settings.trainingGoal === g.value && (
                <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
        {/* Phase selector */}
        <div className="mt-4 flex gap-1 rounded-xl bg-gray-900 p-1">
          {[
            { value: 'build', label: t('training_goal.phase_build') },
            { value: 'strength', label: t('training_goal.phase_strength') },
            { value: 'peak', label: t('training_goal.phase_peak') },
            { value: 'deload', label: t('training_goal.phase_deload') },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => update('trainingPhase', p.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                settings.trainingPhase === p.value
                  ? 'bg-white text-black'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature 2: Hoofdlift Focus */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('main_lift.title')}</label>
        <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
          {[
            { value: 'squat', label: t('main_lift.squat') },
            { value: 'bench', label: t('main_lift.bench') },
            { value: 'deadlift', label: t('main_lift.deadlift') },
            { value: 'ohp', label: t('main_lift.ohp') },
          ].map(lift => (
            <button
              key={lift.value}
              onClick={() => update('mainLift', settings.mainLift === lift.value ? null : lift.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                settings.mainLift === lift.value
                  ? 'bg-white text-black'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {lift.label}
            </button>
          ))}
        </div>
        {settings.mainLift && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block label-caps">{t('main_lift.goal_kg')}</label>
              <input
                type="number"
                value={settings.mainLiftGoalKg || ''}
                onChange={(e) => update('mainLiftGoalKg', e.target.value ? Number(e.target.value) : null)}
                placeholder="100"
                className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block label-caps">{t('main_lift.goal_date')}</label>
              <input
                type="date"
                value={settings.mainLiftGoalDate ? settings.mainLiftGoalDate.split('T')[0] : ''}
                onChange={(e) => update('mainLiftGoalDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature 3: Prioritaire Spiergroep */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('priority_muscles.title')}</label>
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
                  if (isSelected) {
                    update('priorityMuscles', current.filter(m => m !== muscle))
                  } else {
                    update('priorityMuscles', [...current, muscle])
                  }
                }}
                disabled={!canSelect}
                className={`rounded-xl py-3 text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-cyan-500 text-white'
                    : canSelect
                      ? 'bg-gray-900 text-gray-400 ring-1 ring-gray-800 active:bg-gray-800'
                      : 'bg-gray-900/50 text-gray-600 ring-1 ring-gray-800/50'
                }`}
              >
                {t(`muscles.${muscle}`)}
              </button>
            )
          })}
        </div>
        {(settings.priorityMuscles || []).length > 0 && (
          <div className="mt-3">
            <label className="mb-1 block label-caps">{t('priority_muscles.until')}</label>
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
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.equipment_label')}</label>
        <div className="flex gap-2">
          {EQUIPMENT.map(e => (
            <button
              key={e.value}
              onClick={() => update('equipment', e.value)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.equipment === e.value
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Known maxes — optional but improves accuracy */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.maxes_label')} <span className="text-gray-600 font-normal">({i18n.language === 'nl' ? 'optioneel' : 'optional'})</span></label>
        <p className="mb-3 text-xs text-gray-600">{t('profile.maxes_hint')}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'benchMax', label: 'Bench (kg)' },
            { key: 'squatMax', label: 'Squat (kg)' },
            { key: 'deadliftMax', label: 'Deadlift (kg)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block label-caps">{label}</label>
              <input
                type="number"
                value={settings[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder="-"
                className="h-12 w-full rounded-xl bg-gray-900 px-3 text-center text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.frequency_label')}</label>
        <p className="mb-3 text-xs text-gray-600">{t('profile.frequency_hint')}</p>
        <div className="flex gap-2">
          {FREQUENCIES.map(f => (
            <button
              key={f}
              onClick={() => update('frequency', f)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.frequency === f
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {f}/{i18n.language === 'nl' ? 'wk' : 'wk'}
            </button>
          ))}
        </div>
      </div>

      {/* Rest time */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">{t('profile.rest_label')}</label>
        <p className="mb-3 text-xs text-gray-600">{t('profile.rest_hint')}</p>
        <div className="flex gap-2">
          {REST_TIMES.map(time => (
            <button
              key={time}
              onClick={() => update('restTime', time)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.restTime === time
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {time}s
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('profile.stats_workouts'), value: stats.totalWorkouts },
          { label: t('profile.stats_volume'), value: stats.totalVol >= 1000 ? `${(stats.totalVol/1000).toFixed(1)}t` : `${stats.totalVol.toFixed(0)}kg` },
          { label: i18n.language === 'nl' ? 'Lid sinds' : 'Member since', value: stats.memberSince },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-xl font-black text-white tabular-nums">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {saved ? (
          <>
            <Check size={16} />
            {t('common.saved')}
          </>
        ) : (
          t('common.save')
        )}
      </button>

      {/* Data export */}
      <div className="mt-6">
        <button
          onClick={exportWorkoutsCSV}
          disabled={workouts.length === 0}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-left text-sm text-gray-300 ring-1 ring-gray-800 active:ring-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} className="text-gray-500" />
          <div className="flex-1">
            <div>{t('profile.export_data')}</div>
            <div className="text-xs text-gray-500">
              {workouts.length === 0 
                ? (i18n.language === 'nl' ? 'Nog geen trainingsdata' : 'No training data yet') 
                : `${workouts.length} ${i18n.language === 'nl' ? 'trainingen beschikbaar' : 'workouts available'}`}
            </div>
          </div>
        </button>
      </div>

      {/* Privacy & Terms links */}
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/privacy" className="text-xs text-gray-500 active:text-gray-400">{i18n.language === 'nl' ? 'Privacybeleid' : 'Privacy Policy'}</Link>
        <Link to="/terms" className="text-xs text-gray-500 active:text-gray-400">{i18n.language === 'nl' ? 'Gebruiksvoorwaarden' : 'Terms of Use'}</Link>
      </div>

      {/* Account verwijderen */}
      <div className="mt-8 rounded-2xl p-4" style={{background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(239,68,68,0.10)'}}>
        <h2 className="mb-2 text-sm font-semibold text-red-400">{i18n.language === 'nl' ? 'Gevarenzone' : 'Danger zone'}</h2>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-sm font-medium text-red-400 ring-1 ring-red-500/30 active:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
            {t('profile.delete_account')}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                {i18n.language === 'nl' 
                  ? 'Dit verwijdert al je trainingsdata, instellingen en je account. Dit kan niet ongedaan worden gemaakt.'
                  : 'This will delete all your training data, settings and account. This cannot be undone.'}
              </p>
            </div>
            
            {deleteError && (
              <p className="text-sm text-red-400">{deleteError}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteError(null)
                }}
                disabled={deleting}
                className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-medium text-gray-300 active:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white active:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting 
                  ? (i18n.language === 'nl' ? 'Verwijderen...' : 'Deleting...') 
                  : (i18n.language === 'nl' ? 'Ja, verwijder alles' : 'Yes, delete everything')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
