import { X, Trash2, Play, Dumbbell } from 'lucide-react'

export default function TemplateLibrary({ templates, onLoad, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70">
      <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-gray-900 pb-8">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-5 py-4">
          <h2 className="text-lg font-bold text-white">Workout Templates</h2>
          <button onClick={onClose} className="p-2 text-gray-500 active:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Template list */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {templates.length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">Nog geen templates</p>
              <p className="mt-1 text-sm text-gray-600">
                Sla een training op als template om hem hier te zien
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                // Parse exercises
                let exercises = template.exercises
                if (typeof exercises === 'string') {
                  try {
                    exercises = JSON.parse(exercises)
                  } catch {
                    exercises = []
                  }
                }

                return (
                  <div
                    key={template.id}
                    className="rounded-xl border border-gray-800 bg-gray-800/50 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white">{template.name}</h3>
                        <p className="text-xs text-gray-500">
                          {exercises.length} oefeningen
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onDelete(template.id)}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-700 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Exercise preview */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {exercises.slice(0, 4).map((ex, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
                        >
                          {ex.name}
                        </span>
                      ))}
                      {exercises.length > 4 && (
                        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                          +{exercises.length - 4}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onLoad(template)}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-500 font-semibold text-white active:scale-[0.97] transition-transform"
                    >
                      <Play size={16} />
                      Laden
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
