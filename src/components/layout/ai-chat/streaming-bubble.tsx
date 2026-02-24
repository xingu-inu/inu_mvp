'use client'

import { memo } from 'react'
import type { UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import { getMessageText } from './chat-utils'

export const StreamingBubble = memo(function StreamingBubble({
  message,
  isLastStreaming,
}: {
  message: UIMessage
  isLastStreaming?: boolean
}) {
  const isUser = message.role === 'user'
  const text = getMessageText(message)

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-[var(--color-primary-500)] text-white'
            : 'rounded-bl-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
        )}
      >
        <p className="break-words whitespace-pre-wrap">
          {text}
          {isLastStreaming && (
            <span className="ml-0.5 inline-block h-[1em] w-[3px] animate-pulse rounded-full bg-current align-middle opacity-70" />
          )}
        </p>
      </div>
    </div>
  )
})
