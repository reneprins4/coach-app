import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, WorkoutCardSkeleton, StatCardSkeleton, DashboardSkeleton, HistorySkeleton } from '../Skeleton'

describe('Skeleton', () => {
  it('renders with the default animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstElementChild!
    expect(el.className).toContain('animate-pulse')
    expect(el.className).toContain('bg-white/[0.06]')
  })

  it('renders with a custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    const el = container.firstElementChild!
    expect(el.className).toContain('h-4')
    expect(el.className).toContain('w-24')
    expect(el.className).toContain('animate-pulse')
  })

  it('renders as a div element', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild!.tagName).toBe('DIV')
  })

  it('includes rounded class for consistent styling', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild!.className).toContain('rounded')
  })

  it('merges custom className without overwriting defaults', () => {
    const { container } = render(<Skeleton className="my-custom-class" />)
    const el = container.firstElementChild!
    expect(el.className).toContain('my-custom-class')
    expect(el.className).toContain('animate-pulse')
    expect(el.className).toContain('rounded')
    expect(el.className).toContain('bg-white/[0.06]')
  })
})

describe('WorkoutCardSkeleton', () => {
  it('renders a container with skeleton elements', () => {
    const { container } = render(<WorkoutCardSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('renders skeletons of different widths for visual variety', () => {
    const { container } = render(<WorkoutCardSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    const classNames = Array.from(skeletons).map(el => el.className)
    // Should have varying widths: w-24, w-full, w-3/4
    expect(classNames.some(c => c.includes('w-24'))).toBe(true)
    expect(classNames.some(c => c.includes('w-full'))).toBe(true)
    expect(classNames.some(c => c.includes('w-3/4'))).toBe(true)
  })

  it('has a card container for card appearance', () => {
    const { container } = render(<WorkoutCardSkeleton />)
    const card = container.firstElementChild!
    expect(card.className).toContain('card')
  })
})

describe('StatCardSkeleton', () => {
  it('renders 2 skeleton elements', () => {
    const { container } = render(<StatCardSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(2)
  })

  it('renders skeletons with different heights for label + value layout', () => {
    const { container } = render(<StatCardSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    const classNames = Array.from(skeletons).map(el => el.className)
    // Small label skeleton and larger value skeleton
    expect(classNames.some(c => c.includes('h-3'))).toBe(true)
    expect(classNames.some(c => c.includes('h-8'))).toBe(true)
  })

  it('has a card container', () => {
    const { container } = render(<StatCardSkeleton />)
    const card = container.firstElementChild!
    expect(card.className).toContain('card')
  })
})

describe('DashboardSkeleton', () => {
  it('renders multiple skeleton elements for dashboard layout', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})

describe('HistorySkeleton', () => {
  it('renders multiple skeleton elements for history layout', () => {
    const { container } = render(<HistorySkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})
