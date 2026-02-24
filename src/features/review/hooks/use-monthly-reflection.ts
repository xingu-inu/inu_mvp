'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getMonthlyReflection, saveMonthlyReflection } from '@/actions'
import type { MonthlyReflection, CreateMonthlyReflectionInput } from '@/types/entities'
import {
  buildReflectionOnMutate,
  buildReflectionOnError,
  buildReflectionOnSettled,
} from './reflection-mutation-helpers'

/**
 * Hook for fetching a month's reflection
 * @param monthStart - Month start date (YYYY-MM-DD), first day of month
 */
export function useMonthlyReflection(monthStart?: string) {
  return useQuery<MonthlyReflection | null>({
    queryKey: queryKeys.review.monthlyReflection(monthStart ?? ''),
    staleTime: STALE_TIMES.REVIEW,
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
  const queryKey = queryKeys.review.monthlyReflection(computedMonthStart)

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

    onMutate: buildReflectionOnMutate<MonthlyReflection, SaveMonthlyReflectionInput>(
      queryClient,
      queryKey,
      (input) => ({
        id: 'temp',
        user_id: '',
        month_start: computedMonthStart,
        summary: input.summary || null,
        highlight: input.highlight || null,
        challenge: input.challenge || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),

    onError: buildReflectionOnError<MonthlyReflection>(
      queryClient,
      queryKey,
      '월간 회고 저장에 실패했습니다'
    ),

    onSuccess: () => {
      toast.success('한마디가 저장되었습니다')
    },

    onSettled: buildReflectionOnSettled(queryClient, queryKey),
  })
}
