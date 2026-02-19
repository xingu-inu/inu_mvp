'use client'

import { BotMessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAiChatStore } from '@/stores/ai-chat.store'
import type { ChatContext } from '@/types/entities'

interface AiChatButtonProps {
  context: ChatContext
  variant?: 'card' | 'icon'
  className?: string
}

export function AiChatButton({ context, variant = 'card', className }: AiChatButtonProps) {
  const openChatWithContext = useAiChatStore((s) => s.openChatWithContext)

  const handleClick = () => {
    openChatWithContext(context)
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-500)]',
          className
        )}
        title="이누에게 물어보기"
      >
        <BotMessageSquare className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg bg-[var(--color-primary-50)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-primary-100)]',
        className
      )}
    >
      <BotMessageSquare className="h-4 w-4 shrink-0 text-[var(--color-primary-500)]" />
      <span className="text-sm font-medium text-[var(--color-primary-600)]">이누에게 물어보기</span>
    </button>
  )
}
