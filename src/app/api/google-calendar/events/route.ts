import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchGoogleEvents } from '@/lib/google-calendar'
import type { GoogleCalendarEventsResponse } from '@/types/google-calendar'

export async function GET(request: Request): Promise<NextResponse<GoogleCalendarEventsResponse>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ events: [], connected: false }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ events: [], connected: false }, { status: 400 })
  }

  const { data: connection } = await supabase
    .from('google_calendar_connections')
    .select('id, sync_enabled')
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ events: [], connected: false })
  }

  try {
    const events = await fetchGoogleEvents(supabase, user.id, start, end)
    return NextResponse.json({ events, connected: true })
  } catch {
    return NextResponse.json({ events: [], connected: true })
  }
}
