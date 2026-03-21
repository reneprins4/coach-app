import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OptimalHourDetail from '../OptimalHourDetail'
import type { OptimalHourResult, TimeSlotPerformance } from '../../types'

function makeSlot(overrides: Partial<TimeSlotPerformance> = {}): TimeSlotPerformance {
  return {
    slot: '16-18',
    hourStart: 16,
    hourEnd: 18,
    workoutCount: 8,
    avgVolume: 12000,
    avgRpe: 7.5,
    performanceScore: 85,
    normalizedScore: 100,
    ...overrides,
  }
}

function makeResult(overrides: Partial<OptimalHourResult> = {}): OptimalHourResult {
  const bestSlot = makeSlot({ slot: '16-18', normalizedScore: 100 })
  const worstSlot = makeSlot({ slot: '06-08', hourStart: 6, hourEnd: 8, normalizedScore: 30, workoutCount: 3, performanceScore: 40 })
  return {
    hasEnoughData: true,
    totalWorkouts: 35,
    slotsAnalyzed: 5,
    bestSlot,
    worstSlot,
    allSlots: [
      makeSlot({ slot: '06-08', hourStart: 6, hourEnd: 8, normalizedScore: 30, workoutCount: 3 }),
      makeSlot({ slot: '08-10', hourStart: 8, hourEnd: 10, normalizedScore: 55, workoutCount: 5 }),
      makeSlot({ slot: '10-12', hourStart: 10, hourEnd: 12, normalizedScore: 70, workoutCount: 6 }),
      makeSlot({ slot: '14-16', hourStart: 14, hourEnd: 16, normalizedScore: 80, workoutCount: 7 }),
      bestSlot,
      makeSlot({ slot: '18-20', hourStart: 18, hourEnd: 20, normalizedScore: 65, workoutCount: 6 }),
    ],
    percentageDifference: 23,
    confidence: 'medium',
    ...overrides,
  }
}

describe('OptimalHourDetail', () => {
  it('renders bar for each time slot', () => {
    const result = makeResult()
    render(<OptimalHourDetail result={result} language="nl" />)

    const barsContainer = screen.getByTestId('slot-bars')
    const bars = barsContainer.querySelectorAll('[data-testid^="bar-"]')
    expect(bars.length).toBe(result.allSlots.length)
  })

  it('highlights best slot with cyan class', () => {
    const result = makeResult()
    render(<OptimalHourDetail result={result} language="nl" />)

    const bestBar = screen.getByTestId('bar-16-18')
    expect(bestBar.className).toContain('bg-cyan-500')
  })

  it('highlights worst slot with orange class', () => {
    const result = makeResult()
    render(<OptimalHourDetail result={result} language="nl" />)

    const worstBar = screen.getByTestId('bar-06-08')
    expect(worstBar.className).toContain('bg-orange-500')
  })

  it('shows worst slot warning', () => {
    render(<OptimalHourDetail result={makeResult()} language="nl" />)

    const warning = screen.getByTestId('worst-slot-warning')
    expect(warning).toBeTruthy()
    expect(screen.getByText('Minst optimale tijd')).toBeTruthy()
    expect(screen.getByText('06:00 - 08:00')).toBeTruthy()
  })

  it('shows coach tip', () => {
    render(<OptimalHourDetail result={makeResult()} language="nl" />)

    const tip = screen.getByTestId('coach-tip')
    expect(tip).toBeTruthy()
    expect(screen.getByText('Coach tip')).toBeTruthy()
    expect(screen.getByText(/circadiaan ritme/)).toBeTruthy()
  })

  it('shows not-enough-data state', () => {
    const result = makeResult({
      hasEnoughData: false,
      bestSlot: null,
      worstSlot: null,
      allSlots: [],
    })
    render(<OptimalHourDetail result={result} language="nl" />)

    expect(screen.getByText('Nog niet genoeg data')).toBeTruthy()
    expect(screen.queryByTestId('slot-bars')).toBeNull()
    expect(screen.queryByTestId('coach-tip')).toBeNull()
  })

  it('renders hero percentage', () => {
    render(<OptimalHourDetail result={makeResult()} language="nl" />)

    expect(screen.getByText('+23%')).toBeTruthy()
    expect(screen.getByText('16:00 - 18:00')).toBeTruthy()
  })

  it('renders in English when language is en', () => {
    render(<OptimalHourDetail result={makeResult()} language="en" />)

    expect(screen.getByText('Least optimal time')).toBeTruthy()
    expect(screen.getByText(/circadian rhythm/)).toBeTruthy()
  })
})
