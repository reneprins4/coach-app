import { useState, useEffect, useCallback, useRef } from 'react'
import { getSettings } from '../lib/settings'

export function useRestTimer() {
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(false)
  const intervalRef = useRef(null)

  const start = useCallback((duration) => {
    const d = duration || getSettings().restTime || 90
    setTotal(d)
    setRemaining(d)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    setRemaining(0)
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
    return () => clearInterval(intervalRef.current)
  }, [active])

  const progress = total > 0 ? (total - remaining) / total : 0

  return { remaining, total, active, progress, start, stop }
}
