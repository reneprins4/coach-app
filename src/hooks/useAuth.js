import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Clear session caches on logout to prevent data leakage
      if (event === 'SIGNED_OUT') {
        try {
          for (const key of Object.keys(sessionStorage)) {
            if (key.startsWith('__kravex_')) {
              sessionStorage.removeItem(key)
            }
          }
        } catch {}
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Stap 1: verstuur OTP code naar email
  const sendOtp = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    })
    return { error }
  }, [])

  // Stap 2: verifieer de ingevoerde code
  const verifyOtp = useCallback(async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    return { data, error }
  }, [])

  // Legacy alias voor backward compatibility
  const signIn = sendOtp

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  return { user, loading, sendOtp, verifyOtp, signIn, signOut }
}
