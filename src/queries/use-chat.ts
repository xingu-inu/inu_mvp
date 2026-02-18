import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getChatConversations as getChatConversationsAction,
  getChatMessages as getChatMessagesAction,
  createChatConversation as createChatConversationAction,
  saveChatMessage as saveChatMessageAction,
  deleteChatConversation as deleteChatConversationAction,
} from '@/actions'
import type { ChatConversation, ChatMessage } from '@/types/entities'

/**
 * Fetch wrappers
 */
async function fetchConversations(): Promise<ChatConversation[]> {
  const response = await getChatConversationsAction()
  if (!response.success) throw new Error(response.error.message)
  return response.data
}

async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const response = await getChatMessagesAction(conversationId)
  if (!response.success) throw new Error(response.error.message)
  return response.data
}

/**
 * 대화 목록
 */
export function useChatConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: fetchConversations,
    staleTime: STALE_TIMES.CHAT_CONVERSATIONS,
  })
}

/**
 * 특정 대화의 메시지
 */
export function useChatMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: STALE_TIMES.CHAT_MESSAGES,
  })
}

/**
 * 새 대화 생성
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (title?: string) => {
      const response = await createChatConversationAction(title)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    },
  })
}

/**
 * 메시지 저장 (optimistic update)
 */
export function useSaveChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      role,
      content,
    }: {
      conversationId: string
      role: 'user' | 'assistant'
      content: string
    }) => {
      const response = await saveChatMessageAction(conversationId, role, content)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onMutate: async ({ conversationId, role, content }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(conversationId),
      })
      const previous = queryClient.getQueryData<ChatMessage[]>(
        queryKeys.chat.messages(conversationId)
      )
      queryClient.setQueryData<ChatMessage[]>(queryKeys.chat.messages(conversationId), (old) => [
        ...(old ?? []),
        {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role,
          content,
          created_at: new Date().toISOString(),
        },
      ])
      return { previous, conversationId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chat.messages(context.conversationId), context.previous)
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.conversationId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    },
  })
}

/**
 * 대화 삭제
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await deleteChatConversationAction(conversationId)
      if (!response.success) throw new Error(response.error.message)
    },
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.conversations })
      const previous = queryClient.getQueryData<ChatConversation[]>(queryKeys.chat.conversations)
      queryClient.setQueryData<ChatConversation[]>(
        queryKeys.chat.conversations,
        (old) => old?.filter((c) => c.id !== conversationId) ?? []
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chat.conversations, context.previous)
      }
      toast.error('삭제에 실패했어요')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    },
  })
}
