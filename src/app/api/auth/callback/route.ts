import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Allowed path prefixes for post-auth redirect.
 * Only these top-level routes are permitted targets.
 */
const ALLOWED_REDIRECT_PREFIXES = [
  '/home',
  '/onboarding',
  '/roadmap',
  '/review',
  '/profile',
  '/admin',
]

/**
 * Sanitize redirect path to prevent open redirect attacks.
 * Decodes URL-encoded characters before validation to block encoding bypass.
 * Only allows paths matching the whitelist prefixes.
 */
function sanitizeRedirectPath(path: string): string {
  // Iteratively decode to prevent double-encoding bypass (%252F%252F → %2F%2F → //)
  let decoded = path
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    } catch {
      return '/home'
    }
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) {
    return '/home'
  }

  // Whitelist check: path must start with one of the allowed prefixes
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) =>
      decoded === prefix || decoded.startsWith(`${prefix}/`) || decoded.startsWith(`${prefix}?`)
  )

  return isAllowed ? decoded : '/home'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next') ?? '/home')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user completed onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        // Redirect to onboarding if not completed
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
