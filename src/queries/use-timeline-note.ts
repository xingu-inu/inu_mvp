import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { upsertTimelineNote } from '@/actions/timeline-note.actions'
import type { TimelineAiNode } from '@/types/timeline'

interface UpsertTimelineNoteInput {
  observationKey: string
  content: string
  eventContext?: Record<string, unknown>
}

interface TimelineObservationsResponse {
  nodes: TimelineAiNode[]
  generated_at: string
}

export function useUpsertTimelineNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertTimelineNoteInput) => {
      const res = await upsertTimelineNote(input)
      if (!res.success) {
        throw new Error('Failed to save note')
      }
      return res.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.insights.timelineObservations })

      const previous = queryClient.getQueryData<TimelineObservationsResponse>(
        queryKeys.insights.timelineObservations
      )

      if (previous) {
        queryClient.setQueryData<TimelineObservationsResponse>(
          queryKeys.insights.timelineObservations,
          {
            ...previous,
            nodes: previous.nodes.map((node) =>
              node.id === input.observationKey
                ? { ...node, userResponse: input.content, respondedAt: new Date().toISOString() }
                : node
            ),
          }
        )
      }

      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.insights.timelineObservations, context.previous)
      }
      toast.error('답변을 저장하지 못했어요')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insights.timelineObservations })
    },
  })
}
