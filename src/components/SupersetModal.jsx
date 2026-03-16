import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { buildSupersets, calculateTimeSavings } from '../lib/supersetArchitect'

export default function SupersetModal({ exercises, onApply, onClose }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  const savings = useMemo(() => calculateTimeSavings(exercises), [exercises])
  const { supersets, normalMinutes, supersetMinutes, savedMinutes, savedPercent, hasSupersets } = savings

  function handleApply() {
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
        <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">{t('superset_modal.title')}</h3>
              <p className="mt-0.5 label-caps">{t('superset_modal.no_pairs')}</p>
            </div>
            <button onClick={onClose} className="text-gray-600 active:text-gray-400">
              <X size={20} />
            </button>
          </div>
          <p className="mb-6 text-sm text-gray-400 leading-relaxed">
            {t('superset_modal.antagonist_hint')}
          </p>
          <button onClick={onClose} className="btn-secondary">{t('superset_modal.close')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
      <div className="max-h-[88vh] w-full max-w-sm flex flex-col rounded-2xl bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-800 shrink-0">
          <div>
            <h3 className="text-xl font-black tracking-tight text-white">{t('superset_modal.title')}</h3>
            <p className="mt-1 label-caps text-cyan-500">
              -{savedMinutes} min · {savedPercent}% {t('superset_modal.faster')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 active:text-gray-400 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Plan */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {supersets.map((group, idx) => (
            <GroupCard key={idx} group={group} index={idx} t={t} />
          ))}
        </div>

        {/* Action */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          {!confirmed ? (
            <button
              onClick={() => setConfirmed(true)}
              className="btn-primary"
            >
              {t('superset_modal.activate')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-gray-500 leading-relaxed">
                {t('superset_modal.swap_hint')}. {t('superset_modal.rest_complete')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmed(false)}
                  className="btn-secondary flex-1"
                  style={{ height: '3rem' }}
                >
                  {t('superset_modal.back')}
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 h-12 rounded-2xl bg-cyan-500 font-bold text-white active:scale-[0.97] transition-transform"
                >
                  {t('superset_modal.confirm')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupCard({ group, index, t }) {
  if (group.type === 'superset') {
    const a = group.exercises[0]
    const b = group.exercises[1]
    
    // Guard: need both exercises for a superset
    if (!a || !b) return null
    
    const setsA = a.plan?.sets || a.sets || 3
    const setsB = b?.plan?.sets || b?.sets || 3

    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="mb-3 label-caps text-cyan-500">{t('superset_modal.superset')}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold tracking-tight text-white">{a.name}</p>
              <p className="label-caps">{setsA} {t('common.sets')}</p>
            </div>
            <span className="label-caps text-cyan-500/60">A</span>
          </div>
          <div className="border-t border-cyan-500/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold tracking-tight text-white">{b.name}</p>
              <p className="label-caps">{setsB} {t('common.sets')}</p>
            </div>
            <span className="label-caps text-cyan-500/60">B</span>
          </div>
        </div>
        {group.restAfter && (
          <p className="mt-3 label-caps">{group.restAfter}s {t('superset_modal.rest_after')}</p>
        )}
      </div>
    )
  }

  const ex = group.exercises[0]
  const sets = ex.plan?.sets || ex.sets || 3

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-800/40 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="font-bold tracking-tight text-white">{ex.name}</p>
        <p className="label-caps">{sets} {t('common.sets')} · {group.restAfter}s {t('rest_timer.rest').toLowerCase()}</p>
      </div>
      <span className="label-caps text-gray-600">{t('superset_modal.solo')}</span>
    </div>
  )
}
