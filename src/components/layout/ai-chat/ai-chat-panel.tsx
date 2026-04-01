'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Square, Plus, PanelLeftClose, PanelLeftOpen, X, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/common/mascot'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useChatMessages, useCreateConversation, useSaveChatMessage } from '@/queries/use-chat'
import {
  toUIMessages,
  getMessageText,
  DEFAULT_QUICK_ACTIONS,
  GOAL_QUICK_ACTIONS,
  TASK_QUICK_ACTIONS,
  BRAIN_DUMP_QUICK_ACTIONS,
} from './chat-utils'
import { ConversationList } from './conversation-list'
import { StreamingBubble } from './streaming-bubble'

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
                  useAiChatStore.getState().clearContext()
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

interface AiChatPanelProps {
  /** When true, renders inline (no fixed positioning, no motion wrapper) */
  embedded?: boolean
  /** When true, hides brain-dump mode toggle (record tab only needs normal chat) */
  hideBrainDump?: boolean
}

export function AiChatPanel({
  embedded = false,
  hideBrainDump: _hideBrainDump = false,
}: AiChatPanelProps) {
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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isSendingRef = useRef(false)

  // DB queries
  const { data: dbMessages } = useChatMessages(activeConversationId)
  const createConversation = useCreateConversation()
  const saveChatMessage = useSaveChatMessage()

  // Context body for API requests (recreated only when context changes)
  const contextBody = useMemo(() => {
    if (!context) return {}
    if (context.type === 'brain-dump') {
      return { context: { type: 'brain-dump' as const } }
    }
    if (context.type === 'observation') {
      return {
        context: {
          type: 'observation' as const,
          message: context.message,
          nodeId: context.nodeId,
          relatedGoalId: context.relatedGoalId,
        },
      }
    }
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
    // Reset textarea height after clearing
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      let convId = activeConversationId
      if (!convId) {
        const conv = await createConversation.mutateAsync({
          relatedGoalId:
            context && context.type !== 'brain-dump' && context.type !== 'observation'
              ? context.goalId
              : context?.type === 'observation'
                ? context.relatedGoalId
                : undefined,
          relatedTaskId: context && context.type === 'task' ? context.entityId : undefined,
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

  // ── Sidebar (shared between floating and embedded) ──

  const sidebar = (
    <div
      className={cn(
        'hidden flex-col border-r border-[var(--color-border)] transition-[width,opacity] duration-300 lg:flex',
        isSidebarOpen ? 'w-[200px] opacity-100' : 'w-0 overflow-hidden opacity-0'
      )}
    >
      <div className="flex min-h-[45px] items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">대화 기록</span>
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
            clearContext()
            setActiveConversation(id)
            inputRef.current?.focus()
          }}
        />
      </div>
    </div>
  )

  // ── Main chat content (shared between floating and embedded) ──

  const chatContent = (
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
          <h3 className="text-sm font-semibold">동행 이누</h3>
          {/* Goal/Task/Observation context badge (not brain-dump — that uses mode chips) */}
          {context && context.type !== 'brain-dump' && (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-xs text-[var(--color-primary-600)]">
              <span>
                {context.type === 'observation' ? '✨' : context.type === 'goal' ? '🎯' : '✅'}
              </span>
              <span
                className="max-w-[120px] truncate"
                title={context.type === 'observation' ? '타임라인 관찰' : context.entityName}
              >
                {context.type === 'observation' ? '타임라인 관찰' : context.entityName}
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
          {/* Hide when sidebar already shows its own "new chat" button */}
          {!isSidebarOpen && (
            <button
              onClick={handleNewChat}
              className="hidden rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)] lg:block"
              title="새 대화"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Mascot mood="happy" size="md" />
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              {context?.type === 'brain-dump'
                ? '머릿속 이야기부터 그대로 꺼내주세요. 이누가 같이 정리할게요'
                : '방향이 흐릴 때도, 마음이 복잡할 때도 편하게 이야기해보세요'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(context?.type === 'brain-dump'
                ? BRAIN_DUMP_QUICK_ACTIONS
                : context?.type === 'goal'
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
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="지금 떠오르는 생각을 적어보세요..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none overflow-y-auto bg-transparent text-sm outline-none placeholder:text-[var(--color-text-tertiary)] disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '120px' }}
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
  )

  // ── Embedded mode: render inline without floating wrapper ──

  if (embedded) {
    return (
      <div className="flex h-full overflow-hidden">
        {sidebar}
        {chatContent}
      </div>
    )
  }

  // ── Floating mode: motion wrapper + sidebar ──

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
      {sidebar}
      {chatContent}
    </motion.div>
  )
}
