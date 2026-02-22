import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authRoute } from '@/lib/security'
import { fetchGoogleEvents } from '@/lib/google-calendar'
import type { GoogleCalendarEventsResponse } from '@/types/google-calendar'

const querySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
})

export const GET = authRoute(
  'gcal.events',
  async (ctx): Promise<NextResponse<GoogleCalendarEventsResponse>> => {
    const { searchParams } = new URL(ctx.request.url)
    const parsed = querySchema.safeParse({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    })

    if (!parsed.success) {
      return NextResponse.json({ events: [], connected: false }, { status: 400 })
    }

    const { start, end } = parsed.data

    const { data: connection } = await ctx.supabase
      .from('google_calendar_connections')
      .select('id, sync_enabled')
      .eq('user_id', ctx.user.id)
      .single()

    if (!connection) {
      return NextResponse.json({ events: [], connected: false })
    }

    try {
      const events = await fetchGoogleEvents(ctx.supabase, ctx.user.id, start, end)
      return NextResponse.json({ events, connected: true })
    } catch {
      return NextResponse.json({ events: [], connected: true })
    }
  },
  { rateLimit: { limit: 30 } }
)
