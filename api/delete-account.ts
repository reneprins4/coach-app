import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { handleCors } from './_cors.js'

/** Tables to purge before deleting the auth user, in dependency-safe order. */
const USER_DATA_TABLES: readonly string[] = [
  'ai_response_cache',
  'form_analysis_cache',
  'training_blocks',
  'workout_templates',
  'sets',           // Delete sets first (child of workouts)
  'workouts',       // Then workouts
  'user_settings',
]

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Handle CORS (returns true if preflight was handled)
  if (handleCors(req, res)) return

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Check auth header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)

  // Verify the user with the service role client
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase config for auth verification')
    res.status(500).json({ error: 'Server configuration error' })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  // Delete all user data from tables
  for (const table of USER_DATA_TABLES) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error(`Failed to delete from ${table}:`, error)
      // Continue anyway - some tables might not exist or be empty
    }
  }

  // Delete the auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('Delete error:', deleteError)
    res.status(500).json({ error: 'Failed to delete account' })
    return
  }

  res.status(200).json({ success: true })
}
