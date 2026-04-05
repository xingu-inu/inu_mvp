'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Pencil, MessageCircle, PenLine, X } from 'lucide-react'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useUpsertTimelineNote } from '@/queries/use-timeline-note'
import type { TimelineAiNode } from '@/types/timeline'

interface TimelineAiCardProps {
  node: TimelineAiNode
  onHide?: (eventId: string) => void
}

export function TimelineAiCard({ node, onHide }: TimelineAiCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const openChatWithContext = useAiChatStore((s) => s.openChatWithContext)
  const upsertNote = useUpsertTimelineNote()

  const hasResponse = node.nodeType === 'question' && node.userResponse != null
  const isQuestion = node.nodeType === 'question'

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) return
    upsertNote.mutate({
      observationKey: node.id,
      content: trimmed,
      eventContext: { message: node.message, nodeType: node.nodeType },
    })
    setIsEditing(false)
    setDraft('')
  }, [draft, node.id, node.message, node.nodeType, upsertNote])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
        setDraft('')
      }
    },
    [handleSubmit]
  )

  const handleStartEdit = useCallback(() => {
    setDraft(node.userResponse ?? '')
    setIsEditing(true)
    // Focus textarea on next tick
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [node.userResponse])

  const handleChatLink = useCallback(() => {
    // Always pass observation context so the chat continues from this observation
    openChatWithContext({
      type: 'observation',
      message: node.message,
      nodeId: node.id,
      relatedGoalId: node.chatContext?.goalId,
    })
  }, [node.chatContext?.goalId, node.id, node.message, openChatWithContext])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="group/ai-hide rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 p-px">
        <div className="rounded-xl bg-[var(--color-bg-secondary)] px-3 py-2">
          {/* Message with inline header */}
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-[var(--color-text-secondary)]">
                {node.message}
              </p>

              {/* Question: response area */}
              {isQuestion && (
                <div className="mt-2">
                  {hasResponse && !isEditing ? (
                    <div className="group flex items-start gap-1.5 rounded-md bg-blue-500/5 px-2.5 py-1.5">
                      <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-blue-500/50" />
                      <p className="flex-1 text-[13px] text-[var(--color-text-primary)]">
                        {node.userResponse}
                      </p>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        aria-label="답변 수정"
                        className="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-bg-tertiary)]"
                      >
                        <Pencil className="h-2.5 w-2.5 text-[var(--color-text-tertiary)]" />
                      </button>
                    </div>
                  ) : isEditing ? (
                    <div>
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                          if (!draft.trim()) setIsEditing(false)
                        }}
                        placeholder="그때의 생각을 짧게 남겨보세요..."
                        rows={2}
                        maxLength={500}
                        className="w-full resize-none rounded-md border border-blue-500/30 bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-blue-500/50 focus:outline-none"
                      />
                      <p className="mt-0.5 text-right text-[10px] text-[var(--color-text-tertiary)]">
                        ⌘+Enter 저장 · Esc 취소
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="flex w-full items-center gap-2 rounded-md bg-blue-500/5 px-2.5 py-2 text-left transition-colors hover:bg-blue-500/10"
                    >
                      <PenLine className="h-3 w-3 shrink-0 text-blue-500/50" />
                      <span className="text-[13px] text-blue-500/70">짧게 남겨보기</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chat link + hide — inline right */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleChatLink}
                className="mt-0.5 text-[11px] text-blue-500/70 transition-colors hover:text-blue-600"
              >
                대화 →
              </button>
              {onHide && (
                <button
                  type="button"
                  onClick={() => onHide(`ai-${node.id}`)}
                  aria-label="이 항목 숨기기"
                  className="rounded p-0.5 opacity-0 transition-opacity group-hover/ai-hide:opacity-100 hover:bg-[var(--color-bg-tertiary)]"
                >
                  <X className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
