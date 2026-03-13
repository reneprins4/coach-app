import { supabase } from './supabase'

export const signIn = (email) => supabase.auth.signInWithOtp({ email })
export const signOut = () => supabase.auth.signOut()
export const getUser = () => supabase.auth.getUser()
