import { useState, useCallback } from 'react'
import type {
  ActiveInjury,
  InjuryArea,
  InjurySeverity,
  InjurySide,
  CheckInFeeling,
} from '../lib/injuryRecovery'
import {
  reportInjury,
  recordCheckIn,
  resolveInjury,
  loadInjuries,
  saveInjuries,
} from '../lib/injuryRecovery'

/**
 * Hook for managing injury state with localStorage persistence.
 * Uses the core injuryRecovery module for all operations.
 */
export function useInjuries() {
  const [injuries, setInjuries] = useState<ActiveInjury[]>(loadInjuries)

  const activeInjuries = injuries.filter(i => i.status !== 'resolved')

  const addInjury = useCallback((area: InjuryArea, severity: InjurySeverity, side: InjurySide) => {
    // Check if an active/recovering injury already exists for this body area
    const existing = injuries.find(
      i => i.bodyArea === area && (i.status === 'active' || i.status === 'recovering')
    )
    if (existing) {
      // Don't add a duplicate — return the existing injury
      return existing
    }

    const injury = reportInjury(area, severity, side)
    setInjuries(prev => {
      const next = [...prev, injury]
      saveInjuries(next)
      return next
    })
    return injury
  }, [injuries])

  const checkIn = useCallback((injuryId: string, feeling: CheckInFeeling) => {
    setInjuries(prev => {
      const next = prev.map(i =>
        i.id === injuryId ? recordCheckIn(i, feeling) : i
      )
      saveInjuries(next)
      return next
    })
  }, [])

  const resolve = useCallback((injuryId: string) => {
    setInjuries(prev => {
      const next = prev.map(i =>
        i.id === injuryId ? resolveInjury(i) : i
      )
      saveInjuries(next)
      return next
    })
  }, [])

  return {
    injuries,
    activeInjuries,
    addInjury,
    checkIn,
    resolve,
  }
}
