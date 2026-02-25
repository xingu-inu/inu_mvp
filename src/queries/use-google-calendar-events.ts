import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { useGoogleCalendarConnection } from './use-google-calendar-connection'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import type { GoogleCalendarEvent } from '@/types/google-calendar'

/**
 * Google Calendar 이벤트 조회 hook (주간)
 * @param weekStartStr - 주 시작일 (YYYY-MM-DD)
 */
export function useGoogleCalendarEvents(weekStartStr: string) {
  const { data: connection } = useGoogleCalendarConnection()
  const isConnected = !!connection?.sync_enabled

  // +7 days (not +6): Google Calendar timeMax is exclusive, so we need the day AFTER the week
  const weekEndStr = format(addDays(new Date(weekStartStr), 7), 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.googleCalendar.events(weekStartStr),
    queryFn: async (): Promise<GoogleCalendarEvent[]> => {
      const res = await fetch(`/api/google-calendar/events?start=${weekStartStr}&end=${weekEndStr}`)
      if (!res.ok) return []
      const data = (await res.json()) as { events?: GoogleCalendarEvent[] }
      return data.events ?? []
    },
    staleTime: STALE_TIMES.GOOGLE_CALENDAR,
    refetchOnWindowFocus: true,
    enabled: isConnected,
  })
}
