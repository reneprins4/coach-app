import { useTranslation } from 'react-i18next'
import { X, Trash2, Play, Dumbbell } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import type { TemplateLibraryProps } from '../types'

export default function TemplateLibrary({ templates, onLoad, onDelete, onClose }: TemplateLibraryProps) {
  const { t } = useTranslation()
  useModalA11y(true, onClose)
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="template-library-title" className="w-full max-w-lg animate-slide-up rounded-t-2xl bg-gray-900 pb-8">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-5 py-4">
          <h2 id="template-library-title" className="text-lg font-bold text-white">{t('template_library.title')}</h2>
          <button onClick={onClose} aria-label={t('common.close') || 'Close'} className="p-2 text-gray-500 active:text-white min-h-[44px] min-w-[44px]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Template list */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {templates.length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">{t('template_library.no_templates')}</p>
              <p className="mt-1 text-sm text-gray-600">
                {t('template_library.no_templates_sub')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                // Parse exercises
                let exercises: Array<{ name: string; [key: string]: unknown }> = Array.isArray(template.exercises) ? template.exercises : []
                if (typeof template.exercises === 'string') {
                  try {
                    exercises = JSON.parse(template.exercises)
                  } catch {
                    exercises = []
                  }
                }

                return (
                  <div
                    key={template.id}
                    className="card"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white">{template.name}</h3>
                        <p className="text-xs text-gray-500">
                          {exercises.length} {t('template_library.exercises')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onDelete(template.id)}
                          aria-label={`${t('common.delete') || 'Delete'} ${template.name}`}
                          className="rounded-lg p-2 text-gray-600 active:bg-gray-700 active:text-cyan-400 min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 size={16} aria-hidden="true" />
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
                      className="btn-primary h-11 text-sm"
                    >
                      <Play size={16} />
                      {t('template_library.load')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
