import { useState } from 'react'
import { Check, BookmarkPlus, Loader2 } from 'lucide-react'

export default function FinishModal({ result, onClose, onSaveTemplate }) {
  const duration = result.duration || 0
  const mins = Math.floor(duration / 60)
  
  const [showTemplateInput, setShowTemplateInput] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveTemplate() {
    if (!templateName.trim() || saving) return
    setSaving(true)
    try {
      await onSaveTemplate(templateName.trim())
      setSaved(true)
      setShowTemplateInput(false)
    } catch (err) {
      console.error('Failed to save template:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <Check size={32} className="text-red-500" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-white">Training voltooid</h2>
        <p className="mb-6 text-sm text-gray-400">Geweldige sessie</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{mins}</p>
            <p className="text-[10px] text-gray-500">minuten</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{formatVol(result.totalVolume)}</p>
            <p className="text-[10px] text-gray-500">volume</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{result.exerciseNames?.length || 0}</p>
            <p className="text-[10px] text-gray-500">oefeningen</p>
          </div>
        </div>

        {result.exerciseNames?.length > 0 && (
          <p className="mb-6 text-sm text-gray-400">
            {result.exerciseNames.join(', ')}
          </p>
        )}

        {/* Save as template section */}
        {onSaveTemplate && !saved && (
          <div className="mb-4">
            {!showTemplateInput ? (
              <button
                onClick={() => setShowTemplateInput(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700 hover:bg-gray-800"
              >
                <BookmarkPlus size={16} />
                Opslaan als template
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template naam (bijv. Push Day)"
                  className="h-10 w-full rounded-xl bg-gray-800 px-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-700 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplateInput(false)}
                    className="h-10 flex-1 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700"
                  >
                    Annuleer
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || saving}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-800 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
                    Opslaan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {saved && (
          <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-2 text-sm text-green-400">
            ✓ Template opgeslagen
          </div>
        )}

        <button
          onClick={onClose}
          className="h-12 w-full rounded-xl bg-red-500 font-bold text-white active:scale-[0.97] transition-transform"
        >
          Klaar
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
