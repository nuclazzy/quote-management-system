'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { AuthService } from '@/lib/auth/auth-service'
import { AuthContextType, AuthState, ProfileUpdate } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false
  })

  // 인증 상태 변경 감지
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        setAuthState({
          user,
          loading: false,
          initialized: true
        })
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthState({
          user: null,
          loading: false,
          initialized: true
        })
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // 도메인 체크
            if (!session.user.email?.endsWith('@motionsense.co.kr')) {
              await AuthService.signOut()
              throw new Error('접근이 제한된 도메인입니다.')
            }

            // 프로필 생성/업데이트
            const profile = await AuthService.upsertProfile(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.full_name
            )

            setAuthState({
              user: { ...session.user, profile },
              loading: false,
              initialized: true
            })
          } catch (error) {
            console.error('Sign in error:', error)
            setAuthState({
              user: null,
              loading: false,
              initialized: true
            })
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            loading: false,
            initialized: true
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      await AuthService.signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
      throw error
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      await AuthService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
      throw error
    }
  }

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!authState.user?.id) {
      throw new Error('사용자가 로그인되어 있지 않습니다.')
    }

    try {
      const updatedProfile = await AuthService.updateProfile(authState.user.id, updates)
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, profile: updatedProfile } : null
      }))
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}