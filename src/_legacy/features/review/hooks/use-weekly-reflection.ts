'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getWeeklyReflection, saveWeeklyReflection } from '@/actions'
import type { WeeklyReflection, CreateWeeklyReflectionInput } from '@/types/entities'
import {
  buildReflectionOnMutate,
  buildReflectionOnError,
  buildReflectionOnSettled,
} from './reflection-mutation-helpers'

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
  const queryKey = queryKeys.review.weeklyReflection(computedWeekStart)

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

    onMutate: buildReflectionOnMutate<WeeklyReflection, SaveWeeklyReflectionInput>(
      queryClient,
      queryKey,
      (input) => ({
        id: 'temp',
        user_id: '',
        week_start: computedWeekStart,
        highlight: input.highlight || null,
        challenge: input.challenge || null,
        next_focus: input.next_focus || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),

    onError: buildReflectionOnError<WeeklyReflection>(
      queryClient,
      queryKey,
      '주간 회고 저장에 실패했습니다'
    ),

    onSuccess: () => {
      toast.success('주간 회고가 저장되었습니다')
    },

    onSettled: buildReflectionOnSettled(queryClient, queryKey),
  })
}
