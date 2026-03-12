import { useState, useEffect, useMemo } from 'react'
import { Save, Check } from 'lucide-react'
import { getSettings, saveSettings } from '../lib/settings'
import { useWorkouts } from '../hooks/useWorkouts'

const GOALS = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
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

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

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

      {/* Units */}
      <div className="mb-8">
        <label className="mb-2 block text-sm font-medium text-gray-300">Units</label>
        <div className="flex gap-2">
          {['kg', 'lbs'].map(u => (
            <button
              key={u}
              onClick={() => update('units', u)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium uppercase transition-colors ${
                settings.units === u
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-bold text-white active:scale-[0.97] transition-transform"
      >
        {saved ? (
          <>
            <Check size={18} />
            Saved
          </>
        ) : (
          <>
            <Save size={18} />
            Save Settings
          </>
        )}
      </button>

      {/* Stats summary */}
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Stats</h2>
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
            <span className="text-sm font-medium text-white">
              {(stats.totalVol / 1000).toFixed(1)} tons
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
