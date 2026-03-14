import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { publicRoute } from '@/lib/security'
import { getOAuth2Client } from '@/lib/google-calendar'

/**
 * Get safe origin for redirects, preventing Host header injection.
 * Always requires NEXT_PUBLIC_SITE_URL in production.
 */
function getSafeOrigin(requestUrl: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) return siteUrl.replace(/\/+$/, '') // strip trailing slash

  // Development-only fallback
  if (process.env.NODE_ENV === 'development') {
    return new URL(requestUrl).origin
  }

  // Production without SITE_URL configured — fail to safe default
  return 'https://localhost:3000'
}

export const GET = publicRoute(
  'gcal.callback',
  async (ctx): Promise<NextResponse> => {
    const { searchParams } = new URL(ctx.request.url)
    const origin = getSafeOrigin(ctx.request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    const cookieStore = await cookies()
    const storedState = cookieStore.get('google_oauth_state')?.value
    cookieStore.delete('google_oauth_state')

    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(`${origin}/roadmap?error=google_calendar_oauth_failed`)
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    try {
      const auth = getOAuth2Client()
      const { tokens } = await auth.getToken(code)

      await ctx.supabase.from('google_calendar_connections').upsert(
        {
          user_id: user.id,
          access_token: tokens.access_token ?? '',
          refresh_token: tokens.refresh_token ?? '',
          token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          calendar_id: 'primary',
          sync_enabled: true,
        },
        { onConflict: 'user_id' }
      )

      return NextResponse.redirect(`${origin}/roadmap?google_calendar=connected`)
    } catch {
      return NextResponse.redirect(`${origin}/roadmap?error=google_calendar_token_failed`)
    }
  },
  { rateLimit: { limit: 10 } }
)
