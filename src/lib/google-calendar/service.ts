import { calendar } from '@googleapis/calendar'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import type { GoogleCalendarEvent } from '@/types/google-calendar'
import { getAuthenticatedClient } from './client'

function parseMinutes(dateTime: string): number {
  const d = new Date(dateTime)
  return d.getHours() * 60 + d.getMinutes()
}

function parseDuration(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000)
}

function toDateStr(dateTime: string | undefined, date: string | undefined): string {
  if (date) return date
  if (dateTime) return dateTime.slice(0, 10)
  return ''
}

export async function fetchGoogleEvents(
  supabase: TypedSupabaseClient,
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  try {
    const auth = await getAuthenticatedClient(supabase, userId)
    if (!auth) return []

    const cal = calendar({ version: 'v3', auth })
    const response = await cal.events.list({
      calendarId: 'primary',
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const items = response.data.items ?? []

    return items
      .filter((item) => item.id && item.status !== 'cancelled')
      .map((item) => {
        const isAllDay = Boolean(item.start?.date && !item.start?.dateTime)
        const startDt = item.start?.dateTime
        const endDt = item.end?.dateTime

        return {
          id: item.id!,
          summary: item.summary ?? '(제목 없음)',
          description: item.description ?? undefined,
          start: {
            dateTime: item.start?.dateTime ?? undefined,
            date: item.start?.date ?? undefined,
          },
          end: {
            dateTime: item.end?.dateTime ?? undefined,
            date: item.end?.date ?? undefined,
          },
          htmlLink: item.htmlLink ?? '',
          isAllDay,
          startMinutes: startDt ? parseMinutes(startDt) : 0,
          durationMinutes: startDt && endDt ? parseDuration(startDt, endDt) : 1440,
          dateStr: toDateStr(item.start?.dateTime ?? undefined, item.start?.date ?? undefined),
        }
      })
  } catch (err) {
    console.error('[google-calendar] fetchGoogleEvents error:', err)
    return []
  }
}

interface GoogleEventInput {
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
}

export async function createGoogleEvent(
  supabase: TypedSupabaseClient,
  userId: string,
  event: GoogleEventInput
): Promise<string | null> {
  try {
    const auth = await getAuthenticatedClient(supabase, userId)
    if (!auth) return null

    const cal = calendar({ version: 'v3', auth })
    const response = await cal.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    return response.data.id ?? null
  } catch (err) {
    console.error('[google-calendar] createGoogleEvent error:', err)
    return null
  }
}

export async function updateGoogleEvent(
  supabase: TypedSupabaseClient,
  userId: string,
  eventId: string,
  event: Partial<GoogleEventInput>
): Promise<boolean> {
  try {
    const auth = await getAuthenticatedClient(supabase, userId)
    if (!auth) return false

    const cal = calendar({ version: 'v3', auth })
    await cal.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: event,
    })

    return true
  } catch (err) {
    console.error('[google-calendar] updateGoogleEvent error:', err)
    return false
  }
}

export async function deleteGoogleEvent(
  supabase: TypedSupabaseClient,
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const auth = await getAuthenticatedClient(supabase, userId)
    if (!auth) return false

    const cal = calendar({ version: 'v3', auth })
    await cal.events.delete({
      calendarId: 'primary',
      eventId,
    })

    return true
  } catch (err) {
    console.error('[google-calendar] deleteGoogleEvent error:', err)
    return false
  }
}
