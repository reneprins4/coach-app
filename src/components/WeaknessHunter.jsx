import { useState, useMemo } from 'react'
import { AlertTriangle, Target, TrendingDown } from 'lucide-react'
import { analyzeWeaknesses } from '../lib/weaknessHunter'

const MG_COLORS = {
  chest: '#ef4444',
  back: '#3b82f6', 
  legs: '#22c55e',
  shoulders: '#eab308',
  arms: '#a855f7',
  core: '#06b6d4'
}

export default function WeaknessHunter({ workouts }) {
  const [weeksBack, setWeeksBack] = useState(4)
  
  const analysis = useMemo(() => {
    return analyzeWeaknesses(workouts, weeksBack)
  }, [workouts, weeksBack])
  
  const maxSets = Math.max(...analysis.sortedGroups.map(g => g.sets), 1)
  
  // Bepaal bar kleur op basis van volume (relative to max)
  function getBarColor(sets, key) {
    const ratio = sets / maxSets
    if (ratio >= 0.5) return MG_COLORS[key] || '#22c55e' // Spiergroep kleur
    if (ratio >= 0.25) return '#f59e0b' // Oranje - weinig
    return '#ef4444' // Rood - heel weinig
  }
  
  if (!analysis.hasEnoughData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target size={48} className="mb-4 text-gray-600" />
        <h3 className="mb-2 text-lg font-semibold text-gray-300">Te weinig data</h3>
        <p className="text-sm text-gray-500">
          Train minimaal 2 keer in de laatste {weeksBack} weken voor balans analyse.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Spiergroep Balans</h2>
          <p className="text-xs text-gray-500">
            {analysis.workoutCount} workouts, {analysis.totalSets} sets
          </p>
        </div>
      </div>
      
      {/* Week selector */}
      <div className="flex gap-2">
        {[2, 4, 8].map(w => (
          <button
            key={w}
            onClick={() => setWeeksBack(w)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              weeksBack === w
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {w} weken
          </button>
        ))}
      </div>
      
      {/* Volume bars */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">Volume per spiergroep</h3>
        <div className="space-y-3">
          {analysis.sortedGroups.map(group => (
            <div key={group.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-gray-300">{group.name}</span>
                <span className="text-sm font-medium text-white">{group.sets} sets</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(group.sets / maxSets) * 100}%`,
                    backgroundColor: getBarColor(group.sets, group.key),
                    minWidth: group.sets > 0 ? '4px' : '0'
                  }}
                />
              </div>
              <div className="mt-0.5 text-right text-[10px] text-gray-600">
                {group.percentage}% van totaal
              </div>
            </div>
          ))}
        </div>
        
        {/* Legende */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-800 pt-3">
          {analysis.sortedGroups.map(group => (
            <div key={group.key} className="flex items-center gap-1.5">
              <div 
                className="h-2.5 w-2.5 rounded-full" 
                style={{ backgroundColor: MG_COLORS[group.key] }} 
              />
              <span className="text-[10px] text-gray-400">{group.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Imbalances */}
      {analysis.imbalances.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="text-sm font-semibold text-red-400">Aandacht nodig</h3>
          </div>
          <div className="space-y-3">
            {analysis.imbalances.map((imb, idx) => (
              <div 
                key={idx}
                className={`rounded-lg p-3 ${
                  imb.severity === 'high' 
                    ? 'border border-red-500/30 bg-red-500/10' 
                    : 'border border-yellow-500/20 bg-yellow-500/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <TrendingDown 
                    size={16} 
                    className={imb.severity === 'high' ? 'mt-0.5 text-red-400' : 'mt-0.5 text-yellow-400'} 
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">
                      Je <span className="font-semibold text-white">{imb.weakNL}</span> krijgt{' '}
                      <span className={imb.severity === 'high' ? 'font-bold text-red-400' : 'font-bold text-yellow-400'}>
                        {imb.deficit}% minder
                      </span>{' '}
                      volume dan je {imb.dominantNL}.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {imb.dominantNL}: {imb.dominantSets} sets vs {imb.weakNL}: {imb.weakSets} sets
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {imb.advice}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Geen imbalances */}
      {analysis.imbalances.length === 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-green-500" />
            <div>
              <h3 className="text-sm font-semibold text-green-400">Goede balans</h3>
              <p className="text-xs text-gray-500">
                Geen significante imbalances gedetecteerd in de laatste {weeksBack} weken.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
