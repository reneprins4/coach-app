// api/delete-account.js
// Vercel serverless function voor account verwijdering
//
// BELANGRIJK: Voeg SUPABASE_SERVICE_ROLE_KEY toe in Vercel dashboard:
// 1. Ga naar Vercel project settings > Environment Variables
// 2. Voeg toe: SUPABASE_SERVICE_ROLE_KEY = [je service role key]
// 3. Zorg dat VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ook aanwezig zijn
// 4. Redeploy na toevoegen van env vars

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  // Check auth header
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  // Verify the user with the anon client
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  
  // Create admin client with service role key
  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  // Delete all user data from tables
  // Order matters: delete from tables without foreign keys first, or those that reference others
  const tables = [
    'ai_response_cache',
    'form_analysis_cache', 
    'training_blocks',
    'workout_templates',
    'sets',           // Delete sets first (child of workouts)
    'workouts',       // Then workouts
    'user_settings'
  ]
  
  for (const table of tables) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .eq('user_id', user.id)
    
    if (error) {
      console.error(`Failed to delete from ${table}:`, error)
      // Continue anyway - some tables might not exist or be empty
    }
  }
  
  // Delete the auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  
  if (deleteError) {
    console.error('Failed to delete auth user:', deleteError)
    return res.status(500).json({ error: deleteError.message })
  }
  
  return res.status(200).json({ success: true })
}
