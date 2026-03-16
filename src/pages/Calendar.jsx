import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame, Calendar as CalendarIcon, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'

function formatDate(date, language) {
  return new Date(date).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  })
}

function getWeekdayShort(dayIndex, language) {
  // dayIndex: 0=Mon, 1=Tue, ..., 6=Sun
  const d = new Date(2024, 0, dayIndex + 1) // Jan 1 2024 = Monday
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short' }).format(d)
}

function getMonthName(monthIndex, language) {
  const d = new Date(2024, monthIndex, 1)
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long' }).format(d)
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Monday = 0, Sunday = 6
  let startOffset = (firstDay.getDay() + 6) % 7
  
  const days = []
  
  // Previous month padding
  const prevMonth = new Date(year, month, 0)
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonth.getDate() - i),
      isCurrentMonth: false
    })
  }
  
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: new Date(year, month, d),
      isCurrentMonth: true
    })
  }
  
  // Next month padding
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false
    })
  }
  
  return days
}

function calculateStreak(workouts) {
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
  
  // Check if today has a workout
  const todayKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
  if (!workoutDates.has(todayKey)) {
    // Check yesterday instead
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

export default function Calendar() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  
  // Generate day abbreviations dynamically based on language
  const DAYS = useMemo(() => 
    [0, 1, 2, 3, 4, 5, 6].map(i => getWeekdayShort(i, i18n.language)),
    [i18n.language]
  )
  
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  
  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])
  
  const workoutsByDate = useMemo(() => {
    const map = {}
    for (const w of workouts) {
      const d = new Date(w.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(w)
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
    return workoutsByDate[key] || []
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
  
  function handleDayClick(day) {
    const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
    if (workoutsByDate[key]) {
      setSelectedDate(day.date)
    }
  }
  
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
      
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
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
          
          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              disabled={!hasWorkout}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors ${
                !day.isCurrentMonth ? 'text-gray-800' :
                isFuture ? 'text-gray-700' :
                isSelected ? 'bg-cyan-500/20 text-white' :
                isToday ? 'ring-1 ring-white/30 text-white' :
                hasWorkout ? 'text-white' :
                'text-gray-500'
              } ${hasWorkout && !isSelected ? 'active:bg-gray-800' : ''}`}
            >
              <span className={`text-sm ${hasWorkout && day.isCurrentMonth ? 'font-semibold' : ''}`}>
                {day.date.getDate()}
              </span>
              {hasWorkout && day.isCurrentMonth && (
                <span className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
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
          
          {selectedWorkouts.map(workout => (
            <div key={workout.id} className="mt-3 first:mt-0">
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
          ))}
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
