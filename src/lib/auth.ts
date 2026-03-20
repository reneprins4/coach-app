import { supabase } from './supabase'

// Stap 1: verstuur OTP code (6-cijferig, geen magic link redirect)
export const sendOtp = (email: string) => supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    // Geen emailRedirectTo — geen magic link, alleen code
  }
})

// Stap 2: verifieer de ingevoerde code
export const verifyOtp = (email: string, token: string) => supabase.auth.verifyOtp({
  email,
  token,
  type: 'email'
})

// Legacy alias (niet meer gebruiken in nieuwe code)
export const signIn = sendOtp

export const signOut = () => supabase.auth.signOut()
export const getUser = () => supabase.auth.getUser()
