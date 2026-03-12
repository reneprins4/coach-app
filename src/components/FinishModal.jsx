import { Check } from 'lucide-react'

export default function FinishModal({ result, onClose }) {
  const duration = result.duration || 0
  const mins = Math.floor(duration / 60)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
          <Check size={32} className="text-orange-500" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-white">Workout Complete</h2>
        <p className="mb-6 text-sm text-gray-400">Great session</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{mins}</p>
            <p className="text-[10px] text-gray-500">minutes</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{formatVol(result.totalVolume)}</p>
            <p className="text-[10px] text-gray-500">volume</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{result.exerciseNames?.length || 0}</p>
            <p className="text-[10px] text-gray-500">exercises</p>
          </div>
        </div>

        {result.exerciseNames?.length > 0 && (
          <p className="mb-6 text-sm text-gray-400">
            {result.exerciseNames.join(', ')}
          </p>
        )}

        <button
          onClick={onClose}
          className="h-12 w-full rounded-xl bg-orange-500 font-bold text-white active:scale-[0.97] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
