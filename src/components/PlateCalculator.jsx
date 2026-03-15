import { useState, useMemo } from 'react'
import { X, Calculator } from 'lucide-react'

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
const BAR_WEIGHTS = [10, 15, 20]

function calculatePlates(targetWeight, barWeight) {
  const weightPerSide = (targetWeight - barWeight) / 2
  
  if (weightPerSide < 0) {
    return { plates: [], exact: true, achievable: barWeight, difference: 0 }
  }
  
  const plates = []
  let remaining = weightPerSide
  
  for (const plate of PLATES) {
    while (remaining >= plate) {
      plates.push(plate)
      remaining -= plate
    }
  }
  
  // Round remaining to avoid floating point issues
  remaining = Math.round(remaining * 100) / 100
  
  const exact = remaining === 0
  const achievedPerSide = weightPerSide - remaining
  const achievable = barWeight + achievedPerSide * 2
  
  return {
    plates,
    exact,
    achievable: Math.round(achievable * 100) / 100,
    difference: Math.round((targetWeight - achievable) * 100) / 100,
  }
}

export default function PlateCalculator({ targetWeight, onClose }) {
  const [barWeight, setBarWeight] = useState(20)
  const [customWeight, setCustomWeight] = useState(targetWeight?.toString() || '')
  
  const weight = parseFloat(customWeight) || 0
  
  const result = useMemo(() => {
    return calculatePlates(weight, barWeight)
  }, [weight, barWeight])
  
  // Group plates by count
  const groupedPlates = useMemo(() => {
    const counts = {}
    for (const plate of result.plates) {
      counts[plate] = (counts[plate] || 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
      .map(([weight, count]) => ({ weight: parseFloat(weight), count }))
  }, [result.plates])
  
  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Panel */}
      <div
        className="relative w-full rounded-t-3xl border-t border-gray-800 bg-gray-950 px-5 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-700" />
        
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={20} className="text-cyan-500" />
            <h2 className="text-lg font-bold text-white">Plate Calculator</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-500 active:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        
        {/* Weight input */}
        <div className="mb-4">
          <label className="mb-2 block label-caps">
            Totaal gewicht (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={customWeight}
            onChange={(e) => setCustomWeight(e.target.value)}
            placeholder="0"
            className="h-14 w-full rounded-xl bg-gray-900 px-4 text-center text-2xl font-bold text-white outline-none ring-1 ring-gray-800 focus:ring-cyan-500"
          />
        </div>
        
        {/* Bar weight selector */}
        <div className="mb-5">
          <label className="mb-2 block label-caps">
            Stang gewicht
          </label>
          <div className="flex gap-2">
            {BAR_WEIGHTS.map((w) => (
              <button
                key={w}
                onClick={() => setBarWeight(w)}
                className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                  barWeight === w
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                }`}
              >
                {w}kg
              </button>
            ))}
          </div>
        </div>
        
        {/* Result */}
        {weight > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            {weight < barWeight ? (
              <p className="text-center text-sm text-gray-400">
                Gewicht moet hoger zijn dan stang ({barWeight}kg)
              </p>
            ) : groupedPlates.length === 0 ? (
              <p className="text-center text-sm text-gray-400">
                Alleen de stang ({barWeight}kg)
              </p>
            ) : (
              <>
                <p className="mb-3 label-caps">
                  Per kant van de stang
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {groupedPlates.map(({ weight, count }) => (
                    <div
                      key={weight}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-500/15 px-3 py-2"
                    >
                      <span className="text-lg font-bold text-cyan-400">{count}×</span>
                      <span className="text-lg font-bold text-white">{weight}kg</span>
                    </div>
                  ))}
                </div>
                
                {!result.exact && (
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                    <p className="text-xs text-yellow-400">
                      Exacte gewicht niet haalbaar. Dichtstbijzijnde: {result.achievable}kg
                      {result.difference > 0 && ` (${result.difference}kg verschil)`}
                    </p>
                  </div>
                )}
                
                {result.exact && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      {barWeight}kg stang + 2× ({result.plates.reduce((s, p) => s + p, 0)}kg) = {weight}kg
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
