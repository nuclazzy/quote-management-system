import { User } from '@supabase/supabase-js'
import { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface AuthUser extends User {
  profile?: Profile
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
}

export interface AuthContextType extends AuthState {
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: ProfileUpdate) => Promise<void>
}