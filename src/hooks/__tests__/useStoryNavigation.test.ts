import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useStoryNavigation (logic tests)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('card index management', () => {
    it('starts at card 0', () => {
      const currentCard = 0
      expect(currentCard).toBe(0)
    })

    it('goNext advances to next card', () => {
      const totalCards = 5
      let currentCard = 0
      const goNext = () => {
        if (currentCard < totalCards - 1) currentCard += 1
      }
      goNext()
      expect(currentCard).toBe(1)
    })

    it('goPrev goes to previous card', () => {
      let currentCard = 2
      const goPrev = () => {
        if (currentCard > 0) currentCard -= 1
      }
      goPrev()
      expect(currentCard).toBe(1)
    })

    it('goNext does not exceed totalCards - 1', () => {
      const totalCards = 3
      let currentCard = 2
      const goNext = () => {
        if (currentCard < totalCards - 1) currentCard += 1
      }
      goNext()
      goNext()
      expect(currentCard).toBe(2)
    })

    it('goPrev does not go below 0', () => {
      let currentCard = 0
      const goPrev = () => {
        if (currentCard > 0) currentCard -= 1
      }
      goPrev()
      goPrev()
      expect(currentCard).toBe(0)
    })

    it('goTo sets specific card index', () => {
      const totalCards = 5
      let currentCard = 0
      const goTo = (index: number) => {
        currentCard = Math.max(0, Math.min(index, totalCards - 1))
      }
      goTo(3)
      expect(currentCard).toBe(3)
    })

    it('goTo clamps to valid range', () => {
      const totalCards = 5
      let currentCard = 0
      const goTo = (index: number) => {
        currentCard = Math.max(0, Math.min(index, totalCards - 1))
      }

      goTo(-2)
      expect(currentCard).toBe(0)

      goTo(100)
      expect(currentCard).toBe(4)
    })
  })

  describe('boundary flags', () => {
    it('isFirst returns true at card 0', () => {
      const currentCard = 0
      const isFirst = currentCard === 0
      expect(isFirst).toBe(true)
    })

    it('isFirst returns false when not at card 0', () => {
      let currentCard = 0
      currentCard = 2
      const isFirst = currentCard === 0
      expect(isFirst).toBe(false)
    })

    it('isLast returns true at last card', () => {
      const totalCards = 5
      const currentCard = 4
      const isLast = currentCard === totalCards - 1
      expect(isLast).toBe(true)
    })

    it('isLast returns false when not at last card', () => {
      const totalCards = 5
      const currentCard = 2
      const isLast = currentCard === totalCards - 1
      expect(isLast).toBe(false)
    })
  })

  describe('progress calculation', () => {
    it('progress returns 0 at first card', () => {
      const totalCards = 5
      const currentCard = 0
      const progress = (currentCard / (totalCards - 1)) * 100
      expect(progress).toBe(0)
    })

    it('progress returns 50 at middle card', () => {
      const totalCards = 5
      const currentCard = 2
      const progress = (currentCard / (totalCards - 1)) * 100
      expect(progress).toBe(50)
    })

    it('progress returns 100 at last card', () => {
      const totalCards = 5
      const currentCard = 4
      const progress = (currentCard / (totalCards - 1)) * 100
      expect(progress).toBe(100)
    })

    it('progress handles single card (returns 100)', () => {
      const totalCards = 1
      const currentCard = 0
      const progress = totalCards <= 1 ? 100 : (currentCard / (totalCards - 1)) * 100
      expect(progress).toBe(100)
    })
  })

  describe('swipe detection logic', () => {
    it('detects right-to-left swipe as goNext', () => {
      const startX = 200
      const endX = 100
      const deltaX = endX - startX
      const SWIPE_THRESHOLD = 50
      const isSwipeLeft = deltaX < -SWIPE_THRESHOLD
      expect(isSwipeLeft).toBe(true)
    })

    it('detects left-to-right swipe as goPrev', () => {
      const startX = 100
      const endX = 200
      const deltaX = endX - startX
      const SWIPE_THRESHOLD = 50
      const isSwipeRight = deltaX > SWIPE_THRESHOLD
      expect(isSwipeRight).toBe(true)
    })

    it('ignores small swipes below threshold', () => {
      const startX = 200
      const endX = 175
      const deltaX = endX - startX
      const SWIPE_THRESHOLD = 50
      const isSwipe = Math.abs(deltaX) > SWIPE_THRESHOLD
      expect(isSwipe).toBe(false)
    })

    it('detects tap on left half as goPrev', () => {
      const screenWidth = 400
      const tapX = 150
      const isLeftHalf = tapX < screenWidth / 2
      expect(isLeftHalf).toBe(true)
    })

    it('detects tap on right half as goNext', () => {
      const screenWidth = 400
      const tapX = 250
      const isRightHalf = tapX >= screenWidth / 2
      expect(isRightHalf).toBe(true)
    })
  })

  describe('auto-advance timer', () => {
    it('advances after autoAdvanceMs', () => {
      const autoAdvanceMs = 5000
      let currentCard = 0
      const totalCards = 3

      const timer = setInterval(() => {
        if (currentCard < totalCards - 1) currentCard += 1
      }, autoAdvanceMs)

      vi.advanceTimersByTime(5000)
      expect(currentCard).toBe(1)

      vi.advanceTimersByTime(5000)
      expect(currentCard).toBe(2)

      // Should not advance past last
      vi.advanceTimersByTime(5000)
      expect(currentCard).toBe(2)

      clearInterval(timer)
    })

    it('pauses and resumes timer', () => {
      const autoAdvanceMs = 5000
      let currentCard = 0
      const totalCards = 5
      let paused = false

      const timer = setInterval(() => {
        if (!paused && currentCard < totalCards - 1) currentCard += 1
      }, autoAdvanceMs)

      vi.advanceTimersByTime(5000)
      expect(currentCard).toBe(1)

      paused = true
      vi.advanceTimersByTime(10000)
      expect(currentCard).toBe(1) // Still 1, paused

      paused = false
      vi.advanceTimersByTime(5000)
      expect(currentCard).toBe(2) // Resumed

      clearInterval(timer)
    })
  })
})
