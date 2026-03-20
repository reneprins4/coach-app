import { useRef, useEffect, useState } from 'react'

interface StoryCardProps {
  isActive: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper for each card in the Training Story.
 * Applies entry animation when `isActive` becomes true.
 * Full viewport sizing with room for progress bar (top) and actions (bottom).
 */
export default function StoryCard({ isActive, children, className = '' }: StoryCardProps) {
  const [hasAnimated, setHasAnimated] = useState(false)
  const prevActiveRef = useRef(false)

  useEffect(() => {
    // Trigger animation on activation (not on initial mount if already active)
    if (isActive && !prevActiveRef.current) {
      setHasAnimated(false)
      // Force reflow then enable animation
      requestAnimationFrame(() => {
        setHasAnimated(true)
      })
    }
    prevActiveRef.current = isActive
  }, [isActive])

  if (!isActive) return null

  return (
    <div
      className={`absolute inset-0 flex flex-col px-6 pb-24 pt-16 ${
        hasAnimated ? 'story-fade-in' : 'opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}
