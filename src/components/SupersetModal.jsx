import { useState, useMemo } from 'react'
import { X, Zap, Clock, ArrowRight, Check } from 'lucide-react'
import { buildSupersets, calculateTimeSavings } from '../lib/supersetArchitect'

export default function SupersetModal({ exercises, onApply, onClose }) {
  const [confirmed, setConfirmed] = useState(false)
  
  const savings = useMemo(() => calculateTimeSavings(exercises), [exercises])
  const { supersets, normalMinutes, supersetMinutes, savedMinutes, savedPercent, hasSupersets } = savings
  
  function handleApply() {
    // Flatten supersets terug naar oefeningen in de juiste volgorde
    const reorderedExercises = []
    for (const group of supersets) {
      for (const ex of group.exercises) {
        reorderedExercises.push({
          ...ex,
          _supersetGroup: group.type === 'superset' ? supersets.indexOf(group) : null,
          _supersetPartner: group.type === 'superset' 
            ? group.exercises.find(e => e.name !== ex.name)?.name 
            : null,
        })
      }
    }
    onApply(reorderedExercises, supersets)
  }
  
  if (!hasSupersets) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Superset Architect</h3>
            <button onClick={onClose} className="p-1 text-gray-500">
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Zap size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400">
              Geen antagonist pairs gevonden in je huidige workout. 
              Supersets werken het best met tegengestelde spiergroepen 
              (bijv. borst + rug, biceps + triceps).
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="h-12 w-full rounded-xl bg-gray-800 font-medium text-white active:bg-gray-700"
          >
            Sluiten
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-red-500" />
              <h3 className="text-lg font-bold text-white">Superset Architect</h3>
            </div>
            <button onClick={onClose} className="p-1 text-gray-500">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Time savings banner */}
        <div className="border-b border-gray-800 bg-red-500/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-red-400" />
              <div>
                <p className="text-sm text-gray-400">Geschatte tijdwinst</p>
                <p className="text-xl font-bold text-red-400">-{savedMinutes} min ({savedPercent}%)</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500">{normalMinutes} min</p>
              <p className="text-gray-400">naar {supersetMinutes} min</p>
            </div>
          </div>
        </div>
        
        {/* Superset plan */}
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
            Superset plan
          </p>
          
          <div className="space-y-3">
            {supersets.map((group, idx) => (
              <SupersetGroup key={idx} group={group} index={idx} />
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="sticky bottom-0 border-t border-gray-800 bg-gray-900 p-5">
          {!confirmed ? (
            <button
              onClick={() => setConfirmed(true)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-lg font-bold text-white active:scale-[0.98] transition-transform"
            >
              <Zap size={20} />
              Activeer superset modus
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-gray-400">
                De oefeningen worden gegroepeerd voor supersets.
                Wissel tussen A en B zonder rust, rust na elke ronde.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmed(false)}
                  className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
                >
                  Annuleer
                </button>
                <button
                  onClick={handleApply}
                  className="h-12 flex-1 rounded-xl bg-red-500 font-bold text-white active:scale-[0.97] transition-transform"
                >
                  Bevestig
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SupersetGroup({ group, index }) {
  if (group.type === 'superset') {
    const [a, b] = group.exercises
    const setsA = a.plan?.sets || a.sets || 3
    const setsB = b.plan?.sets || b.sets || 3
    
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            SUPERSET
          </span>
          <span className="text-xs text-gray-500">{group.pairReason}</span>
        </div>
        
        <div className="space-y-2">
          {/* Exercise A */}
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">
              A
            </span>
            <div className="flex-1">
              <p className="font-medium text-white">{a.name}</p>
              <p className="text-xs text-gray-500">{setsA} sets</p>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="flex items-center gap-2 pl-3">
            <ArrowRight size={14} className="text-gray-600" />
            <span className="text-xs text-gray-600">direct door naar</span>
          </div>
          
          {/* Exercise B */}
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">
              B
            </span>
            <div className="flex-1">
              <p className="font-medium text-white">{b.name}</p>
              <p className="text-xs text-gray-500">{setsB} sets</p>
            </div>
          </div>
          
          {/* Rest indicator */}
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-400">
              {group.restAfter} sec rust na elke ronde
            </span>
          </div>
        </div>
      </div>
    )
  }
  
  // Single exercise
  const ex = group.exercises[0]
  const sets = ex.plan?.sets || ex.sets || 3
  
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-white">{ex.name}</p>
          <p className="text-xs text-gray-500">{sets} sets - {group.restAfter} sec rust</p>
        </div>
        <span className="text-xs text-gray-600">Solo</span>
      </div>
    </div>
  )
}
