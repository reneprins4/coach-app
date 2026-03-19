import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Youtube, ChevronRight, AlertCircle, Lightbulb, Dumbbell } from 'lucide-react'
import { getExerciseGuide } from '../lib/anthropic'

export default function ExerciseGuide({ exercise, onClose }) {
  const { t } = useTranslation()
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const flipRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getExerciseGuide(exercise.name)
      .then(data => {
        if (!cancelled) {
          setGuide(data)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message || 'Fout bij laden')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [exercise.name])

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' uitvoering techniek')}`
  const hasBothImages = exercise.image_url_0 && exercise.image_url_1

  // Flip animation: alternate between start and end position every 1.5s
  useEffect(() => {
    if (!hasBothImages) return
    flipRef.current = setInterval(() => {
      setActiveImg(prev => prev === 0 ? 1 : 0)
    }, 1500)
    return () => clearInterval(flipRef.current)
  }, [hasBothImages])

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full rounded-t-3xl bg-gray-950 border-t border-gray-800 px-5 pb-10 pt-5 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-700" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{exercise.name}</h2>
            {exercise.muscle_group && (
              <p className="text-xs capitalize text-cyan-400 mt-0.5">{exercise.muscle_group}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-500 active:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Exercise images — animated flip between start and end position */}
        {(exercise.image_url_0 || exercise.image_url_1) && (
          <div className="mb-5 relative overflow-hidden rounded-2xl bg-gray-800 aspect-video">
            {/* Start position */}
            {exercise.image_url_0 && (
              <img
                src={exercise.image_url_0}
                alt={`${exercise.name} start`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${activeImg === 0 ? 'opacity-100' : 'opacity-0'}`}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            {/* End position */}
            {exercise.image_url_1 && (
              <img
                src={exercise.image_url_1}
                alt={`${exercise.name} end`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${activeImg === 1 ? 'opacity-100' : 'opacity-0'}`}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            {/* Position indicator */}
            {hasBothImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${activeImg === 0 ? 'bg-white' : 'bg-white/40'}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${activeImg === 1 ? 'bg-white' : 'bg-white/40'}`} />
              </div>
            )}
            {/* Label */}
            <div className="absolute top-2 left-2 rounded-md bg-black/50 px-2 py-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                {activeImg === 0 ? 'Start' : 'Eind'}
              </span>
            </div>
          </div>
        )}

        {/* YouTube button - always visible */}
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 flex w-full items-center justify-between rounded-2xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Youtube size={20} className="text-cyan-400" />
            <span className="text-sm font-semibold text-white">{t('exercise_guide.youtube')}</span>
          </div>
          <ChevronRight size={16} className="text-gray-500" />
        </a>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
            <p className="text-sm text-gray-500">{t('exercise_guide.loading')}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-center text-sm text-cyan-400 py-6">{error}</p>
        )}

        {/* Guide content */}
        {guide && !loading && (
          <div className="space-y-5">
            {/* Steps */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t('exercise_guide.execution')}</p>
              <div className="space-y-2">
                {guide.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-200 leading-snug">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Muscles */}
            {guide.muscles?.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t('exercise_guide.muscles')}</p>
                <div className="flex flex-wrap gap-2">
                  {guide.muscles.map((m, i) => (
                    <span key={i} className="rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-300 flex items-center gap-1.5">
                      <Dumbbell size={10} className="text-gray-500" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mistakes */}
            {guide.mistakes?.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t('exercise_guide.common_mistakes')}</p>
                <div className="space-y-1.5">
                  {guide.mistakes.map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="text-sm text-gray-300">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Golden tip */}
            {guide.tip && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-400" />
                <p className="text-sm text-amber-200">{guide.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
