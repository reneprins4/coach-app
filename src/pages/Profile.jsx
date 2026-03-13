import { useState, useMemo } from 'react'
import { Save, Check } from 'lucide-react'
import { getSettings, saveSettings } from '../lib/settings'
import { useWorkouts } from '../hooks/useWorkouts'

const GOALS = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
]

const LEVELS = [
  { value: 'beginner', label: 'Beginner', sub: '< 1 year' },
  { value: 'intermediate', label: 'Intermediate', sub: '1-3 years' },
  { value: 'advanced', label: 'Advanced', sub: '3+ years' },
]

const EQUIPMENT = [
  { value: 'full_gym', label: 'Full gym' },
  { value: 'home_gym', label: 'Home gym' },
  { value: 'dumbbells_only', label: 'Dumbbells' },
]

const FREQUENCIES = ['3x', '4x', '5x', '6x']
const REST_TIMES = [60, 90, 120, 180]

export default function Profile() {
  const [settings, setSettings] = useState(getSettings)
  const [saved, setSaved] = useState(false)
  const { workouts } = useWorkouts()

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const stats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalVol = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0)
    const memberSince = settings.memberSince
      ? new Date(settings.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Today'
    return { totalWorkouts, totalVol, memberSince }
  }, [workouts, settings.memberSince])

  const profileComplete = settings.name && settings.bodyweight && settings.experienceLevel

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Profile</h1>
      <p className="mb-6 text-sm text-gray-500">Your coach needs this to personalize workouts</p>

      {!profileComplete && (
        <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
          Fill in your details below so the AI coach can suggest accurate weights
        </div>
      )}

      {/* Name */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Name</label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Your name"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {/* Bodyweight */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Bodyweight (kg)</label>
        <input
          type="number"
          value={settings.bodyweight}
          onChange={(e) => update('bodyweight', e.target.value)}
          placeholder="e.g. 80"
          className="h-12 w-full rounded-xl bg-gray-900 px-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
        <p className="mt-1 text-xs text-gray-600">Used to estimate starting weights for new exercises</p>
      </div>

      {/* Experience level */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Experience level</label>
        <div className="flex gap-2">
          {LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => update('experienceLevel', l.value)}
              className={`flex flex-1 flex-col items-center rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.experienceLevel === l.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              <span>{l.label}</span>
              <span className={`text-[10px] ${settings.experienceLevel === l.value ? 'text-orange-200' : 'text-gray-600'}`}>{l.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Training goal */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Training goal</label>
        <div className="flex gap-2">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => update('goal', g.value)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.goal === g.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Equipment</label>
        <div className="flex gap-2">
          {EQUIPMENT.map(e => (
            <button
              key={e.value}
              onClick={() => update('equipment', e.value)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.equipment === e.value
                  ? 'bg-orange-500 text-white'
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Known 1RM estimates <span className="text-gray-600 font-normal">(optional)</span></label>
        <p className="mb-3 text-xs text-gray-600">Helps the AI start at the right weights. Leave blank if unknown.</p>
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Training frequency</label>
        <div className="flex gap-2">
          {FREQUENCIES.map(f => (
            <button
              key={f}
              onClick={() => update('frequency', f)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.frequency === f
                  ? 'bg-orange-500 text-white'
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
        <label className="mb-2 block text-sm font-medium text-gray-300">Default rest time</label>
        <div className="flex gap-2">
          {REST_TIMES.map(t => (
            <button
              key={t}
              onClick={() => update('restTime', t)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                settings.restTime === t
                  ? 'bg-orange-500 text-white'
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
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-bold text-white active:scale-[0.97] transition-transform"
      >
        {saved ? <><Check size={20} /> Saved</> : <><Save size={20} /> Save Profile</>}
      </button>

      {/* Stats summary */}
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Training Stats</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Member since</span>
            <span className="text-sm font-medium text-white">{stats.memberSince}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Total workouts</span>
            <span className="text-sm font-medium text-white">{stats.totalWorkouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Total volume</span>
            <span className="text-sm font-medium text-white">{(stats.totalVol / 1000).toFixed(1)} tons</span>
          </div>
        </div>
      </div>
    </div>
  )
}
