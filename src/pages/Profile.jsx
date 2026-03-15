import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Save, Check, LogOut, Trash2, AlertTriangle, Download } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { supabase } from '../lib/supabase'

const GOALS = [
  {
    value: 'hypertrophy',
    label: 'Spieren opbouwen',
    sub: 'Meer spiermassa en een sterk lichaam',
  },
  {
    value: 'strength',
    label: 'Sterker worden',
    sub: 'Meer gewicht tillen, meer kracht',
  },
  {
    value: 'endurance',
    label: 'Conditie & uithoudingsvermogen',
    sub: 'Langer vol kunnen houden',
  },
]

const LEVELS = [
  { value: 'beginner', label: 'Beginner', sub: '< 1 jaar' },
  { value: 'intermediate', label: 'Gemiddeld', sub: '1-3 jaar' },
  { value: 'advanced', label: 'Gevorderd', sub: '3+ jaar' },
]

const EQUIPMENT = [
  { value: 'full_gym', label: 'Volledige gym' },
  { value: 'home_gym', label: 'Thuisgym' },
  { value: 'dumbbells_only', label: 'Dumbbells' },
]

const FREQUENCIES = ['2x', '3x', '4x', '5x', '6x']
const REST_TIMES = [60, 90, 120, 180]

export default function Profile() {
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
        throw new Error('Geen geldige sessie gevonden')
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
        throw new Error(data.error || 'Account verwijderen mislukt')
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
    const memberSince = settings.memberSince
      ? new Date(settings.memberSince).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
      : 'Vandaag'
    return { totalWorkouts, totalVol, memberSince }
  }, [workouts, settings.memberSince])

  const profileComplete = settings.name && settings.bodyweight && settings.experienceLevel

  function exportWorkoutsCSV() {
    const rows = [['Datum', 'Training ID', 'Oefening', 'Gewicht (kg)', 'Herhalingen', 'RPE', 'Volume (kg)']]
    
    for (const w of workouts) {
      const date = new Date(w.created_at).toLocaleDateString('nl-NL')
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
        <h1 className="text-3xl font-black tracking-tight">Profiel</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-gray-900 hover:text-white"
        >
          <LogOut size={16} />
          {loggingOut ? 'Uitloggen...' : 'Uitloggen'}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        {user?.email && <span>{user.email}</span>}
      </p>

      {!profileComplete && (
        <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400">
          Vul je gegevens in voor nauwkeurigere gewichten
        </div>
      )}

      {/* Name */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Naam</label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Jouw naam"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {/* Bodyweight */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Gewicht (kg)</label>
        <input
          type="number"
          value={settings.bodyweight}
          onChange={(e) => update('bodyweight', e.target.value)}
          placeholder="80"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
        <p className="mt-1 text-xs text-gray-600">Helpt bij het schatten van startgewichten</p>
      </div>

      {/* Ervaringsniveau */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Niveau</label>
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

      {/* Trainingsdoel */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Doel</label>
        <p className="mb-3 text-xs text-gray-500">Wat wil je bereiken? De coach past je trainingen hierop aan.</p>
        <div className="flex flex-col gap-2">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => update('goal', g.value)}
              className={`flex items-center gap-4 rounded-2xl p-4 text-left transition-colors ${
                settings.goal === g.value
                  ? 'bg-cyan-500/15 ring-1 ring-cyan-500'
                  : 'bg-gray-900 ring-1 ring-gray-800 active:bg-gray-800'
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm font-semibold ${settings.goal === g.value ? 'text-cyan-400' : 'text-white'}`}>
                  {g.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{g.sub}</p>
              </div>
              {settings.goal === g.value && (
                <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Uitrusting</label>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Bekende 1RM schattingen <span className="text-gray-600 font-normal">(optioneel)</span></label>
        <p className="mb-3 text-xs text-gray-600">Helpt de AI met de juiste startgewichten. Leeg laten indien onbekend.</p>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Hoe vaak?</label>
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
              {f}/wk
            </button>
          ))}
        </div>
      </div>

      {/* Rest time */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Rustpauze</label>
        <div className="flex gap-2">
          {REST_TIMES.map(t => (
            <button
              key={t}
              onClick={() => update('restTime', t)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.restTime === t
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Trainingen', value: stats.totalWorkouts },
          { label: 'Volume', value: `${(stats.totalVol/1000).toFixed(1)}t` },
          { label: 'Lid sinds', value: stats.memberSince },
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
        className="btn-primary"
      >
        {saved ? 'Opgeslagen' : 'Opslaan'}
      </button>

      {/* Data export */}
      <div className="mt-6">
        <button
          onClick={exportWorkoutsCSV}
          disabled={workouts.length === 0}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-left text-sm text-gray-300 ring-1 ring-gray-800 hover:ring-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:ring-gray-800"
        >
          <Download size={18} className="text-gray-500" />
          <div className="flex-1">
            <div>Exporteer trainingsdata</div>
            <div className="text-xs text-gray-500">
              {workouts.length === 0 ? 'Nog geen trainingsdata' : `${workouts.length} trainingen beschikbaar`}
            </div>
          </div>
        </button>
      </div>

      {/* Privacy & Terms links */}
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/privacy" className="text-xs text-gray-500 hover:text-gray-400">Privacybeleid</Link>
        <Link to="/terms" className="text-xs text-gray-500 hover:text-gray-400">Gebruiksvoorwaarden</Link>
      </div>

      {/* Account verwijderen */}
      <div className="mt-8 rounded-2xl p-4" style={{background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(239,68,68,0.10)'}}>
        <h2 className="mb-2 text-sm font-semibold text-red-400">Gevarenzone</h2>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-sm font-medium text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
            Verwijder mijn account
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                Dit verwijdert al je trainingsdata, instellingen en je account. Dit kan niet ongedaan worden gemaakt.
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
                className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Verwijderen...' : 'Ja, verwijder alles'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
