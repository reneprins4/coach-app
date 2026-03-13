import { useState, useMemo } from 'react'
import { Search, Award, BarChart3, TrendingUp as TrendUp } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import FormDetective from '../components/FormDetective'

function e1rm(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
const MG_COLORS = { chest: '#ef4444', back: '#3b82f6', legs: '#22c55e', shoulders: '#eab308', arms: '#a855f7', core: '#06b6d4' }
const MG_NL = { chest: 'Borst', back: 'Rug', legs: 'Benen', shoulders: 'Schouders', arms: 'Armen', core: 'Core' }

function getMuscleGroup(name) {
  const l = name.toLowerCase()
  if (/bench|chest|fly|dip|push.?up/.test(l)) return 'chest'
  if (/squat|leg|lunge|hip|calf|extension|curl(?!.*(bicep|hammer|dumbbell))/.test(l)) return 'legs'
  if (/dead|row|pull|lat|back/.test(l)) return 'back'
  if (/press(?!.*bench)|shoulder|lateral|raise|face|shrug/.test(l)) return 'shoulders'
  if (/curl|bicep|tricep|hammer|skull|pushdown/.test(l)) return 'arms'
  if (/plank|ab|crunch|core/.test(l)) return 'core'
  return 'chest'
}

export default function Progress() {
  const { user } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  const [tab, setTab] = useState('exercise') // exercise | muscle | analyse
  const [query, setQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(null)

  // All unique exercises
  const exerciseNames = useMemo(() => {
    const names = new Set()
    workouts.forEach(w => (w.workout_sets || []).forEach(s => names.add(s.exercise)))
    return [...names].sort()
  }, [workouts])

  const filteredNames = useMemo(() => {
    if (!query.trim()) return exerciseNames
    const lower = query.toLowerCase()
    return exerciseNames.filter(n => n.toLowerCase().includes(lower))
  }, [exerciseNames, query])

  // Exercise data
  const exerciseData = useMemo(() => {
    if (!selectedExercise) return null
    const sessions = []
    for (const w of [...workouts].reverse()) {
      const sets = (w.workout_sets || []).filter(s => s.exercise === selectedExercise)
      if (sets.length === 0) continue
      const bestE1rm = Math.max(...sets.map(s => e1rm(s.weight_kg || 0, s.reps || 0)))
      const bestWeight = Math.max(...sets.map(s => s.weight_kg || 0))
      const volume = sets.reduce((s, x) => s + (x.weight_kg || 0) * (x.reps || 0), 0)
      const date = new Date(w.created_at).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })
      sessions.push({ date, e1rm: bestE1rm, bestWeight, volume, sets, fullDate: w.created_at })
    }
    const allTimeE1rm = sessions.length > 0 ? Math.max(...sessions.map(s => s.e1rm)) : 0
    return { sessions, allTimeE1rm }
  }, [workouts, selectedExercise])

  // Muscle volume data (last 4 weeks)
  const muscleData = useMemo(() => {
    const weeks = []
    const now = new Date()
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() - i * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)

      const label = `W${4 - i}`
      const entry = { week: label }

      const weekWorkouts = workouts.filter(w => {
        const d = new Date(w.created_at)
        return d >= weekStart && d < weekEnd
      })

      for (const mg of MUSCLE_GROUPS) {
        let vol = 0
        for (const w of weekWorkouts) {
          for (const s of (w.workout_sets || [])) {
            if (getMuscleGroup(s.exercise) === mg) {
              vol += (s.weight_kg || 0) * (s.reps || 0)
            }
          }
        }
        entry[mg] = Math.round(vol)
      }
      weeks.push(entry)
    }
    return weeks
  }, [workouts])

  // Overall stats
  const totalStats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalVol = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0)
    // Favorite exercise
    const counts = {}
    workouts.forEach(w => (w.workout_sets || []).forEach(s => {
      counts[s.exercise] = (counts[s.exercise] || 0) + 1
    }))
    const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return { totalWorkouts, totalVol, favorite: favorite?.[0] || '-' }
  }, [workouts])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">
      <h1 className="mb-4 text-2xl font-bold">Voortgang</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setTab('exercise')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${tab === 'exercise' ? 'bg-red-500 text-white' : 'bg-gray-900 text-gray-400'}`}
        >
          Per oefening
        </button>
        <button
          onClick={() => setTab('muscle')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${tab === 'muscle' ? 'bg-red-500 text-white' : 'bg-gray-900 text-gray-400'}`}
        >
          Spiergroepen
        </button>
        <button
          onClick={() => setTab('analyse')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${tab === 'analyse' ? 'bg-red-500 text-white' : 'bg-gray-900 text-gray-400'}`}
        >
          Analyse
        </button>
      </div>

      {tab === 'exercise' && (
        <>
          {/* Exercise selector */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedExercise(null) }}
              placeholder="Zoek oefening..."
              className="h-12 w-full rounded-xl bg-gray-900 pl-10 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800"
            />
          </div>

          {!selectedExercise && (
            <div className="space-y-1">
              {filteredNames.map(name => (
                <button
                  key={name}
                  onClick={() => { setSelectedExercise(name); setQuery(name) }}
                  className="w-full rounded-lg px-3 py-3 text-left text-sm text-white active:bg-gray-900"
                >
                  {name}
                </button>
              ))}
              {filteredNames.length === 0 && (
                <p className="py-8 text-center text-gray-500">Geen oefeningen gevonden</p>
              )}
            </div>
          )}

          {selectedExercise && exerciseData && (
            <div className="space-y-4">
              {/* PR box */}
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <Award size={24} className="text-red-500" />
                <div>
                  <p className="text-sm text-gray-400">All-time geschat 1RM</p>
                  <p className="text-2xl font-bold text-white">{exerciseData.allTimeE1rm.toFixed(1)} kg</p>
                </div>
              </div>

              {/* E1RM chart */}
              {exerciseData.sessions.length > 1 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-300">Geschat 1RM</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={exerciseData.sessions}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#9ca3af' }} />
                      <Line type="monotone" dataKey="e1rm" stroke="#F97316" strokeWidth={2} dot={{ r: 3, fill: '#F97316' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Volume chart */}
              {exerciseData.sessions.length > 1 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-300">Volume per sessie</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={exerciseData.sessions}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                      <Bar dataKey="volume" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Last 5 sessions table */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-300">Recente sessies</h3>
                <div className="space-y-2">
                  {exerciseData.sessions.slice(-5).reverse().map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2">
                      <span className="text-xs text-gray-400">{s.date}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-white">
                          {s.sets.map(x => `${x.weight_kg}x${x.reps}`).join(', ')}
                        </span>
                        <p className="text-[10px] text-gray-500">e1RM: {s.e1rm}kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'muscle' && (
        <>
          <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Volume per spiergroep (laatste 4 weken)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={muscleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                {MUSCLE_GROUPS.map(mg => (
                  <Bar key={mg} dataKey={mg} fill={MG_COLORS[mg]} stackId="a" radius={mg === 'core' ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3">
              {MUSCLE_GROUPS.map(mg => (
                <div key={mg} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MG_COLORS[mg] }} />
                  <span className="text-[10px] text-gray-400">{MG_NL[mg] || mg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overall stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
              <p className="text-xl font-bold text-white">{totalStats.totalWorkouts}</p>
              <p className="text-[10px] text-gray-500">trainingen</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
              <p className="text-xl font-bold text-white">{(totalStats.totalVol / 1000).toFixed(1)}t</p>
              <p className="text-[10px] text-gray-500">volume</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
              <p className="truncate text-sm font-bold text-white">{totalStats.favorite}</p>
              <p className="text-[10px] text-gray-500">favoriet</p>
            </div>
          </div>
        </>
      )}

      {tab === 'analyse' && (
        <FormDetective workouts={workouts} userId={user?.id} />
      )}
    </div>
  )
}
