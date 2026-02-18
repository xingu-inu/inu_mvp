'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getMonthlyReflection, saveMonthlyReflection } from '@/actions'
import type { MonthlyReflection, CreateMonthlyReflectionInput } from '@/types/entities'

/**
 * Hook for fetching a month's reflection
 * @param monthStart - Month start date (YYYY-MM-DD), first day of month
 */
export function useMonthlyReflection(monthStart?: string) {
  return useQuery<MonthlyReflection | null>({
    queryKey: queryKeys.review.monthlyReflection(monthStart ?? ''),
    staleTime: STALE_TIMES.STATS,
    queryFn: async () => {
      if (!monthStart) return null
      const response = await getMonthlyReflection(monthStart)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    enabled: !!monthStart,
  })
}

interface SaveMonthlyReflectionInput {
  summary?: string
  highlight?: string
  challenge?: string
}

/**
 * Hook for saving monthly reflection
 * @param monthStart - Month start date (YYYY-MM-DD)
 */
export function useSaveMonthlyReflection(monthStart?: string) {
  const queryClient = useQueryClient()
  const computedMonthStart = monthStart ?? ''

  return useMutation({
    mutationFn: async (input: SaveMonthlyReflectionInput) => {
      const data: CreateMonthlyReflectionInput = {
        month_start: computedMonthStart,
        ...input,
      }
      const response = await saveMonthlyReflection(data)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },

    onMutate: async (newReflection) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.review.monthlyReflection(computedMonthStart),
      })
      const previousData = queryClient.getQueryData<MonthlyReflection | null>(
        queryKeys.review.monthlyReflection(computedMonthStart)
      )

      queryClient.setQueryData(
        queryKeys.review.monthlyReflection(computedMonthStart),
        (old: MonthlyReflection | null | undefined) =>
          old
            ? { ...old, ...newReflection }
            : {
                id: 'temp',
                user_id: '',
                month_start: computedMonthStart,
                summary: newReflection.summary || null,
                highlight: newReflection.highlight || null,
                challenge: newReflection.challenge || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
      )

      return { previousData }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(
          queryKeys.review.monthlyReflection(computedMonthStart),
          context.previousData
        )
      }
      toast.error('월간 회고 저장에 실패했습니다', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },

    onSuccess: () => {
      toast.success('한마디가 저장되었습니다')
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.review.monthlyReflection(computedMonthStart),
      })
    },
  })
}
