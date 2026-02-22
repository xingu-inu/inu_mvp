/**
 * Secure Route Factory — authRoute / publicRoute
 *
 * Wraps API route handlers with automatic:
 * - Authentication checks
 * - Rate limiting (IP-based or userId-based)
 * - CSRF protection (Origin validation)
 * - Secure error logging
 * - Standardized JSON error responses with HTTP status codes
 */

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { ErrorCode, getErrorMessage } from '@/lib/api/errors'
import { isRateLimited } from '@/lib/rate-limit'
import { secureLog } from './logger'
import { getClientIp, isNextNavigationError, validateOrigin } from './helpers'
import type { TypedSupabaseClient } from '@/repositories/base.repository'

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface RouteAuthContext {
  supabase: TypedSupabaseClient
  user: User
  request: Request
}

export interface RoutePublicContext {
  supabase: TypedSupabaseClient
  ip: string
  request: Request
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface RouteOptions {
  /** Rate limit: { limit, windowMs? (default 60s) } */
  rateLimit?: { limit: number; windowMs?: number }
  /** Enable CSRF protection via Origin header validation (for POST/PUT/DELETE) */
  csrf?: boolean
}

// ---------------------------------------------------------------------------
// Error code → HTTP status mapping
// ---------------------------------------------------------------------------

const ERROR_STATUS_MAP: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.AUTH_FORBIDDEN]: 403,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.VALIDATION_REQUIRED]: 400,
  [ErrorCode.VALIDATION_FORMAT]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
}

function jsonError(code: ErrorCode, message?: string, status?: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: message ?? getErrorMessage(code),
      },
      meta: { timestamp: new Date().toISOString() },
    },
    { status: status ?? ERROR_STATUS_MAP[code] ?? 500 }
  )
}

// ---------------------------------------------------------------------------
// authRoute — for authenticated API endpoints
// ---------------------------------------------------------------------------

export function authRoute(
  name: string,
  handler: (ctx: RouteAuthContext) => Promise<NextResponse>,
  options?: RouteOptions
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    try {
      // CSRF check for state-changing methods
      if (options?.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const originValid = await validateOrigin(request)
        if (!originValid) {
          return jsonError(ErrorCode.AUTH_FORBIDDEN, '잘못된 요청입니다.', 403)
        }
      }

      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return jsonError(ErrorCode.AUTH_REQUIRED)
      }

      if (options?.rateLimit) {
        const { limit, windowMs } = options.rateLimit
        if (await isRateLimited(`user:${user.id}:${name}`, limit, windowMs)) {
          return jsonError(ErrorCode.RATE_LIMITED)
        }
      }

      return await handler({ supabase, user, request })
    } catch (error) {
      if (isNextNavigationError(error)) throw error
      secureLog.error(`route:${name}`, error)
      return jsonError(ErrorCode.INTERNAL_ERROR)
    }
  }
}

// ---------------------------------------------------------------------------
// publicRoute — for unauthenticated API endpoints (login, callbacks, etc.)
// ---------------------------------------------------------------------------

export function publicRoute(
  name: string,
  handler: (ctx: RoutePublicContext) => Promise<NextResponse>,
  options?: RouteOptions
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    try {
      // CSRF check for state-changing methods
      if (options?.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const originValid = await validateOrigin(request)
        if (!originValid) {
          return jsonError(ErrorCode.AUTH_FORBIDDEN, '잘못된 요청입니다.', 403)
        }
      }

      const supabase = await createClient()
      const ip = await getClientIp()

      if (options?.rateLimit) {
        const { limit, windowMs } = options.rateLimit
        if (await isRateLimited(`ip:${ip}:${name}`, limit, windowMs)) {
          return jsonError(ErrorCode.RATE_LIMITED)
        }
      }

      return await handler({ supabase, ip, request })
    } catch (error) {
      if (isNextNavigationError(error)) throw error
      secureLog.error(`route:${name}`, error)
      return jsonError(ErrorCode.INTERNAL_ERROR)
    }
  }
}
