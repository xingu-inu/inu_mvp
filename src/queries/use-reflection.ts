import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getDailyReflection as getReflectionAction,
  getReflectionsByDateRange as getReflectionsByRangeAction,
  createReflection as createReflectionAction,
  updateReflection as updateReflectionAction,
  deleteReflection as deleteReflectionAction,
} from '@/actions'
import type {
  DailyReflection,
  CreateReflectionInput,
  UpdateReflectionInput,
} from '@/types/entities'

/**
 * 특정 날짜 회고 조회 wrapper
 */
async function fetchReflection(date: string): Promise<DailyReflection | null> {
  const response = await getReflectionAction(date)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 날짜 범위 회고 조회 wrapper
 */
async function fetchReflectionsByRange(start: string, end: string): Promise<DailyReflection[]> {
  const response = await getReflectionsByRangeAction(start, end)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 특정 날짜 회고 조회 hook
 */
export function useReflection(date: string) {
  return useQuery({
    queryKey: queryKeys.reflections.byDate(date),
    queryFn: () => fetchReflection(date),
    staleTime: STALE_TIMES.STATS,
  })
}

/**
 * 날짜 범위 회고 조회 hook
 */
export function useReflectionRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.reflections.byRange(start, end),
    queryFn: () => fetchReflectionsByRange(start, end),
    staleTime: STALE_TIMES.STATS,
  })
}

/**
 * 회고 생성 hook (Optimistic Update)
 */
export function useCreateReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReflectionInput) => {
      const response = await createReflectionAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      const dateKey = queryKeys.reflections.byDate(input.date)
      await queryClient.cancelQueries({ queryKey: dateKey })
      const previous = queryClient.getQueryData<DailyReflection | null>(dateKey)

      queryClient.setQueryData<DailyReflection | null>(dateKey, (prev) => ({
        id: prev?.id ?? 'optimistic',
        user_id: prev?.user_id ?? '',
        date: input.date,
        mood: input.mood ?? prev?.mood ?? null,
        summary: input.summary ?? prev?.summary ?? null,
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      return { previous, dateKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previous ?? null)
      }
      toast.error('저장에 실패했어요.')
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.byDate(input.date) })
    },
  })
}

/**
 * 회고 수정 hook (Optimistic Update)
 */
export function useUpdateReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdateReflectionInput
      date: string
    }) => {
      const response = await updateReflectionAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ input, date }) => {
      const dateKey = queryKeys.reflections.byDate(date)
      await queryClient.cancelQueries({ queryKey: dateKey })
      const previous = queryClient.getQueryData<DailyReflection | null>(dateKey)

      if (previous) {
        queryClient.setQueryData<DailyReflection | null>(dateKey, {
          ...previous,
          ...input,
          updated_at: new Date().toISOString(),
        })
      }

      return { previous, dateKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previous ?? null)
      }
      toast.error('수정에 실패했어요.')
    },
    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.byDate(date) })
    },
    onSuccess: () => {
      toast.success('기록이 수정되었습니다.')
    },
  })
}

/**
 * 회고 삭제 hook (Optimistic Update)
 */
export function useDeleteReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; date: string }) => {
      const response = await deleteReflectionAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async ({ date }) => {
      const dateKey = queryKeys.reflections.byDate(date)
      await queryClient.cancelQueries({ queryKey: dateKey })
      const previous = queryClient.getQueryData<DailyReflection | null>(dateKey)

      queryClient.setQueryData<DailyReflection | null>(dateKey, null)

      return { previous, dateKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previous ?? null)
      }
      toast.error('삭제에 실패했어요.')
    },
    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.byDate(date) })
    },
  })
}
