'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { Send, Plus, PanelLeftClose, PanelLeftOpen, Trash2, X } from 'lucide-react'
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

export function AiChatPanel() {
  const isLoading = useAiChatStore((s) => s.isLoading)
  const setLoading = useAiChatStore((s) => s.setLoading)
  const activeConversationId = useAiChatStore((s) => s.activeConversationId)
  const setActiveConversation = useAiChatStore((s) => s.setActiveConversation)
  const isSidebarOpen = useAiChatStore((s) => s.isSidebarOpen)
  const toggleSidebar = useAiChatStore((s) => s.toggleSidebar)
  const startNewConversation = useAiChatStore((s) => s.startNewConversation)
  const context = useAiChatStore((s) => s.context)
  const clearContext = useAiChatStore((s) => s.clearContext)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: messages } = useChatMessages(activeConversationId)
  const createConversation = useCreateConversation()
  const saveChatMessage = useSaveChatMessage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConversationId])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const trimmed = text.trim()
    setInput('')
    setLoading(true)

    try {
      let convId = activeConversationId
      let isNewConversation = false
      if (!convId) {
        const conv = await createConversation.mutateAsync({
          relatedGoalId: context?.goalId,
          relatedTaskId: context?.type === 'task' ? context.entityId : undefined,
        })
        convId = conv.id
        isNewConversation = true
      }

      await saveChatMessage.mutateAsync({
        conversationId: convId,
        role: 'user',
        content: trimmed,
      })

      // 새 대화인 경우: optimistic 데이터가 캐시에 채워진 후 활성화해야 깜빡임 없음
      if (isNewConversation) {
        setActiveConversation(convId)
      }

      const allMessages = [
        ...(messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ]

      // 첫 메시지일 때만 context 전달 (이후는 히스토리로 충분)
      const isFirstMessage = allMessages.length === 1
      const contextPayload =
        isFirstMessage && context
          ? {
              context: {
                type: context.type,
                goalId: context.goalId,
                goalName: context.goalName ?? context.entityName,
                taskId: context.type === 'task' ? context.entityId : undefined,
                taskName: context.type === 'task' ? context.entityName : undefined,
                areaName: context.areaName,
              },
            }
          : {}

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, ...contextPayload }),
      })

      const data = await response.json()
      const assistantContent = data.success
        ? data.data.content
        : '응답을 생성하지 못했어요. 잠시 후 다시 시도해주세요.'

      await saveChatMessage.mutateAsync({
        conversationId: convId,
        role: 'assistant',
        content: assistantContent,
      })
    } catch {
      toast.error('메시지 전송에 실패했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
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
        // 데스크톱: 사이드바 열리면 넓어짐
        isSidebarOpen ? 'w-[640px]' : 'w-96',
        // 모바일: 항상 전체 너비
        'max-lg:right-4 max-lg:bottom-36 max-lg:left-4 max-lg:w-auto'
      )}
    >
      {/* 사이드바 (대화 목록) — 데스크톱만 */}
      <div
        className={cn(
          'hidden flex-col border-r border-[var(--color-border)] transition-[width,opacity] duration-300 lg:flex',
          isSidebarOpen ? 'w-[220px] opacity-100' : 'w-0 overflow-hidden opacity-0'
        )}
      >
        {/* 사이드바 헤더 */}
        <div className="flex min-h-[45px] items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            대화 기록
          </span>
          <button
            onClick={() => {
              startNewConversation()
              inputRef.current?.focus()
            }}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
            title="새 대화"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 대화 목록 */}
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

      {/* 메인 채팅 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex min-h-[45px] items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
          <div className="flex items-center gap-2">
            {/* 사이드바 토글 — 데스크톱만 */}
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
                <span className="max-w-[120px] truncate">{context.entityName}</span>
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
            {/* 모바일: 대화 목록 보기 (사이드바 대신) */}
            <MobileHistoryButton />
            <button
              onClick={() => {
                startNewConversation()
                inputRef.current?.focus()
              }}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
              title="새 대화"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!messages || messages.length === 0 ? (
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
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
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
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)] disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="rounded-lg bg-[var(--color-primary-500)] p-2 text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * 모바일용 대화 기록 버튼 + 드롭다운
 * lg 이상에서는 사이드바가 있으므로 숨김
 */
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
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          {/* Dropdown */}
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

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

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
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
})
