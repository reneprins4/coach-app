import { useState, useMemo } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getPrGoals, addPrGoal, removePrGoal, type PrGoal } from '../lib/prGoals'
import { useExercises, type ExerciseLibraryEntry } from '../hooks/useExercises'

const MAX_GOALS = 5

export default function PrGoalsSection() {
  const { t } = useTranslation()
  const [goals, setGoals] = useState<PrGoal[]>(getPrGoals)
  const [showForm, setShowForm] = useState(false)

  function refresh() {
    setGoals(getPrGoals())
  }

  function handleRemove(exercise: string) {
    removePrGoal(exercise)
    refresh()
  }

  function handleAdd(exercise: string, targetKg: number, targetDate: string | null) {
    const result = addPrGoal({ exercise, targetKg, targetDate })
    if (result) {
      refresh()
      setShowForm(false)
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="label-caps">{t('pr_goals.title')}</p>
        {goals.length < MAX_GOALS && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-cyan-400 active:text-cyan-300"
          >
            <Plus size={14} />
            {t('pr_goals.add')}
          </button>
        )}
      </div>

      {goals.length === 0 && !showForm && (
        <p className="text-xs text-[var(--text-3)]">{t('pr_goals.no_goals')}</p>
      )}

      {goals.length >= MAX_GOALS && (
        <p className="mb-2 text-xs text-amber-400/70">{t('pr_goals.max_reached')}</p>
      )}

      {/* Goal list */}
      <div className="space-y-2">
        {goals.map(goal => (
          <PrGoalCard key={goal.exercise} goal={goal} onRemove={handleRemove} />
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <AddGoalForm
          existingNames={goals.map(g => g.exercise)}
          onAdd={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ── Goal card with progress bar ──

function PrGoalCard({ goal, onRemove }: { goal: PrGoal; onRemove: (exercise: string) => void }) {
  const { t } = useTranslation()
  const daysLeft = goal.targetDate
    ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-white">{goal.exercise}</p>
        <div className="flex items-center gap-2">
          {daysLeft !== null && (
            <span className="text-[10px] font-medium text-[var(--text-3)]">
              {t('pr_goals.days_left', { days: daysLeft })}
            </span>
          )}
          <button
            onClick={() => onRemove(goal.exercise)}
            className="text-[var(--text-3)] active:text-red-400"
            aria-label={`${t('pr_goals.remove')} ${goal.exercise}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-1 text-xs text-[var(--text-3)]">
        <span className="font-bold tabular text-cyan-400">{goal.targetKg}</span>
        <span>kg</span>
      </div>
    </div>
  )
}

// ── Add goal form with exercise autocomplete ──

function AddGoalForm({
  existingNames,
  onAdd,
  onCancel,
}: {
  existingNames: string[]
  onAdd: (exercise: string, targetKg: number, targetDate: string | null) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { exercises } = useExercises()
  const [query, setQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [targetKg, setTargetKg] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const lower = query.toLowerCase()
    return exercises
      .filter((e: ExerciseLibraryEntry) =>
        e.name.toLowerCase().includes(lower) && !existingNames.includes(e.name)
      )
      .slice(0, 8)
  }, [query, exercises, existingNames])

  function handleSelectSuggestion(name: string) {
    setSelectedExercise(name)
    setQuery(name)
    setShowSuggestions(false)
    setError(null)
  }

  function handleSubmit() {
    const exercise = selectedExercise || query.trim()
    if (!exercise) return
    const kg = parseFloat(targetKg)
    if (!kg || kg <= 0) return

    if (existingNames.includes(exercise)) {
      setError(t('pr_goals.duplicate'))
      return
    }

    onAdd(exercise, kg, targetDate || null)
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">{t('pr_goals.add')}</p>
        <button onClick={onCancel} className="text-[var(--text-3)] active:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Exercise name with autocomplete */}
      <div className="relative">
        <label htmlFor="pr-goal-exercise" className="label-caps mb-1 block">{t('pr_goals.exercise')}</label>
        <input
          id="pr-goal-exercise"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedExercise('')
            setShowSuggestions(true)
            setError(null)
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Pull-up, Leg Press..."
          className="h-10 w-full rounded-xl px-3 text-sm text-white placeholder-[var(--text-3)] outline-none"
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg">
            {suggestions.map((ex: ExerciseLibraryEntry) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectSuggestion(ex.name)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-white/[0.06] active:bg-white/[0.08]"
              >
                <span className="font-medium">{ex.name}</span>
                <span className="text-[10px] text-[var(--text-3)]">{ex.muscle_group}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Target weight */}
      <div>
        <label htmlFor="pr-goal-target" className="label-caps mb-1 block">{t('pr_goals.target')}</label>
        <input
          id="pr-goal-target"
          type="number"
          value={targetKg}
          onChange={(e) => setTargetKg(e.target.value)}
          placeholder="100"
          className="h-10 w-full rounded-xl px-3 text-sm text-white placeholder-[var(--text-3)] outline-none"
        />
      </div>

      {/* Optional target date */}
      <div>
        <label htmlFor="pr-goal-date" className="label-caps mb-1 block">{t('pr_goals.date')}</label>
        <input
          id="pr-goal-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="h-10 w-full rounded-xl px-3 text-sm text-white placeholder-[var(--text-3)] outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!query.trim() || !targetKg}
        className="btn-primary w-full text-sm disabled:opacity-40"
      >
        {t('pr_goals.add')}
      </button>
    </div>
  )
}
