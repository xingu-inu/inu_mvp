'use client'

import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatConversations, useDeleteConversation } from '@/queries/use-chat'

export function ConversationList({
  activeId,
  onSelect,
}: {
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const { data: conversations, isLoading } = useChatConversations()
  const deleteConversation = useDeleteConversation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:300ms]" />
        </div>
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-8">
        <span className="text-lg">💬</span>
        <p className="text-center text-xs text-[var(--color-text-tertiary)]">
          아직 대화 기록이 없어요
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            'group flex items-center gap-1 px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]',
            activeId === conv.id && 'bg-[var(--color-bg-secondary)]'
          )}
        >
          <button
            onClick={() => onSelect(conv.id)}
            className="flex flex-1 flex-col gap-0.5 text-left"
          >
            <span className="line-clamp-1 text-xs font-medium text-[var(--color-text-primary)]">
              {conv.title}
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {formatDistanceToNow(new Date(conv.updated_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteConversation.mutate(conv.id)
            }}
            className="rounded-md p-0.5 text-[var(--color-text-tertiary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--color-text-secondary)]"
            title="삭제"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
