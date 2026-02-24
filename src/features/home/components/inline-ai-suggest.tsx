'use client'

import { Sparkles, RefreshCw, X, Check, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AiTaskSuggestResponse } from '@/lib/ai/types'
import { useAiSuggest } from '@/hooks/use-ai-suggest'

/** Flattened AI suggestion task with goal context */
export interface FlatAiTask {
  name: string
  why?: string
  repeat_type?: string
  duration_minutes?: number
  time_slot?: string
  goalId?: string | null
  goalName?: string
  areaEmoji?: string
  areaId?: string | null
}

interface InlineAiSuggestProps {
  showAi: boolean
  aiSuggest: ReturnType<typeof useAiSuggest>
  flatAiTasks: FlatAiTask[]
  aiResult: AiTaskSuggestResponse | undefined
  createdAiTasks: Set<string>
  creatingAiTask: string | null
  onGenerate: () => void
  onTaskSelect: (task: FlatAiTask) => void
  onClose: () => void
}

export function InlineAiSuggest({
  showAi,
  aiSuggest,
  flatAiTasks,
  aiResult,
  createdAiTasks,
  creatingAiTask,
  onGenerate,
  onTaskSelect,
  onClose,
}: InlineAiSuggestProps) {
  return (
    <AnimatePresence>
      {showAi && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          style={{ overflow: 'hidden' }}
        >
          {/* Loading shimmer */}
          {aiSuggest.isPending && (
            <div className="space-y-2 px-1 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="h-3 w-3 text-[var(--color-primary-400)]" />
                  </motion.div>
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">
                    AI가 할 일을 추천하고 있어요
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ...
                    </motion.span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                  aria-label="닫기"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {[80, 65, 90].map((width, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                >
                  <div
                    className="h-10 rounded-lg bg-[var(--color-bg-tertiary)]"
                    style={{ width: `${width}%` }}
                  >
                    <motion.div
                      className="h-full rounded-lg"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 50%, transparent 100%)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.15,
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Results - clickable task cards */}
          {!aiSuggest.isPending && flatAiTasks.length > 0 && !aiSuggest.error && (
            <div className="space-y-1.5 px-1 py-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  {aiResult?.summary || 'AI 추천'}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                  aria-label="닫기"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {flatAiTasks.map((task, index) => {
                const taskKey = `${task.goalId}-${task.name}`
                const isCreated = createdAiTasks.has(taskKey)
                const isCreating = creatingAiTask === taskKey

                return (
                  <motion.button
                    key={taskKey}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onTaskSelect(task)}
                    disabled={isCreated || isCreating}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                      isCreated
                        ? 'border-[var(--color-done)]/30 bg-[var(--color-done)]/5 opacity-60'
                        : isCreating
                          ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] opacity-80'
                          : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]'
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                      {isCreated ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-done)]" />
                      ) : isCreating ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-primary-400)]" />
                      ) : (
                        <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-primary-400)]" />
                      )}
                      {task.name}
                    </span>
                    {task.goalName && (
                      <span className="ml-[18px] flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
                        {task.areaEmoji && <span>{task.areaEmoji}</span>}
                        <span>{task.goalName}</span>
                      </span>
                    )}
                    {task.why && (
                      <span className="ml-[18px] text-[11px] text-[var(--color-text-tertiary)] italic">
                        {task.why}
                      </span>
                    )}
                  </motion.button>
                )
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onGenerate}
                disabled={aiSuggest.isPending}
                className="w-full gap-1 text-xs text-[var(--color-text-tertiary)]"
              >
                <RefreshCw className="h-3 w-3" />
                다시 추천받기
              </Button>
            </div>
          )}

          {/* Error */}
          {!aiSuggest.isPending && aiSuggest.error && (
            <div className="px-1 py-1">
              <p className="text-xs text-[var(--color-miss)]">AI 추천을 생성하지 못했어요.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onGenerate}
                className="mt-1 text-xs"
              >
                다시 시도
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
