import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { publicRoute } from '@/lib/security'
import { getOAuth2Client } from '@/lib/google-calendar'

export const GET = publicRoute(
  'gcal.callback',
  async (ctx): Promise<NextResponse> => {
    const { searchParams, origin } = new URL(ctx.request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    const cookieStore = await cookies()
    const storedState = cookieStore.get('google_oauth_state')?.value

    if (!code || !state || state !== storedState) {
      return NextResponse.redirect(`${origin}/home?error=google_calendar_oauth_failed`)
    }

    cookieStore.delete('google_oauth_state')

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

      return NextResponse.redirect(`${origin}/home?google_calendar=connected`)
    } catch {
      return NextResponse.redirect(`${origin}/home?error=google_calendar_token_failed`)
    }
  },
  { rateLimit: { limit: 10 } }
)
