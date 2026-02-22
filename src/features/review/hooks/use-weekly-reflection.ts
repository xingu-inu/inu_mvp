'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getWeeklyReflection, saveWeeklyReflection } from '@/actions'
import type { WeeklyReflection, CreateWeeklyReflectionInput } from '@/types/entities'

/**
 * Hook for fetching a week's reflection
 * @param weekStart - Week start date (YYYY-MM-DD), Monday of the week
 */
export function useWeeklyReflection(weekStart?: string) {
  return useQuery<WeeklyReflection | null>({
    queryKey: queryKeys.review.weeklyReflection(weekStart ?? ''),
    staleTime: STALE_TIMES.REVIEW,
    queryFn: async () => {
      if (!weekStart) return null
      const response = await getWeeklyReflection(weekStart)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!weekStart,
  })
}

interface SaveWeeklyReflectionInput {
  highlight?: string
  challenge?: string
  next_focus?: string
}

/**
 * Hook for saving weekly reflection
 * @param weekStart - Week start date (YYYY-MM-DD)
 */
export function useSaveWeeklyReflection(weekStart?: string) {
  const queryClient = useQueryClient()
  const computedWeekStart = weekStart ?? ''

  return useMutation({
    mutationFn: async (input: SaveWeeklyReflectionInput) => {
      const data: CreateWeeklyReflectionInput = {
        week_start: computedWeekStart,
        ...input,
      }
      const response = await saveWeeklyReflection(data)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },

    onMutate: async (newReflection) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.review.weeklyReflection(computedWeekStart),
      })
      const previousData = queryClient.getQueryData<WeeklyReflection | null>(
        queryKeys.review.weeklyReflection(computedWeekStart)
      )

      queryClient.setQueryData(
        queryKeys.review.weeklyReflection(computedWeekStart),
        (old: WeeklyReflection | null | undefined) =>
          old
            ? { ...old, ...newReflection }
            : {
                id: 'temp',
                user_id: '',
                week_start: computedWeekStart,
                highlight: newReflection.highlight || null,
                challenge: newReflection.challenge || null,
                next_focus: newReflection.next_focus || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
      )

      return { previousData }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(
          queryKeys.review.weeklyReflection(computedWeekStart),
          context.previousData
        )
      }
      toast.error('주간 회고 저장에 실패했습니다', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },

    onSuccess: () => {
      toast.success('주간 회고가 저장되었습니다')
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.review.weeklyReflection(computedWeekStart),
      })
    },
  })
}
