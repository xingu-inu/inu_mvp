import { headers } from 'next/headers'

/**
 * Extract client IP address from request headers.
 * Relies on trusted proxy (Vercel, CloudFlare) to set x-forwarded-for.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}

/**
 * Check if an error is a Next.js navigation error (redirect/notFound).
 * These must be re-thrown to allow Next.js to handle them.
 */
export function isNextNavigationError(error: unknown): boolean {
  const digest = (error as { digest?: string })?.digest
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  )
}

/**
 * Validate request origin matches the target origin (CSRF protection).
 * Returns true if origins match or if no Origin header present (same-origin requests).
 */
export async function validateOrigin(request: Request): Promise<boolean> {
  const h = await headers()
  const origin = h.get('origin')
  if (!origin) return true // same-origin requests don't send Origin
  const { origin: requestOrigin } = new URL(request.url)
  return origin === requestOrigin
}
