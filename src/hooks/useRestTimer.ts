import { useState, useEffect, useCallback, useRef } from 'react'
import { getSettings } from '../lib/settings'

interface UseRestTimerReturn {
  remaining: number
  total: number
  active: boolean
  progress: number
  start: (duration?: number) => void
  stop: () => void
  setDuration: (seconds: number) => void
  addTime: (seconds: number) => void
}

export function useRestTimer(): UseRestTimerReturn {
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback((duration?: number): void => {
    const d = duration || getSettings().restTime || 90
    setTotal(d)
    setRemaining(d)
    setActive(true)
  }, [])

  const stop = useCallback((): void => {
    setActive(false)
    setRemaining(0)
  }, [])

  const setDuration = useCallback((seconds: number): void => {
    setTotal(seconds)
    setRemaining(seconds)
    setActive(true)
  }, [])

  const addTime = useCallback((seconds: number): void => {
    setRemaining(prev => prev + seconds)
    setTotal(prev => prev + seconds)
  }, [])

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setActive(false)
          // Vibrate if available
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active])

  const progress = total > 0 ? (total - remaining) / total : 0

  return { remaining, total, active, progress, start, stop, setDuration, addTime }
}
