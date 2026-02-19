import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected routes - require authentication
const protectedPaths = [
  '/home',
  '/roadmap',
  '/calendar',
  '/review',
  '/search',
  '/profile',
  '/ai-hub',
  '/admin',
]

// Routes that require onboarding completion
const requiresOnboardingPaths = ['/home', '/roadmap', '/calendar', '/review', '/search', '/ai-hub']

// API routes that should be public
const publicApiPaths = ['/api/health', '/api/auth/callback']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, _next, and PostHog ingest proxy
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/ingest') ||
    pathname.includes('.') // static files like .ico, .png, etc.
  ) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Create Supabase client
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
            })
          )
        },
      },
    }
  )

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
  const isOnboardingPath = pathname.startsWith('/onboarding')
  const requiresOnboarding = requiresOnboardingPaths.some((path) => pathname.startsWith(path))
  const isAuthPath = pathname === '/login' || pathname === '/signup'

  // Not logged in + trying to access protected route → redirect to login
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Not logged in + trying to access onboarding → redirect to login
  if (!user && isOnboardingPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Single profile query for all logged-in branches ──
  const isAdminPath = pathname.startsWith('/admin')
  const needsProfile =
    user &&
    (isAdminPath || isAuthPath || requiresOnboarding || isOnboardingPath || pathname === '/')

  let profile: { onboarding_completed: boolean; is_admin: boolean } | null = null
  if (needsProfile) {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed, is_admin')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Admin route protection — require is_admin flag
  if (user && isAdminPath) {
    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  // Logged in + on auth pages → redirect to today (or onboarding if not completed)
  if (user && isAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = profile?.onboarding_completed ? '/home' : '/onboarding'
    return NextResponse.redirect(url)
  }

  // Logged in + on protected route that requires onboarding → check onboarding status
  if (user && requiresOnboarding) {
    if (!profile?.onboarding_completed) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Logged in + onboarding completed + on onboarding page → redirect to today
  if (user && isOnboardingPath) {
    if (profile?.onboarding_completed) {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  // Root path redirect (logged-in users only; unauthenticated users see landing page)
  if (pathname === '/' && user) {
    const url = request.nextUrl.clone()
    url.pathname = profile?.onboarding_completed ? '/home' : '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
