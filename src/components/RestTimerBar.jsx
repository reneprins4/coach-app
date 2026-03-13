import { X } from 'lucide-react'

export default function RestTimerBar({ remaining, total, onStop }) {
  const progress = total > 0 ? (total - remaining) / total : 0

  return (
    <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold text-red-500">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          <span className="text-sm text-gray-500">rest</span>
        </div>
        <button onClick={onStop} className="p-2 text-gray-500 active:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-red-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
