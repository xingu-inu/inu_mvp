'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getGoalReflection, saveGoalReflection } from '@/actions'
import type { GoalReflection, CreateGoalReflectionInput, MoodLevel } from '@/types/entities'

export function useGoalReflection(goalId: string, periodStart: string, periodEnd: string) {
  return useQuery<GoalReflection | null>({
    queryKey: queryKeys.review.goalReflection(goalId, periodStart, periodEnd),
    staleTime: STALE_TIMES.STATS,
    queryFn: async () => {
      if (!goalId || !periodStart || !periodEnd) return null
      const response = await getGoalReflection({ goalId, periodStart, periodEnd })
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    enabled: !!goalId && !!periodStart && !!periodEnd,
  })
}

interface SaveGoalReflectionInput {
  summary?: string
  progress_feeling?: MoodLevel
  next_focus?: string
}

export function useSaveGoalReflection(goalId: string, periodStart: string, periodEnd: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveGoalReflectionInput) => {
      const data: CreateGoalReflectionInput = {
        goal_id: goalId,
        period_start: periodStart,
        period_end: periodEnd,
        ...input,
      }
      const response = await saveGoalReflection(data)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },

    onMutate: async (newReflection) => {
      const qk = queryKeys.review.goalReflection(goalId, periodStart, periodEnd)
      await queryClient.cancelQueries({ queryKey: qk })
      const previousData = queryClient.getQueryData<GoalReflection | null>(qk)

      queryClient.setQueryData(qk, (old: GoalReflection | null | undefined) =>
        old
          ? { ...old, ...newReflection }
          : {
              id: 'temp',
              user_id: '',
              goal_id: goalId,
              period_start: periodStart,
              period_end: periodEnd,
              summary: newReflection.summary ?? null,
              progress_feeling: newReflection.progress_feeling ?? null,
              next_focus: newReflection.next_focus ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
      )

      return { previousData }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(
          queryKeys.review.goalReflection(goalId, periodStart, periodEnd),
          context.previousData
        )
      }
      toast.error('목표 회고 저장에 실패했습니다', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },

    onSuccess: () => {
      toast.success('목표 회고가 저장되었습니다')
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.review.goalReflection(goalId, periodStart, periodEnd),
      })
    },
  })
}
