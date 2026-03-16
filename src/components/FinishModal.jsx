import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, BookmarkPlus, Loader2 } from 'lucide-react'

export default function FinishModal({ result, onClose, onSaveTemplate }) {
  const { t } = useTranslation()
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
          <Check size={32} className="text-cyan-500" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-white">{t('finish_modal.title')}</h2>
        <p className="mb-6 text-sm text-gray-400">{t('finish_modal.great_session')}</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{mins}</p>
            <p className="text-[10px] text-gray-500">{t('finish_modal.minutes')}</p>
          </div>
          <div className="rounded-2xl bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{formatVol(result.totalVolume)}</p>
            <p className="text-[10px] text-gray-500">{t('finish_modal.volume')}</p>
          </div>
          <div className="rounded-2xl bg-gray-800 p-3">
            <p className="text-lg font-bold text-white">{result.exerciseNames?.length || 0}</p>
            <p className="text-[10px] text-gray-500">{t('finish_modal.exercises_count')}</p>
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
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700 active:bg-gray-800"
              >
                <BookmarkPlus size={16} />
                {t('finish_modal.save_template')}
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('finish_modal.template_name_placeholder')}
                  className="h-10 w-full rounded-xl bg-gray-800 px-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-700 focus:ring-cyan-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplateInput(false)}
                    className="h-10 flex-1 rounded-xl text-sm font-medium text-gray-400 ring-1 ring-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || saving}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-800 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
                    {t('finish_modal.save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {saved && (
          <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-2 text-sm text-green-400">
            {t('finish_modal.template_saved')}
          </div>
        )}

        <button
          onClick={onClose}
          className="h-12 w-full rounded-xl bg-cyan-500 font-bold text-white active:scale-[0.97] transition-transform"
        >
          {t('finish_modal.done')}
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
