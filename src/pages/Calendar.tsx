import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame, Calendar as CalendarIcon, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { buildHeatmapData, type HeatmapDay } from '../lib/calendarUtils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string, language: string): string {
  return new Date(date).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  })
}

function getWeekdayShort(dayIndex: number, language: string): string {
  const d = new Date(2024, 0, dayIndex + 1) // Jan 1 2024 = Monday
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short' }).format(d)
}

function getMonthName(monthIndex: number, language: string): string {
  const d = new Date(2024, monthIndex, 1)
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long' }).format(d)
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function getMonthDays(year: number, month: number): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startOffset = (firstDay.getDay() + 6) % 7

  const days = []
  const prevMonth = new Date(year, month, 0)
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonth.getDate() - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }
  return days
}

function calculateStreak(workouts: import('../types').Workout[]): number {
  if (!workouts || workouts.length === 0) return 0
  const workoutDates = new Set(
    workouts.map(w => {
      const d = new Date(w.created_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  let current = new Date(today)
  const todayKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
  if (!workoutDates.has(todayKey)) {
    current.setDate(current.getDate() - 1)
  }
  while (true) {
    const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
    if (workoutDates.has(key)) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ---------------------------------------------------------------------------
// Heatmap sub-components
// ---------------------------------------------------------------------------

const INTENSITY_OPACITY = [0, 0.25, 0.55, 1.0] as const

function HeatmapCell({ day, onClick }: { day: HeatmapDay; onClick: (day: HeatmapDay) => void }) {
  const color = day.workoutCount > 0 ? day.splitColor : '#6b7280'
  const opacity = INTENSITY_OPACITY[day.intensity]

  return (
    <button
      onClick={() => onClick(day)}
      className="rounded-[3px] transition-transform active:scale-110"
      style={{
        width: 12,
        height: 12,
        backgroundColor: day.workoutCount > 0 ? color : 'rgba(255,255,255,0.04)',
        opacity: day.workoutCount > 0 ? opacity : 1,
      }}
      aria-label={`${day.date}: ${day.workoutCount > 0 ? day.split : 'rest'}`}
    />
  )
}

function Heatmap({
  data,
  language,
  onDayClick,
}: {
  data: HeatmapDay[]
  language: string
  onDayClick: (day: HeatmapDay) => void
}) {
  const { t } = useTranslation()

  // Build weeks (columns) from the data, rows = Mon-Sun (7 rows)
  // Take last 16 weeks of data
  const weeksCount = 16
  const totalDays = weeksCount * 7

  // Align to Monday: find last Monday <= today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = (today.getDay() + 6) % 7 // 0=Mon
  const endDate = new Date(today)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - totalDays + 1 - dayOfWeek)

  const dataMap = new Map(data.map(d => [d.date, d]))

  // Build grid: 7 rows (Mon=0..Sun=6) x N columns (weeks)
  const grid: (HeatmapDay | null)[][] = Array.from({ length: 7 }, () => [])
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const key = formatDateForCompare(currentDate)
    const row = (currentDate.getDay() + 6) % 7 // 0=Mon
    const entry = dataMap.get(key) || {
      date: key,
      volume: 0,
      intensity: 0 as const,
      split: null,
      splitColor: '#6b7280',
      workoutCount: 0,
    }
    grid[row]!.push(entry)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Day labels (only show Mon, Wed, Fri)
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map(i => getWeekdayShort(i, language))

  // Month labels for the top
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    for (let col = 0; col < (grid[0]?.length || 0); col++) {
      // Each column represents a day for row 0 (Monday), but we step by week
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + col * 7)
      if (d.getMonth() !== lastMonth && d <= endDate) {
        labels.push({
          label: new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { month: 'short' }).format(d),
          col,
        })
        lastMonth = d.getMonth()
      }
    }
    return labels
  }, [startDate, grid, language, endDate])

  // Number of actual weeks (columns)
  const numWeeks = grid[0]?.length || 0

  return (
    <div className="rounded-2xl bg-gray-900 p-4">
      <p className="label-caps mb-3">{t('calendar.heatmap_title')}</p>

      {/* Month labels */}
      <div className="flex mb-1" style={{ paddingLeft: 28 }}>
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[9px] text-gray-500 font-medium"
            style={{
              position: 'relative',
              left: m.col * 14,
              marginRight: i < monthLabels.length - 1 ? 0 : undefined,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-0">
        {/* Row labels */}
        <div className="flex flex-col gap-[2px] mr-1.5 mt-0">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="flex items-center justify-end"
              style={{ height: 12, width: 20 }}
            >
              {(i === 0 || i === 2 || i === 4) && (
                <span className="text-[9px] text-gray-600 leading-none">{label.slice(0, 2)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateRows: 'repeat(7, 12px)',
            gridTemplateColumns: `repeat(${numWeeks}, 12px)`,
            gridAutoFlow: 'column',
          }}
        >
          {grid.flatMap((row, rowIdx) =>
            row.map((day, colIdx) =>
              day ? (
                <HeatmapCell
                  key={`${rowIdx}-${colIdx}`}
                  day={day}
                  onClick={onDayClick}
                />
              ) : (
                <div key={`${rowIdx}-${colIdx}`} style={{ width: 12, height: 12 }} />
              )
            )
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">{t('calendar.less')}</span>
          {[0, 1, 2, 3].map(level => (
            <div
              key={level}
              className="rounded-[2px]"
              style={{
                width: 10,
                height: 10,
                backgroundColor: level === 0 ? 'rgba(255,255,255,0.04)' : '#06b6d4',
                opacity: level === 0 ? 1 : INTENSITY_OPACITY[level],
              }}
            />
          ))}
          <span className="text-[10px] text-gray-500">{t('calendar.more_label')}</span>
        </div>

        <div className="flex items-center gap-2">
          {[
            { name: 'Push', color: '#06b6d4' },
            { name: 'Pull', color: '#a855f7' },
            { name: 'Legs', color: '#22c55e' },
          ].map(s => (
            <div key={s.name} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[9px] text-gray-500">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDateForCompare(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Heatmap tooltip (selected day detail)
// ---------------------------------------------------------------------------

function HeatmapTooltip({
  day,
  language,
}: {
  day: HeatmapDay
  language: string
}) {
  const { t } = useTranslation()
  const dateObj = new Date(day.date + 'T00:00:00')
  const formatted = formatDate(dateObj, language)
  const locale = language === 'nl' ? 'nl-NL' : 'en-GB'

  if (day.workoutCount === 0) {
    return (
      <div className="mt-2 rounded-xl bg-gray-900/60 px-3 py-2 text-center">
        <span className="text-xs text-gray-500">{formatted} — {t('calendar.rest_day')}</span>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl bg-gray-900/60 px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: day.splitColor }} />
        <span className="text-xs text-gray-300">{formatted}</span>
      </div>
      <div className="flex items-center gap-3">
        {day.split && (
          <span className="text-xs font-medium text-white">{day.split}</span>
        )}
        <span className="text-xs text-gray-500">
          {day.volume.toLocaleString(locale)} kg {t('calendar.volume_label')}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Calendar Component
// ---------------------------------------------------------------------------

export default function Calendar() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)

  const DAYS = useMemo(() =>
    [0, 1, 2, 3, 4, 5, 6].map(i => getWeekdayShort(i, i18n.language)),
    [i18n.language]
  )

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDay | null>(null)

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])

  // Build heatmap data
  const heatmapData = useMemo(() => buildHeatmapData(workouts), [workouts])
  const heatmapMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>()
    for (const d of heatmapData) map.set(d.date, d)
    return map
  }, [heatmapData])

  const workoutsByDate = useMemo(() => {
    const map: Record<string, import('../types').Workout[]> = {}
    for (const w of workouts) {
      const d = new Date(w.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key]!.push(w)
    }
    return map
  }, [workouts])

  const stats = useMemo(() => {
    const thisMonth = workouts.filter(w => {
      const d = new Date(w.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length
    const thisYear = workouts.filter(w => {
      const d = new Date(w.created_at)
      return d.getFullYear() === currentYear
    }).length
    const streak = calculateStreak(workouts)
    return { thisMonth, thisYear, streak }
  }, [workouts, currentMonth, currentYear])

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return []
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    return (workoutsByDate as Record<string, import('../types').Workout[]>)[key] || []
  }, [selectedDate, workoutsByDate])

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
    setSelectedDate(null)
  }

  function handleDayClick(day: { date: Date; isCurrentMonth: boolean }) {
    const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
    if (workoutsByDate[key]) {
      setSelectedDate(day.date)
      setSelectedHeatmapDay(null)
    }
  }

  const handleHeatmapDayClick = useCallback((day: HeatmapDay) => {
    setSelectedHeatmapDay(day)
    // Also navigate the month view to this day
    const d = new Date(day.date + 'T00:00:00')
    setCurrentMonth(d.getMonth())
    setCurrentYear(d.getFullYear())
    // If this day has workouts, select it in the month view too
    if (day.workoutCount > 0) {
      setSelectedDate(d)
    } else {
      setSelectedDate(null)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-32">
      <div className="mb-6">
        <p className="label-caps mb-1">{t('calendar.overview')}</p>
        <h1 className="text-3xl font-black tracking-tight text-white">{t('calendar.calendar')}</h1>
      </div>

      {/* Stats strip */}
      <div className="mb-5 flex gap-2">
        <div className="flex flex-1 flex-col items-center rounded-2xl bg-gray-900 py-3.5">
          <CalendarIcon size={15} className="mb-1.5 text-gray-500" />
          <span className="text-xl font-black text-white tabular-nums">{stats.thisMonth}</span>
          <span className="label-caps mt-0.5">{t('calendar.this_month')}</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-2xl bg-gray-900 py-3.5">
          <Flame size={15} className="mb-1.5 text-cyan-500" />
          <span className="text-xl font-black text-white tabular-nums">{stats.streak}</span>
          <span className="label-caps mt-0.5">{t('dashboard.streak')}</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-2xl bg-gray-900 py-3.5">
          <Trophy size={15} className="mb-1.5 text-yellow-500" />
          <span className="text-xl font-black text-white tabular-nums">{stats.thisYear}</span>
          <span className="label-caps mt-0.5">{t('calendar.this_year')}</span>
        </div>
      </div>

      {/* GitHub-style heatmap */}
      {workouts.length > 0 && (
        <>
          <Heatmap
            data={heatmapData}
            language={i18n.language}
            onDayClick={handleHeatmapDayClick}
          />
          {selectedHeatmapDay && (
            <HeatmapTooltip day={selectedHeatmapDay} language={i18n.language} />
          )}
        </>
      )}

      {/* Month navigation */}
      <div className={`mb-4 flex items-center justify-between ${workouts.length > 0 ? 'mt-5' : ''}`}>
        <button
          onClick={prevMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800"
        >
          <ChevronLeft size={22} />
        </button>
        <h2 className="text-base font-bold text-white">
          {getMonthName(currentMonth, i18n.language)} {currentYear}
        </h2>
        <button
          onClick={nextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 active:bg-gray-800"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS.map(day => (
          <div key={day} className="py-2 text-center label-caps">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
          const hasWorkout = !!workoutsByDate[dateKey]
          const isToday = isSameDay(day.date, today)
          const isFuture = day.date > today
          const isSelected = selectedDate && isSameDay(day.date, selectedDate)

          // Get heatmap info for split coloring
          const heatmapKey = formatDateForCompare(day.date)
          const heatmapInfo = heatmapMap.get(heatmapKey)
          const splitColor = heatmapInfo?.splitColor
          const intensity = heatmapInfo?.intensity || 0

          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              disabled={!hasWorkout}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors ${
                !day.isCurrentMonth ? 'text-gray-800' :
                isFuture ? 'text-gray-700' :
                isSelected ? 'text-white ring-1 ring-white/40' :
                isToday ? 'ring-1 ring-white/30 text-white' :
                hasWorkout ? 'text-white' :
                'text-gray-500'
              } ${hasWorkout && !isSelected ? 'active:bg-gray-800' : ''}`}
              style={
                hasWorkout && day.isCurrentMonth && splitColor
                  ? {
                      backgroundColor: splitColor,
                      opacity: isSelected ? 1 : (0.12 + intensity * 0.08),
                    }
                  : undefined
              }
            >
              <span
                className={`text-sm ${hasWorkout && day.isCurrentMonth ? 'font-semibold' : ''}`}
                style={
                  hasWorkout && day.isCurrentMonth
                    ? { opacity: isSelected ? 1 : (1 / (0.12 + intensity * 0.08)) * 0.9, minWidth: 0 }
                    : undefined
                }
              >
                {day.date.getDate()}
              </span>
              {hasWorkout && day.isCurrentMonth && (
                <span
                  className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: splitColor || '#06b6d4' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected workout detail */}
      {selectedDate && selectedWorkouts.length > 0 && (
        <div className="mt-6 rounded-2xl bg-gray-900 p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {formatDate(selectedDate, i18n.language)}
          </p>

          {selectedWorkouts.map(workout => {
            const heatmapKey = formatDateForCompare(selectedDate)
            const hInfo = heatmapMap.get(heatmapKey)

            return (
              <div key={workout.id} className="mt-3 first:mt-0">
                {/* Split badge */}
                {hInfo?.split && (
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: hInfo.splitColor }}
                    />
                    <span className="text-xs font-semibold text-white">{hInfo.split}</span>
                  </div>
                )}

                {workout.exerciseNames?.length > 0 && (
                  <p className="mb-2 text-base font-bold text-white">
                    {workout.exerciseNames.slice(0, 3).join(' + ')}
                    {workout.exerciseNames.length > 3 && ` +${workout.exerciseNames.length - 3}`}
                  </p>
                )}

                {/* Exercise summary */}
                <div className="space-y-1.5">
                  {(workout.exerciseNames || []).slice(0, 4).map(name => {
                    const sets = workout.workout_sets.filter(s => s.exercise === name)
                    const maxWeight = sets.length > 0 ? Math.max(...sets.map(s => s.weight_kg || 0)) : 0
                    return (
                      <div key={name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{name}</span>
                        <span className="text-gray-600">
                          {sets.length} {t('common.sets')} {maxWeight > 0 ? `/ ${maxWeight}kg` : ''}
                        </span>
                      </div>
                    )
                  })}
                  {workout.exerciseNames?.length > 4 && (
                    <p className="text-xs text-gray-600">
                      +{workout.exerciseNames.length - 4} {t('calendar.more')}
                    </p>
                  )}
                </div>

                {/* Volume */}
                {workout.totalVolume > 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    {t('common.volume')}: <span className="font-semibold text-white">{workout.totalVolume.toLocaleString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB')} kg</span>
                  </p>
                )}

                {/* Link to detail */}
                <Link
                  to={`/history/${workout.id}`}
                  className="mt-4 flex h-10 items-center justify-center rounded-lg text-sm font-medium text-cyan-500 ring-1 ring-cyan-500/30 active:bg-cyan-500/10"
                >
                  {t('calendar.view_full_workout')}
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state when no date selected */}
      {!selectedDate && workouts.length > 0 && (
        <p className="mt-6 text-center text-sm text-gray-600">
          {t('calendar.tap_day_hint')}
        </p>
      )}

      {/* Empty state when no workouts */}
      {workouts.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-gray-500">{t('calendar.no_workouts')}</p>
          <Link
            to="/log"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-cyan-500 px-6 text-sm font-semibold text-white"
          >
            {t('calendar.start_first')}
          </Link>
        </div>
      )}
    </div>
  )
}
