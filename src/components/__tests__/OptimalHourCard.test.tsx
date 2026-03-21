import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptimalHourCard from '../OptimalHourCard'

describe('OptimalHourCard', () => {
  const defaultProps = {
    bestSlot: '16:00 - 18:00',
    percentageDifference: 23,
    confidence: 'medium' as const,
    totalWorkouts: 42,
    onViewDetails: vi.fn(),
  }

  it('renders percentage and time slot', () => {
    render(<OptimalHourCard {...defaultProps} />)

    expect(screen.getByText(/23% beter/)).toBeTruthy()
    expect(screen.getByText(/16:00 - 18:00/)).toBeTruthy()
  })

  it('renders workout count', () => {
    render(<OptimalHourCard {...defaultProps} />)

    expect(screen.getByText(/42 trainingen/)).toBeTruthy()
  })

  it('calls onViewDetails when tapped', () => {
    const onViewDetails = vi.fn()
    render(<OptimalHourCard {...defaultProps} onViewDetails={onViewDetails} />)

    fireEvent.click(screen.getByRole('button'))
    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })

  it('shows confidence badge when confidence is not none', () => {
    render(<OptimalHourCard {...defaultProps} confidence="high" />)

    expect(screen.getByText('Hoge zekerheid')).toBeTruthy()
  })

  it('hides confidence badge when confidence is none', () => {
    render(<OptimalHourCard {...defaultProps} confidence="none" />)

    expect(screen.queryByText('Lage zekerheid')).toBeNull()
    expect(screen.queryByText('Gemiddelde zekerheid')).toBeNull()
    expect(screen.queryByText('Hoge zekerheid')).toBeNull()
  })
})
