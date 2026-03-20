import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Measurement, MeasurementType } from '../lib/measurements'

const LS_KEY = 'coach-measurements'

interface UseMeasurementsReturn {
  measurements: Measurement[]
  loading: boolean
  addMeasurement: (type: MeasurementType, value: number, date: string) => Promise<void>
  deleteMeasurement: (id: string) => Promise<void>
}

function getLocalMeasurements(): Measurement[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) as Measurement[] : []
  } catch {
    return []
  }
}

function setLocalMeasurements(m: Measurement[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(m))
  } catch {
    // Ignore storage errors
  }
}

export function useMeasurements(userId: string | undefined): UseMeasurementsReturn {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch measurements on mount
  useEffect(() => {
    if (!userId) {
      setMeasurements([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const { data, error } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', userId!)
          .order('date', { ascending: false })

        if (error) throw error
        if (!cancelled) {
          const items = (data ?? []) as Measurement[]
          setMeasurements(items)
          setLocalMeasurements(items)
        }
      } catch {
        // Fallback to localStorage
        if (!cancelled) {
          setMeasurements(getLocalMeasurements())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const addMeasurement = useCallback(async (type: MeasurementType, value: number, date: string) => {
    if (!userId) return

    // Optimistic local entry
    const tempId = crypto.randomUUID()
    const newMeasurement: Measurement = {
      id: tempId,
      user_id: userId,
      type,
      value,
      date,
      created_at: new Date().toISOString(),
    }

    setMeasurements(prev => {
      const updated = [newMeasurement, ...prev]
      setLocalMeasurements(updated)
      return updated
    })

    try {
      const { data, error } = await supabase
        .from('body_measurements')
        .insert({ user_id: userId, type, value, date })
        .select()
        .single()

      if (error) throw error

      // Replace temp entry with real one
      setMeasurements(prev => {
        const updated = prev.map(m => m.id === tempId ? (data as Measurement) : m)
        setLocalMeasurements(updated)
        return updated
      })
    } catch {
      // Keep optimistic entry in localStorage fallback
    }
  }, [userId])

  const deleteMeasurement = useCallback(async (id: string) => {
    const snapshot = [...measurements]

    setMeasurements(prev => {
      const updated = prev.filter(m => m.id !== id)
      setLocalMeasurements(updated)
      return updated
    })

    try {
      const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch {
      setMeasurements(snapshot)
      setLocalMeasurements(snapshot)
    }
  }, [measurements])

  return { measurements, loading, addMeasurement, deleteMeasurement }
}
