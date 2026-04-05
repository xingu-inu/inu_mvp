import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generateKeyBetween } from 'fractional-indexing'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAiInsights as getAiInsightsAction,
  createAiInsight as createAiInsightAction,
  updateAiInsight as updateAiInsightAction,
  deleteAiInsight as deleteAiInsightAction,
} from '@/actions'
import type { AiInsight, CreateAiInsightInput, UpdateAiInsightInput } from '@/types/entities'

async function fetchAiInsights(): Promise<AiInsight[]> {
  const response = await getAiInsightsAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * AI 인사이트 조회 hook
 */
export function useAiInsights() {
  return useQuery({
    queryKey: queryKeys.aiInsights.all,
    queryFn: fetchAiInsights,
    staleTime: STALE_TIMES.AI_INSIGHTS,
  })
}

/**
 * AI 인사이트 생성 hook (Optimistic Update)
 */
export function useCreateAiInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAiInsightInput) => {
      const response = await createAiInsightAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiInsights.all })
      const previous = queryClient.getQueryData<AiInsight[]>(queryKeys.aiInsights.all)

      const lastSortOrder = previous?.at(-1)?.sort_order ?? null
      const optimisticInsight: AiInsight = {
        id: crypto.randomUUID(),
        user_id: '',
        title: input.title,
        description: input.description,
        sort_order: generateKeyBetween(lastSortOrder, null),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<AiInsight[]>(queryKeys.aiInsights.all, [
        ...(previous ?? []),
        optimisticInsight,
      ])

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.aiInsights.all, context.previous)
      }
      toast.error('인사이트 추가에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}

/**
 * AI 인사이트 수정 hook (Optimistic Update)
 */
export function useUpdateAiInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAiInsightInput }) => {
      const response = await updateAiInsightAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiInsights.all })
      const previous = queryClient.getQueryData<AiInsight[]>(queryKeys.aiInsights.all)

      if (previous) {
        queryClient.setQueryData<AiInsight[]>(
          queryKeys.aiInsights.all,
          previous.map((i) =>
            i.id === id ? { ...i, ...input, updated_at: new Date().toISOString() } : i
          )
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.aiInsights.all, context.previous)
      }
      toast.error('인사이트 수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}

/**
 * AI 인사이트 삭제 hook (Optimistic Update)
 */
export function useDeleteAiInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteAiInsightAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiInsights.all })
      const previous = queryClient.getQueryData<AiInsight[]>(queryKeys.aiInsights.all)

      if (previous) {
        queryClient.setQueryData<AiInsight[]>(
          queryKeys.aiInsights.all,
          previous.filter((i) => i.id !== id)
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.aiInsights.all, context.previous)
      }
      toast.error('인사이트 삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}
