import { useState, useEffect, useCallback } from 'react'
import type { ActiveExercise, ExercisePlan } from '../types'
import { supabase } from '../lib/supabase'

interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  exercises: string | TemplateExercise[]
  created_at: string
}

interface TemplateExercise {
  name: string
  muscle_group?: string
  category?: string
  plan?: ExercisePlan | null
}

interface UseTemplatesReturn {
  templates: WorkoutTemplate[]
  loading: boolean
  error: string | null
  saveTemplate: (name: string, exercises: ActiveExercise[]) => Promise<WorkoutTemplate>
  deleteTemplate: (id: string) => Promise<void>
  loadTemplate: (template: WorkoutTemplate) => ActiveExercise[]
  refetch: () => Promise<void>
}

export function useTemplates(userId: string | undefined): UseTemplatesReturn {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async (): Promise<void> => {
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
      setTemplates((data as WorkoutTemplate[] | null) || [])
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const saveTemplate = useCallback(async (name: string, exercises: ActiveExercise[]): Promise<WorkoutTemplate> => {
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

    const template = data as WorkoutTemplate
    setTemplates(prev => [template, ...prev])
    return template
  }, [userId])

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', id)

    if (err) throw err

    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadTemplate = useCallback((template: WorkoutTemplate): ActiveExercise[] => {
    // Parse exercises if stored as JSON string
    let exercises: TemplateExercise[] | string = template.exercises
    if (typeof exercises === 'string') {
      try {
        exercises = JSON.parse(exercises) as TemplateExercise[]
      } catch {
        exercises = [] as TemplateExercise[]
      }
    }

    // Validate exercises is an array before mapping
    if (!Array.isArray(exercises)) {
      console.warn('Template has invalid exercises data:', template.name)
      return []
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
