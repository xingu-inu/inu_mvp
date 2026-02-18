import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAllMessages as getAllMessagesAction,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
} from '@/actions'
import type { AIMessage } from '@/types/entities'

/**
 * 전체 메시지 조회 wrapper
 */
async function fetchAllMessages(): Promise<AIMessage[]> {
  const response = await getAllMessagesAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 전체 AI 메시지 조회 hook
 */
export function useAIMessages() {
  return useQuery({
    queryKey: queryKeys.aiMessages.all,
    queryFn: fetchAllMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
  })
}

/**
 * 읽지 않은 메시지 조회 hook (useAIMessages에서 derive — 추가 서버 호출 없음)
 */
export function useUnreadMessages() {
  return useQuery({
    queryKey: queryKeys.aiMessages.all,
    queryFn: fetchAllMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
    select: (messages) => messages.filter((m) => !m.is_read),
  })
}

/**
 * 읽지 않은 메시지 수 조회 hook (useAIMessages에서 derive — 추가 서버 호출 없음)
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.aiMessages.all,
    queryFn: fetchAllMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
    select: (messages) => messages.filter((m) => !m.is_read).length,
  })
}

/**
 * 메시지 읽음 처리 hook (Optimistic Update)
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await markAsReadAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiMessages.all })

      const previousAll = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.all)

      // Optimistic: mark as read in the base cache (derived queries auto-update)
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
        )
      }

      return { previousAll }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
      toast.error('메시지 읽음 처리에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiMessages.all })
    },
  })
}

/**
 * 모든 메시지 읽음 처리 hook (Optimistic Update)
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await markAllAsReadAction()
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiMessages.all })

      const previousAll = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.all)

      // Optimistic: mark all as read in the base cache
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => ({ ...msg, is_read: true }))
        )
      }

      return { previousAll }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
      toast.error('메시지 읽음 처리에 실패했습니다.')
    },
    onSuccess: () => {
      toast.success('모든 메시지를 읽음 처리했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiMessages.all })
    },
  })
}
