'use client'

import { memo } from 'react'
import type { UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
        {isUser ? (
          <p className="break-words whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="ai-markdown break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-')
                  if (isBlock) {
                    return (
                      <code className="block overflow-x-auto rounded-md bg-black/10 p-2 text-xs">
                        {children}
                      </code>
                    )
                  }
                  return <code className="rounded bg-black/10 px-1 py-0.5 text-xs">{children}</code>
                },
                pre: ({ children }) => <pre className="my-1">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="my-1 border-l-2 border-current/20 pl-3 opacity-80">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
            {isLastStreaming && (
              <span className="ml-0.5 inline-block h-[1em] w-[3px] animate-pulse rounded-full bg-current align-middle opacity-70" />
            )}
          </div>
        )}
      </div>
    </div>
  )
})
