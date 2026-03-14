'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { publicAction } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { loginSchema, signupSchema, magicLinkSchema, forgotPasswordSchema } from '@/lib/validations'

import type { ApiResponse } from '@/types'

// Response types
interface AuthRedirect {
  redirectTo: string
}

interface AuthMessage {
  message: string
}

interface OAuthUrl {
  url: string
}

/**
 * 이메일/비밀번호 로그인
 */
export const signInWithEmail = publicAction(
  'signInWithEmail',
  async ({ supabase }, email: string, password: string): Promise<ApiResponse<AuthRedirect>> => {
    // 유효성 검사
    const validated = loginSchema.safeParse({ email, password })
    if (!validated.success) {
      return validationErrorResponse(
        validated.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return errorResponse(ErrorCode.AUTH_INVALID_CREDENTIALS)
      }
      if (error.message.includes('Email not confirmed')) {
        return errorResponse(ErrorCode.AUTH_EMAIL_NOT_CONFIRMED)
      }
      throw error
    }

    // 온보딩 상태 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      const redirectTo = profile?.onboarding_completed ? '/home' : '/onboarding'
      revalidatePath('/', 'layout')
      return successResponse({ redirectTo })
    }

    revalidatePath('/', 'layout')
    return successResponse({ redirectTo: '/home' })
  },
  { rateLimit: { limit: 5 } }
)

/**
 * 이메일/비밀번호 회원가입
 */
export const signUpWithEmail = publicAction(
  'signUpWithEmail',
  async (
    { supabase },
    email: string,
    password: string,
    confirmPassword: string,
    agreeToTerms: boolean
  ): Promise<ApiResponse<AuthMessage>> => {
    // 유효성 검사
    const validated = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
      agreeToTerms,
    })
    if (!validated.success) {
      return validationErrorResponse(
        validated.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    // 콜백 URL
    const headersList = await headers()
    const origin =
      headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const { error } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
      },
    })

    if (error) {
      // Return same success message for "already registered" to prevent
      // account enumeration — attacker cannot distinguish existing vs new email
      if (error.message.includes('already registered')) {
        return successResponse({
          message: '인증 이메일을 발송했습니다. 이메일을 확인해주세요.',
        })
      }
      throw error
    }

    return successResponse({
      message: '인증 이메일을 발송했습니다. 이메일을 확인해주세요.',
    })
  },
  { rateLimit: { limit: 5 } }
)

/**
 * Google OAuth 로그인
 */
export const signInWithGoogle = publicAction(
  'signInWithGoogle',
  async ({ supabase }): Promise<ApiResponse<OAuthUrl>> => {
    const headersList = await headers()
    const rawOrigin =
      headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const origin = rawOrigin.replace(/\/+$/, '')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    })

    if (error) {
      return errorResponse(ErrorCode.EXTERNAL_API_ERROR)
    }

    return successResponse({ url: data.url })
  },
  { rateLimit: { limit: 10 } }
)

/**
 * Magic Link 로그인
 */
export const signInWithMagicLink = publicAction(
  'signInWithMagicLink',
  async ({ supabase }, email: string): Promise<ApiResponse<AuthMessage>> => {
    // 유효성 검사
    const validated = magicLinkSchema.safeParse({ email })
    if (!validated.success) {
      return validationErrorResponse(
        validated.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const headersList = await headers()
    const rawOrigin =
      headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const origin = rawOrigin.replace(/\/+$/, '')

    const { error } = await supabase.auth.signInWithOtp({
      email: validated.data.email,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback`,
      },
    })

    if (error) {
      throw error
    }

    return successResponse({
      message: '로그인 링크를 이메일로 발송했습니다.',
    })
  },
  { rateLimit: { limit: 5 } }
)

/**
 * 비밀번호 재설정 요청
 */
export const resetPassword = publicAction(
  'resetPassword',
  async ({ supabase }, email: string): Promise<ApiResponse<AuthMessage>> => {
    // 유효성 검사
    const validated = forgotPasswordSchema.safeParse({ email })
    if (!validated.success) {
      return validationErrorResponse(
        validated.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const headersList = await headers()
    const rawOrigin =
      headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const origin = rawOrigin.replace(/\/+$/, '')

    const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
      redirectTo: `${origin}/api/auth/callback?next=/profile/security`,
    })

    if (error) {
      throw error
    }

    return successResponse({
      message: '비밀번호 재설정 링크를 이메일로 발송했습니다.',
    })
  },
  { rateLimit: { limit: 3 } }
)

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
