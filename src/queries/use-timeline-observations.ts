import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
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
    staleTime: STALE_TIMES.AI_ANALYSIS, // 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
