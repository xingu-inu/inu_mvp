import { useQuery } from '@tanstack/react-query'
import { getGoogleCalendarConnection } from '@/actions/google-calendar.actions'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import type { GoogleCalendarConnection } from '@/types/google-calendar'

/**
 * Google Calendar 연결 상태 조회 hook
 */
export function useGoogleCalendarConnection() {
  return useQuery({
    queryKey: queryKeys.googleCalendar.connection(),
    queryFn: async (): Promise<GoogleCalendarConnection | null> => {
      const result = await getGoogleCalendarConnection()
      if (!result.success) {
        throw new Error(result.error?.message ?? 'Failed to fetch Google Calendar connection')
      }
      return result.data
    },
    staleTime: STALE_TIMES.GOOGLE_CALENDAR_CONNECTION,
  })
}
