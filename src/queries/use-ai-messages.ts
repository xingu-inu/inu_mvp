import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAllMessages as getAllMessagesAction,
  getUnreadMessages as getUnreadMessagesAction,
  getUnreadCount as getUnreadCountAction,
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
 * 읽지 않은 메시지 조회 wrapper
 */
async function fetchUnreadMessages(): Promise<AIMessage[]> {
  const response = await getUnreadMessagesAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 읽지 않은 메시지 수 조회 wrapper
 */
async function fetchUnreadCount(): Promise<number> {
  const response = await getUnreadCountAction()
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
 * 읽지 않은 메시지 조회 hook
 */
export function useUnreadMessages() {
  return useQuery({
    queryKey: queryKeys.aiMessages.unread(),
    queryFn: fetchUnreadMessages,
    staleTime: STALE_TIMES.AI_MESSAGES,
  })
}

/**
 * 읽지 않은 메시지 수 조회 hook
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.aiMessages.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: STALE_TIMES.AI_MESSAGES,
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
      const previousUnread = queryClient.getQueryData<AIMessage[]>(queryKeys.aiMessages.unread())
      const previousCount = queryClient.getQueryData<number>(queryKeys.aiMessages.unreadCount())

      // Optimistic update
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
        )
      }
      if (previousUnread) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.unread(),
          previousUnread.filter((msg) => msg.id !== id)
        )
      }
      if (typeof previousCount === 'number') {
        queryClient.setQueryData<number>(
          queryKeys.aiMessages.unreadCount(),
          Math.max(0, previousCount - 1)
        )
      }

      return { previousAll, previousUnread, previousCount }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(queryKeys.aiMessages.unread(), context.previousUnread)
      }
      if (typeof context?.previousCount === 'number') {
        queryClient.setQueryData(queryKeys.aiMessages.unreadCount(), context.previousCount)
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
      const previousCount = queryClient.getQueryData<number>(queryKeys.aiMessages.unreadCount())

      // Optimistic: 모든 메시지를 읽음 처리
      if (previousAll) {
        queryClient.setQueryData<AIMessage[]>(
          queryKeys.aiMessages.all,
          previousAll.map((msg) => ({ ...msg, is_read: true }))
        )
      }
      queryClient.setQueryData(queryKeys.aiMessages.unread(), [])
      queryClient.setQueryData(queryKeys.aiMessages.unreadCount(), 0)

      return { previousAll, previousCount }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(queryKeys.aiMessages.all, context.previousAll)
      }
      if (typeof context?.previousCount === 'number') {
        queryClient.setQueryData(queryKeys.aiMessages.unreadCount(), context.previousCount)
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
