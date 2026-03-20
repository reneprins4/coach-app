import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from 0 to `target` with ease-out cubic easing.
 * Returns 0 when `active` is false; animates toward `target` when true.
 */
export function useCountUp(target: number, active: boolean, duration: number = 1000): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }

    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased * 10) / 10)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, active, duration])

  return value
}
