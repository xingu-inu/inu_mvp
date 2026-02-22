'use client'

import { useState, useRef, useEffect, useMemo, memo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Send, Square, Plus, PanelLeftClose, PanelLeftOpen, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/common/mascot'
import { useAiChatStore } from '@/stores/ai-chat.store'
import {
  useChatConversations,
  useChatMessages,
  useCreateConversation,
  useSaveChatMessage,
  useDeleteConversation,
} from '@/queries/use-chat'
import type { ChatMessage } from '@/types/entities'

const DEFAULT_QUICK_ACTIONS = [
  { label: '이번 주 인사이트', prompt: '이번 주 내 실천에 대해 인사이트를 줘' },
  { label: '목표 제안', prompt: '지금 내 상황에서 추가할만한 새 목표를 제안해줘' },
  { label: '동기 부여', prompt: '오늘 하루 동기 부여가 될 한마디 해줘' },
]

const GOAL_QUICK_ACTIONS = [
  { label: '진행 상황 분석', prompt: '이 목표의 진행 상황을 분석해줘' },
  { label: '다음 단계 제안', prompt: '이 목표를 위한 다음 단계를 제안해줘' },
  { label: '동기 부여', prompt: '이 목표를 계속할 수 있도록 동기 부여해줘' },
]

const TASK_QUICK_ACTIONS = [
  { label: '꾸준히 하는 팁', prompt: '이 할 일을 꾸준히 하려면 어떻게 해야 할까?' },
  { label: '시간 활용 조언', prompt: '이 할 일을 더 효과적으로 할 시간 활용법을 알려줘' },
  { label: '대안 제안', prompt: '이 할 일의 대안이나 보완 활동을 제안해줘' },
]

/** Convert DB ChatMessage[] to UIMessage[] */
function toUIMessages(dbMessages: ChatMessage[]): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    createdAt: new Date(m.created_at),
  }))
}

/** Extract text from UIMessage parts */
function getMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
    .replace(/[\u2588-\u258F]+$/, '')
}

export function AiChatPanel() {
  const activeConversationId = useAiChatStore((s) => s.activeConversationId)
  const setActiveConversation = useAiChatStore((s) => s.setActiveConversation)
  const isSidebarOpen = useAiChatStore((s) => s.isSidebarOpen)
  const toggleSidebar = useAiChatStore((s) => s.toggleSidebar)
  const startNewConversation = useAiChatStore((s) => s.startNewConversation)
  const context = useAiChatStore((s) => s.context)
  const clearContext = useAiChatStore((s) => s.clearContext)

  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSendingRef = useRef(false)

  // DB queries
  const { data: dbMessages } = useChatMessages(activeConversationId)
  const createConversation = useCreateConversation()
  const saveChatMessage = useSaveChatMessage()

  // Context body for API requests (recreated only when context changes)
  const contextBody = useMemo(() => {
    if (!context) return {}
    return {
      context: {
        type: context.type,
        goalId: context.goalId,
        goalName: context.goalName ?? context.entityName,
        taskId: context.type === 'task' ? context.entityId : undefined,
        taskName: context.type === 'task' ? context.entityName : undefined,
        areaName: context.areaName,
      },
    }
  }, [context])

  // Transport recreates when context changes (rare — only on goal/task chat entry)
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/ai/chat', body: contextBody }),
    [contextBody]
  )

  // Streaming chat
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport,
    onFinish: async ({ message }) => {
      if (!activeConversationId || message.role !== 'assistant') return
      const text = getMessageText(message)
      if (text) {
        await saveChatMessage.mutateAsync({
          conversationId: activeConversationId,
          role: 'assistant',
          content: text,
        })
      }
    },
    onError: () => {
      toast.error('메시지 전송에 실패했어요. 다시 시도해주세요.')
    },
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // Sync DB → useChat only when conversation changes (not during streaming)
  const prevConvRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (prevConvRef.current !== activeConversationId && !isStreaming) {
      if (activeConversationId === null || dbMessages !== undefined) {
        prevConvRef.current = activeConversationId
        setMessages(dbMessages ? toUIMessages(dbMessages) : [])
      }
    }
  }, [activeConversationId, dbMessages, setMessages, isStreaming])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on conversation change
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConversationId])

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming || isSendingRef.current) return
    isSendingRef.current = true
    const trimmed = text.trim()
    setInput('')

    try {
      let convId = activeConversationId
      if (!convId) {
        const conv = await createConversation.mutateAsync({
          relatedGoalId: context?.goalId,
          relatedTaskId: context?.type === 'task' ? context.entityId : undefined,
        })
        convId = conv.id
        prevConvRef.current = conv.id
        setActiveConversation(conv.id)
      }

      await saveChatMessage.mutateAsync({
        conversationId: convId,
        role: 'user',
        content: trimmed,
      })
      sendMessage({ text: trimmed })
    } catch {
      toast.error('대화를 시작하지 못했어요.')
      setInput(trimmed)
    } finally {
      isSendingRef.current = false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleNewChat = () => {
    startNewConversation()
    setMessages([])
    prevConvRef.current = undefined
    inputRef.current?.focus()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed z-50 flex overflow-hidden rounded-2xl bg-[var(--color-bg-primary)] shadow-2xl ring-1 ring-[var(--color-border)] transition-[width] duration-300',
        'right-6 bottom-24 h-[500px]',
        isSidebarOpen ? 'w-[640px]' : 'w-96',
        'max-lg:right-4 max-lg:bottom-36 max-lg:left-4 max-lg:w-auto'
      )}
    >
      {/* Sidebar (conversations) — desktop only */}
      <div
        className={cn(
          'hidden flex-col border-r border-[var(--color-border)] transition-[width,opacity] duration-300 lg:flex',
          isSidebarOpen ? 'w-[220px] opacity-100' : 'w-0 overflow-hidden opacity-0'
        )}
      >
        <div className="flex min-h-[45px] items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            대화 기록
          </span>
          <button
            onClick={handleNewChat}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
            title="새 대화"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            activeId={activeConversationId}
            onSelect={(id) => {
              setActiveConversation(id)
              inputRef.current?.focus()
            }}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex min-h-[45px] items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="hidden rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)] lg:block"
              title={isSidebarOpen ? '사이드바 닫기' : '대화 기록'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <span className="text-base">🐾</span>
            <h3 className="text-sm font-semibold">AI 이누</h3>
            {context && (
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-xs text-[var(--color-primary-600)]">
                <span>{context.type === 'goal' ? '🎯' : '✅'}</span>
                <span className="max-w-[120px] truncate" title={context.entityName}>
                  {context.entityName}
                </span>
                <button
                  onClick={clearContext}
                  className="rounded-full p-0.5 transition-colors hover:bg-[var(--color-primary-100)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <MobileHistoryButton />
            <button
              onClick={handleNewChat}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
              title="새 대화"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Mascot mood="happy" size="md" />
              <p className="text-center text-sm text-[var(--color-text-secondary)]">
                무엇이든 물어보세요
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {(context?.type === 'goal'
                  ? GOAL_QUICK_ACTIONS
                  : context?.type === 'task'
                    ? TASK_QUICK_ACTIONS
                    : DEFAULT_QUICK_ACTIONS
                ).map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <StreamingBubble
                  key={msg.id}
                  message={msg}
                  isLastStreaming={
                    isStreaming && msg.role === 'assistant' && i === messages.length - 1
                  }
                />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-1.5 px-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:300ms]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="메시지를 입력하세요..."
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)] disabled:opacity-50"
            />
            {isStreaming ? (
              <button
                onClick={() => stop()}
                className="rounded-lg bg-[var(--color-miss)] p-2 text-white transition-colors hover:bg-[var(--color-miss)]/80"
                title="중지"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="rounded-lg bg-[var(--color-primary-500)] p-2 text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Mobile conversation history dropdown (lg+ uses sidebar instead) */
function MobileHistoryButton() {
  const [isOpen, setIsOpen] = useState(false)
  const activeConversationId = useAiChatStore((s) => s.activeConversationId)
  const setActiveConversation = useAiChatStore((s) => s.setActiveConversation)

  return (
    <div className="relative lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
        title="대화 기록"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 z-20 mt-1 w-64 rounded-xl bg-[var(--color-bg-primary)] shadow-xl ring-1 ring-[var(--color-border)]">
            <div className="max-h-64 overflow-y-auto py-1">
              <ConversationList
                activeId={activeConversationId}
                onSelect={(id) => {
                  setActiveConversation(id)
                  setIsOpen(false)
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ConversationList({
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

const StreamingBubble = memo(function StreamingBubble({
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
