import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { hideTimelineEvent } from '@/actions/hidden-timeline.actions'
import type { TimelineEvent } from '@/types/timeline'

interface HideTimelineEventInput {
  eventId: string
  eventType:
    | 'goal_status'
    | 'task_status'
    | 'profile_trait'
    | 'direction_change'
    | 'entity_activity'
    | 'ai_observation'
}

interface TimelineObservationsResponse {
  nodes: Array<{ id: string; [key: string]: unknown }>
  generated_at: string
}

export function useHideTimelineEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: HideTimelineEventInput) => {
      const res = await hideTimelineEvent(input)
      if (!res.success) {
        throw new Error('Failed to hide event')
      }
      return res.data
    },
    onMutate: async (input) => {
      // Cancel related queries
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.timeline.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.insights.timelineObservations }),
      ])

      // Snapshot previous data
      const previousTimeline = queryClient.getQueryData<TimelineEvent[]>(queryKeys.timeline.all)
      const previousObservations = queryClient.getQueryData<TimelineObservationsResponse>(
        queryKeys.insights.timelineObservations
      )

      // Optimistically remove from timeline events cache
      if (previousTimeline) {
        queryClient.setQueryData<TimelineEvent[]>(
          queryKeys.timeline.all,
          previousTimeline.filter((e) => e.id !== input.eventId)
        )
      }

      // Optimistically remove from AI observations cache
      if (previousObservations && input.eventType === 'ai_observation') {
        const nodeId = input.eventId.replace(/^ai-/, '')
        queryClient.setQueryData<TimelineObservationsResponse>(
          queryKeys.insights.timelineObservations,
          {
            ...previousObservations,
            nodes: previousObservations.nodes.filter((n) => n.id !== nodeId),
          }
        )
      }

      return { previousTimeline, previousObservations }
    },
    onError: (_err, _input, context) => {
      if (context?.previousTimeline) {
        queryClient.setQueryData(queryKeys.timeline.all, context.previousTimeline)
      }
      if (context?.previousObservations) {
        queryClient.setQueryData(
          queryKeys.insights.timelineObservations,
          context.previousObservations
        )
      }
      toast.error('항목을 숨기지 못했어요')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights.timelineObservations })
    },
  })
}
