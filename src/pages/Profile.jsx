import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Check, LogOut, Trash2, AlertTriangle } from 'lucide-react'
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

const FREQUENCIES = ['3x', '4x', '5x', '6x']
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

  return (
    <div className="px-4 py-6 pb-24">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profiel</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-900 hover:text-white"
        >
          <LogOut size={16} />
          {loggingOut ? 'Uitloggen...' : 'Uitloggen'}
        </button>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {user?.email && <span className="text-gray-400">{user.email}</span>}
      </p>

      {!profileComplete && (
        <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400">
          Vul je gegevens in zodat de AI coach nauwkeurige gewichten kan voorstellen
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Lichaamsgewicht (kg)</label>
        <input
          type="number"
          value={settings.bodyweight}
          onChange={(e) => update('bodyweight', e.target.value)}
          placeholder="e.g. 80"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
        <p className="mt-1 text-xs text-gray-600">Gebruikt om startgewichten voor nieuwe oefeningen te schatten</p>
      </div>

      {/* Ervaringsniveau */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Ervaringsniveau</label>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Trainingsdoel</label>
        <p className="mb-3 text-xs text-gray-500">Wat wil je bereiken? De AI past je trainingen hier op aan.</p>
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
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">{label}</label>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Trainingsfrequentie</label>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Standaard rusttijd</label>
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

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-lg font-bold text-white active:scale-[0.97] transition-transform"
      >
        {saved ? <><Check size={20} />Opgeslagen</> : <><Save size={20} />Profiel opslaan</>}
      </button>

      {/* Stats summary */}
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Trainingsstatistieken</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Lid sinds</span>
            <span className="text-sm font-medium text-white">{stats.memberSince}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Totaal trainingen</span>
            <span className="text-sm font-medium text-white">{stats.totalWorkouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Totaal volume</span>
            <span className="text-sm font-medium text-white">{(stats.totalVol / 1000).toFixed(1)} ton</span>
          </div>
        </div>
      </div>

      {/* Account verwijderen */}
      <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <h2 className="mb-2 text-sm font-semibold text-red-400">Gevarenzone</h2>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-sm font-medium text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
            Account permanent verwijderen
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
