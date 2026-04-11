'use client'

import { memo } from 'react'
import type { UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2 } from 'lucide-react'
import {
  getMessageText,
  isProposalPart,
  isTraitSuggestionPart,
  isResponseChipsPart,
  isOpeningPart,
} from './chat-utils'
import { OpeningChips } from './opening-chips'
import { ProposalCard } from './proposal-card'
import { ResponseChips } from './response-chips'
import { TraitSuggestionCard } from './trait-suggestion-card'

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-1 list-disc pl-4">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-1 list-decimal pl-4">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="my-0.5">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-black/10 p-2 text-xs">{children}</code>
      )
    }
    return <code className="rounded bg-black/10 px-1 py-0.5 text-xs">{children}</code>
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-1">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-1 border-l-2 border-current/20 pl-3 opacity-80">
      {children}
    </blockquote>
  ),
}

export const StreamingBubble = memo(function StreamingBubble({
  message,
  isLastStreaming,
  isLastMessage,
  onSendMessage,
  onFocusInput,
}: {
  message: UIMessage
  isLastStreaming?: boolean
  isLastMessage?: boolean
  onSendMessage?: (text: string) => void
  onFocusInput?: (hint: string) => void
}) {
  const isUser = message.role === 'user'

  // User messages: simple text render
  if (isUser) {
    const text = getMessageText(message)
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-primary-500)] px-3.5 py-2.5 text-sm leading-relaxed text-white">
          <p className="break-words whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  // Assistant messages: iterate parts to detect tool invocations
  const parts = message.parts ?? []
  const hasToolCard = parts.some(
    (p) =>
      isProposalPart(p) || isTraitSuggestionPart(p) || isResponseChipsPart(p) || isOpeningPart(p)
  )

  // If no tool card parts, render the simple way (text only)
  if (!hasToolCard) {
    const text = getMessageText(message)
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--color-text-primary)]">
          <div className="ai-markdown break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {text}
            </ReactMarkdown>
            {isLastStreaming && <StreamingCursor />}
          </div>
        </div>
      </div>
    )
  }

  // Has proposal parts: render each part separately
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {parts.map((part, i) => {
          // Text parts
          if (part.type === 'text' && part.text.trim()) {
            return (
              <div
                key={i}
                className="rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--color-text-primary)]"
              >
                <div className="ai-markdown break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {part.text}
                  </ReactMarkdown>
                  {isLastStreaming && i === parts.length - 1 && <StreamingCursor />}
                </div>
              </div>
            )
          }

          // Proposal tool parts
          if (isProposalPart(part)) {
            if (part.state === 'output-available' && part.output != null) {
              return <ProposalCard key={part.toolCallId} output={part.output} />
            }
            return (
              <div
                key={part.toolCallId}
                className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)]"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>구조를 정리하는 중...</span>
              </div>
            )
          }

          // Trait suggestion tool parts
          if (isTraitSuggestionPart(part)) {
            if (part.state === 'output-available' && part.output != null) {
              return <TraitSuggestionCard key={part.toolCallId} output={part.output} />
            }
            return (
              <div
                key={part.toolCallId}
                className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)]"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>프로필을 정리하는 중...</span>
              </div>
            )
          }

          // Response chips tool parts
          if (isResponseChipsPart(part)) {
            if (part.state === 'output-available' && part.output != null && onSendMessage) {
              const out = part.output as Record<string, unknown>
              const chips = Array.isArray(out.chips) ? out.chips : null
              const multi = typeof out.multi === 'boolean' ? out.multi : false
              if (chips && chips.length > 0) {
                return (
                  <ResponseChips
                    key={part.toolCallId}
                    chips={chips as { label: string; message: string }[]}
                    multi={multi}
                    onSend={onSendMessage}
                    disabled={!isLastMessage || isLastStreaming}
                  />
                )
              }
            }
            return null
          }

          // Opening chips tool parts (오프닝 모드 첫 멘트)
          if (isOpeningPart(part)) {
            if (part.state !== 'output-available' || part.output == null) {
              return (
                <div
                  key={part.toolCallId}
                  className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[var(--color-bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)]"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>첫 멘트를 고르는 중...</span>
                </div>
              )
            }
            if (!onSendMessage || !onFocusInput) return null
            return (
              <OpeningChips
                key={part.toolCallId}
                data={part.output}
                onSend={onSendMessage}
                onFocusInput={onFocusInput}
                disabled={!isLastMessage || isLastStreaming}
              />
            )
          }

          return null
        })}
      </div>
    </div>
  )
})

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-[1em] w-[3px] animate-pulse rounded-full bg-current align-middle opacity-70" />
  )
}
