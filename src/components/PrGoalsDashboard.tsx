import { useTranslation } from 'react-i18next'
import { getPrGoals, type PrGoal } from '../lib/prGoals'
import { useState } from 'react'

export default function PrGoalsDashboard({ onNavigate }: { onNavigate?: () => void }) {
  const [goals] = useState<PrGoal[]>(getPrGoals)

  if (goals.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {goals.map(goal => (
        <PrGoalCompactCard key={goal.exercise} goal={goal} onClick={onNavigate} />
      ))}
    </div>
  )
}

function PrGoalCompactCard({ goal, onClick }: { goal: PrGoal; onClick?: () => void }) {
  const { t } = useTranslation()

  const daysLeft = goal.targetDate
    ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div
      onClick={onClick}
      className={`card ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">{goal.exercise}</p>
        {daysLeft !== null && (
          <span className="text-xs text-[var(--text-3)]">
            {t('pr_goals.days_left', { days: daysLeft })}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tabular text-cyan-400">{goal.targetKg}</span>
        <span className="text-xs text-[var(--text-3)]">kg {t('pr_goals.target').toLowerCase()}</span>
      </div>
    </div>
  )
}
