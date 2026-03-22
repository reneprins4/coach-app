import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResumeWorkoutBanner from '../ResumeWorkoutBanner'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'resume_banner.title': 'Hervat je training',
        'resume_banner.resume': 'Hervat',
        'resume_banner.discard': 'Verwijder',
        'resume_banner.confirm_discard': 'Weet je het zeker? Je verliest je voortgang.',
        'common.cancel': 'Annuleer',
        'common.confirm': 'Bevestig',
      }
      return map[key] ?? key
    },
    i18n: { language: 'nl' },
  }),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

function setActiveWorkout(workout: object | null) {
  if (workout) {
    localStorage.setItem('coach-active-workout', JSON.stringify(workout))
  } else {
    localStorage.removeItem('coach-active-workout')
  }
}

const MOCK_WORKOUT = {
  tempId: 'test-123',
  startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  exercises: [{ name: 'Bench Press', sets: [] }],
  notes: '',
}

describe('MF-002: ResumeWorkoutBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('resume banner shows when active workout exists in localStorage', () => {
    setActiveWorkout(MOCK_WORKOUT)
    render(<ResumeWorkoutBanner />)
    expect(screen.getByText('Hervat je training')).toBeTruthy()
  })

  it('resume banner hidden when no active workout', () => {
    setActiveWorkout(null)
    render(<ResumeWorkoutBanner />)
    expect(screen.queryByText('Hervat je training')).toBeNull()
  })

  it('resume banner shows elapsed time since workout started', () => {
    setActiveWorkout(MOCK_WORKOUT)
    render(<ResumeWorkoutBanner />)
    // Should show something like "30 min" elapsed
    const banner = screen.getByTestId('resume-workout-banner')
    expect(banner.textContent).toMatch(/\d+\s*min/)
  })

  it('tapping resume navigates to /log', () => {
    setActiveWorkout(MOCK_WORKOUT)
    render(<ResumeWorkoutBanner />)
    fireEvent.click(screen.getByText('Hervat'))
    expect(mockNavigate).toHaveBeenCalledWith('/log')
  })

  it('dismiss button clears the workout', () => {
    setActiveWorkout(MOCK_WORKOUT)
    render(<ResumeWorkoutBanner />)
    // Click discard
    fireEvent.click(screen.getByText('Verwijder'))
    // Should show confirmation
    expect(screen.getByText('Weet je het zeker? Je verliest je voortgang.')).toBeTruthy()
    // Confirm discard
    fireEvent.click(screen.getByText('Bevestig'))
    // localStorage should be cleared
    expect(localStorage.getItem('coach-active-workout')).toBeNull()
  })
})
