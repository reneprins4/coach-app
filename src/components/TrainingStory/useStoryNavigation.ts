import { useState, useCallback, useRef, useEffect } from 'react'

interface UseStoryNavigationOptions {
  totalCards: number
  autoAdvanceMs?: number
  onComplete?: () => void
}

interface UseStoryNavigationReturn {
  currentCard: number
  goNext: () => void
  goPrev: () => void
  goTo: (index: number) => void
  isFirst: boolean
  isLast: boolean
  /** Progress percentage 0-100 */
  progress: number
  pause: () => void
  resume: () => void
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void
  handleClick: (e: React.MouseEvent) => void
}

const SWIPE_THRESHOLD = 50
const TAP_MAX_DURATION = 200

export function useStoryNavigation({
  totalCards,
  autoAdvanceMs = 5000,
  onComplete,
}: UseStoryNavigationOptions): UseStoryNavigationReturn {
  const [currentCard, setCurrentCard] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // Stable refs for callbacks
  const currentCardRef = useRef(currentCard)
  currentCardRef.current = currentCard
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const goNext = useCallback(() => {
    setCurrentCard((prev) => {
      if (prev >= totalCards - 1) {
        onCompleteRef.current?.()
        return prev
      }
      return prev + 1
    })
  }, [totalCards])

  const goPrev = useCallback(() => {
    setCurrentCard((prev) => Math.max(0, prev - 1))
  }, [])

  const goTo = useCallback(
    (index: number) => {
      setCurrentCard(Math.max(0, Math.min(index, totalCards - 1)))
    },
    [totalCards],
  )

  const pause = useCallback(() => setPaused(true), [])
  const resume = useCallback(() => setPaused(false), [])

  // Reset auto-advance timer on card change or pause state
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (paused || currentCardRef.current >= totalCards - 1) return

    timerRef.current = setInterval(() => {
      if (!paused) goNext()
    }, autoAdvanceMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentCard, paused, autoAdvanceMs, totalCards, goNext])

  // Touch handlers for swipe and tap
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      pause()
      const touch = e.touches[0]
      if (!touch) return
      touchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
    },
    [pause],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      resume()
      if (!touchRef.current) return

      const touch = e.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchRef.current.x
      const elapsed = Date.now() - touchRef.current.time

      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        // Swipe detected
        if (deltaX < 0) {
          goNext()
        } else {
          goPrev()
        }
      } else if (elapsed < TAP_MAX_DURATION) {
        // Tap detected: left half = prev, right half = next
        const screenWidth = window.innerWidth
        if (touch.clientX < screenWidth / 2) {
          goPrev()
        } else {
          goNext()
        }
      }

      touchRef.current = null
    },
    [resume, goNext, goPrev],
  )

  // Click handler for desktop: left half = prev, right half = next
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const screenWidth = window.innerWidth
      if (e.clientX < screenWidth / 2) {
        goPrev()
      } else {
        goNext()
      }
    },
    [goNext, goPrev],
  )

  const isFirst = currentCard === 0
  const isLast = currentCard === totalCards - 1
  const progress = totalCards <= 1 ? 100 : (currentCard / (totalCards - 1)) * 100

  return {
    currentCard,
    goNext,
    goPrev,
    goTo,
    isFirst,
    isLast,
    progress,
    pause,
    resume,
    handleTouchStart,
    handleTouchEnd,
    handleClick,
  }
}
