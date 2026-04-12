'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Send,
  Square,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react'
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
  BRAIN_DUMP_OPENING_CHIPS,
  BRAIN_DUMP_OPENING_GREETING,
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
  /** When true, renders as mobile fullscreen (no sidebar, simplified header) */
  fullscreen?: boolean
  /** Called when fullscreen panel requests close */
  onClose?: () => void
  /** When false, hides all brain-dump entry points (default: true) */
  allowBrainDump?: boolean
}

export function AiChatPanel({
  embedded = false,
  fullscreen = false,
  onClose,
  allowBrainDump = true,
}: AiChatPanelProps) {
  const activeConversationId = useAiChatStore((s) => s.activeConversationId)
  const setActiveConversation = useAiChatStore((s) => s.setActiveConversation)
  const isSidebarOpen = useAiChatStore((s) => s.isSidebarOpen)
  const toggleSidebar = useAiChatStore((s) => s.toggleSidebar)
  const startNewConversation = useAiChatStore((s) => s.startNewConversation)
  const context = useAiChatStore((s) => s.context)
  const clearContext = useAiChatStore((s) => s.clearContext)

  const isBrainDump = allowBrainDump && context?.type === 'brain-dump'
  // 온보딩 source는 allowBrainDump와 무관하게 문구/플레이스홀더를 우선 적용한다.
  // (현재 유일한 진입 경로가 floating panel이지만 임베디드 리팩터 시에도 온보딩 UX를 보호)
  const isOnboardingBrainDump = context?.type === 'brain-dump' && context.source === 'onboarding'

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
      return {
        context: {
          type: 'brain-dump' as const,
          ...(context.source ? { source: context.source } : {}),
        },
      }
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

  // 쏟아내기 진입 시 즉시 정적 오프닝 UI 노출. 대화가 비어 있을 때만.
  const showBrainDumpOpening = isBrainDump && messages.length === 0

  // Sync DB → useChat exactly once per conversation change (never during streaming)
  const prevConvRef = useRef<string | null | undefined>(undefined)
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (prevConvRef.current !== activeConversationId) {
      hasSyncedRef.current = false
      prevConvRef.current = activeConversationId
    }
  }, [activeConversationId])

  useEffect(() => {
    if (hasSyncedRef.current || isStreaming) return
    if (activeConversationId === null) {
      hasSyncedRef.current = true
      setMessages([])
    } else if (dbMessages !== undefined) {
      hasSyncedRef.current = true
      setMessages(toUIMessages(dbMessages))
    }
  }, [activeConversationId, dbMessages, setMessages, isStreaming])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on conversation or context change
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConversationId, context])

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

      sendMessage({ text: trimmed })
      // Fire-and-forget: errors handled by mutation's onError callback below
      saveChatMessage.mutate(
        { conversationId: convId, role: 'user', content: trimmed },
        { onError: () => toast.error('메시지 저장에 실패했어요.') }
      )
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
    prevConvRef.current = null
    hasSyncedRef.current = false
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
      <div
        className={cn(
          'flex min-h-[45px] items-center justify-between border-b px-4 py-2 transition-colors',
          isBrainDump
            ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
            : 'border-[var(--color-border)]'
        )}
      >
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
          {isBrainDump ? (
            <>
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">쏟아내기</h3>
              <button
                onClick={clearContext}
                className="rounded-full p-0.5 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/40"
                title="쏟아내기 모드 해제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="text-base">🐾</span>
              <h3 className="text-sm font-semibold">동행 이누</h3>
              {allowBrainDump && (
                <button
                  onClick={() =>
                    useAiChatStore.getState().openChatWithContext({ type: 'brain-dump' })
                  }
                  className="rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-amber-100 hover:text-amber-500 dark:hover:bg-amber-900/40 dark:hover:text-amber-400"
                  title="쏟아내기 모드 켜기"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          {/* Goal/Task/Observation context badge */}
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
      <div
        className={cn(
          'flex-1 overflow-y-auto px-4 py-3 transition-colors',
          isBrainDump && 'bg-amber-50/30 dark:bg-amber-950/20'
        )}
      >
        {showBrainDumpOpening ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Mascot mood="happy" size="md" />
            <p className="text-center text-sm text-amber-700 dark:text-amber-300">
              {isOnboardingBrainDump
                ? '방향 잡혔네요. 여기에 뭘 채울지 같이 생각해볼까요?'
                : BRAIN_DUMP_OPENING_GREETING}
            </p>
            <div className="flex w-full max-w-sm flex-col gap-3 px-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                어떤 이야기부터 꺼내볼까?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BRAIN_DUMP_OPENING_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleSend(chip.message)}
                    className="min-h-[44px] rounded-full border border-amber-200 bg-[var(--color-bg-primary)] px-3.5 py-2.5 text-sm text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Mascot mood="happy" size="md" />
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              방향이 흐릴 때도, 마음이 복잡할 때도 편하게 이야기해보세요
            </p>

            {/* Brain dump promotion card — only when no context and allowed */}
            {allowBrainDump && !context && (
              <button
                onClick={() =>
                  useAiChatStore.getState().openChatWithContext({ type: 'brain-dump' })
                }
                className="group w-full max-w-xs rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/50"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    생각 쏟아내기
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-600/80 dark:text-amber-400/70">
                  머릿속에 떠오르는 것들을 자유롭게 이야기하면 함께 정리해줄게
                </p>
              </button>
            )}

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
                {...(msg.role === 'assistant' && {
                  isLastMessage: i === messages.length - 1,
                  onSendMessage: handleSend,
                })}
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
      <div
        className={cn(
          'border-t px-4 py-3 transition-colors',
          isBrainDump ? 'border-amber-200 dark:border-amber-800' : 'border-[var(--color-border)]'
        )}
      >
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
            placeholder={
              isOnboardingBrainDump
                ? '이 방향으로 뭘 시작할지 편하게 적어봐'
                : isBrainDump
                  ? '머릿속 이야기를 자유롭게...'
                  : '지금 떠오르는 생각을 적어보세요...'
            }
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
              className={cn(
                'rounded-lg p-2 text-white transition-colors disabled:opacity-40',
                isBrainDump
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Fullscreen mode: mobile brain-dump ──

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)]">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold">쏟아내기</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Reuse shared chat content (messages + input) */}
        {chatContent}
      </div>
    )
  }

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
