import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authRoute } from '@/lib/security'
import { getOAuth2Client, GOOGLE_CALENDAR_SCOPES } from '@/lib/google-calendar'

export const GET = authRoute(
  'gcal.authorize',
  async (): Promise<NextResponse> => {
    const state = crypto.randomUUID()
    const cookieStore = await cookies()
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    const auth = getOAuth2Client()
    const url = auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_CALENDAR_SCOPES,
      state,
    })

    return NextResponse.redirect(url)
  },
  { rateLimit: { limit: 5 } }
)
