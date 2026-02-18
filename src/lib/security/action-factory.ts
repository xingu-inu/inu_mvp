/**
 * Secure Action Factory — authAction / publicAction / adminAction
 *
 * Wraps server actions with automatic:
 * - Authentication / admin checks
 * - Rate limiting (IP-based or userId-based)
 * - Secure error logging (no stack traces in production)
 * - Custom error mapping (e.g., NOT_FOUND → specific ErrorCode)
 * - Next.js redirect/notFound error passthrough
 */

import type { User } from '@supabase/supabase-js'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api/response'
import { ErrorCode } from '@/lib/api/errors'
import { isRateLimited } from '@/lib/rate-limit'
import { secureLog } from './logger'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import type { ApiErrorResponse } from '@/types/api'

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface AuthContext {
  supabase: TypedSupabaseClient
  user: User
}

export interface PublicContext {
  supabase: TypedSupabaseClient
  ip: string
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface ActionOptions {
  /** Rate limit: { limit, windowMs? (default 60s) } */
  rateLimit?: { limit: number; windowMs?: number }
  /** Map thrown Error.message → ErrorCode + optional user message */
  errorMap?: Record<string, { code: ErrorCode; message?: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}

function isNextNavigationError(error: unknown): boolean {
  const digest = (error as { digest?: string })?.digest
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  )
}

function handleCatchError(
  name: string,
  error: unknown,
  errorMap?: Record<string, { code: ErrorCode; message?: string }>
): ApiErrorResponse {
  // Re-throw Next.js navigation errors
  if (isNextNavigationError(error)) throw error

  secureLog.error(name, error)

  // Custom error mapping
  if (errorMap && error instanceof Error) {
    const mapped = errorMap[error.message]
    if (mapped) return errorResponse(mapped.code, mapped.message)
  }

  return errorResponse(ErrorCode.INTERNAL_ERROR)
}

// ---------------------------------------------------------------------------
// authAction — for authenticated endpoints (most actions)
// ---------------------------------------------------------------------------

export function authAction<TArgs extends unknown[], TResult>(
  name: string,
  handler: (ctx: AuthContext, ...args: TArgs) => Promise<TResult>,
  options?: ActionOptions
): (...args: TArgs) => Promise<TResult | ApiErrorResponse> {
  return async (...args: TArgs): Promise<TResult | ApiErrorResponse> => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return errorResponse(ErrorCode.AUTH_REQUIRED)

      if (options?.rateLimit) {
        const { limit, windowMs } = options.rateLimit
        if (isRateLimited(`user:${user.id}:${name}`, limit, windowMs)) {
          return errorResponse(ErrorCode.RATE_LIMITED)
        }
      }

      return await handler({ supabase, user }, ...args)
    } catch (error) {
      return handleCatchError(name, error, options?.errorMap)
    }
  }
}

// ---------------------------------------------------------------------------
// publicAction — for unauthenticated endpoints (login, signup, etc.)
// ---------------------------------------------------------------------------

export function publicAction<TArgs extends unknown[], TResult>(
  name: string,
  handler: (ctx: PublicContext, ...args: TArgs) => Promise<TResult>,
  options?: ActionOptions
): (...args: TArgs) => Promise<TResult | ApiErrorResponse> {
  return async (...args: TArgs): Promise<TResult | ApiErrorResponse> => {
    try {
      const supabase = await createClient()
      const ip = await getClientIp()

      if (options?.rateLimit) {
        const { limit, windowMs } = options.rateLimit
        if (isRateLimited(`ip:${ip}:${name}`, limit, windowMs)) {
          return errorResponse(ErrorCode.RATE_LIMITED)
        }
      }

      return await handler({ supabase, ip }, ...args)
    } catch (error) {
      return handleCatchError(name, error, options?.errorMap)
    }
  }
}

// ---------------------------------------------------------------------------
// adminAction — for admin-only endpoints (auto admin check + rate limit)
// ---------------------------------------------------------------------------

const DEFAULT_ADMIN_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

export function adminAction<TArgs extends unknown[], TResult>(
  name: string,
  handler: (ctx: AuthContext, ...args: TArgs) => Promise<TResult>,
  options?: ActionOptions
): (...args: TArgs) => Promise<TResult | ApiErrorResponse> {
  return async (...args: TArgs): Promise<TResult | ApiErrorResponse> => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return errorResponse(ErrorCode.AUTH_REQUIRED)

      // Admin privilege check
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!(profile as unknown as { is_admin: boolean } | null)?.is_admin) {
        return errorResponse(ErrorCode.AUTH_FORBIDDEN)
      }

      // Rate limit (default 30/min, overridable)
      const rl = options?.rateLimit ?? DEFAULT_ADMIN_RATE_LIMIT
      if (isRateLimited(`admin:${user.id}:${name}`, rl.limit, rl.windowMs)) {
        return errorResponse(ErrorCode.RATE_LIMITED)
      }

      return await handler({ supabase, user }, ...args)
    } catch (error) {
      return handleCatchError(name, error, options?.errorMap)
    }
  }
}
