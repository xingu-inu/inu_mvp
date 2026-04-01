import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { TimelineAiNode } from '@/types/timeline'

interface TimelineObservationsResponse {
  nodes: TimelineAiNode[]
  generated_at: string
}

export function useTimelineObservations() {
  return useQuery({
    queryKey: queryKeys.insights.timelineObservations,
    queryFn: async (): Promise<TimelineObservationsResponse> => {
      const res = await fetch('/api/ai/timeline-observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch timeline observations')
      }

      const json = (await res.json()) as {
        success: boolean
        data?: TimelineObservationsResponse
        error?: { message: string }
      }
      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to fetch timeline observations')
      }

      return json.data
    },
    // Server returns DB-cached data instantly — short staleTime for freshness
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    // Keep previous data visible during background refetch
    placeholderData: keepPreviousData,
  })
}
