import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTemplates(userId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTemplates = useCallback(async () => {
    if (!userId) {
      setTemplates([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setTemplates(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const saveTemplate = useCallback(async (name, exercises) => {
    if (!userId) throw new Error('Not authenticated')

    const { data, error: err } = await supabase
      .from('workout_templates')
      .insert({
        user_id: userId,
        name,
        exercises: JSON.stringify(exercises),
      })
      .select()
      .single()

    if (err) throw err

    setTemplates(prev => [data, ...prev])
    return data
  }, [userId])

  const deleteTemplate = useCallback(async (id) => {
    const { error: err } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', id)

    if (err) throw err

    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadTemplate = useCallback((template) => {
    // Parse exercises if stored as JSON string
    let exercises = template.exercises
    if (typeof exercises === 'string') {
      try {
        exercises = JSON.parse(exercises)
      } catch {
        exercises = []
      }
    }

    // Transform to active workout format (with empty sets)
    return exercises.map(ex => ({
      name: ex.name,
      muscle_group: ex.muscle_group || '',
      category: ex.category || '',
      plan: ex.plan || null,
      sets: [],
    }))
  }, [])

  return {
    templates,
    loading,
    error,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    refetch: fetchTemplates,
  }
}
