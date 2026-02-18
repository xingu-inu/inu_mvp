'use client'

import { useState, useRef, useMemo } from 'react'
import { Plus, Sparkles, RefreshCw, X } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCreateTask } from '@/queries/use-tasks'
import { useGoalWithRelations } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import type { AiDecomposeResponse, AiDecomposeTask } from '@/lib/ai/types'
import type { RepeatType } from '@/types/entities'

// Module-level cache: AI recommendations persist across mount/unmount (goal block collapse/expand)
const aiTaskCache = new Map<string, AiDecomposeTask[]>()
function cacheKey(goalId: string, groupId?: string) {
  return `${goalId}-${groupId ?? ''}`
}

interface InlineTaskQuickInputProps {
  goalId: string
  groupId?: string
}

export function InlineTaskQuickInput({ goalId, groupId }: InlineTaskQuickInputProps) {
  const createTask = useCreateTask()
  const { goal, groups, tasks: existingTasks } = useGoalWithRelations(goalId)
  const { data: areas = [] } = useAreas()
  const { data: direction } = useDirection()
  const aiSuggest = useAiSuggest()

  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const key = cacheKey(goalId, groupId)
  const [showAi, setShowAi] = useState(() => aiTaskCache.has(key))

  const area = areas.find((a) => a.id === goal?.area_id)
  const group = groupId ? groups.find((g) => g.id === groupId) : undefined

  const handleSubmit = () => {
    const name = value.trim()
    if (!name) return

    createTask.mutate({
      goal_id: goalId,
      group_id: groupId,
      name,
      repeat_type: 'once',
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      duration_minutes: 15,
      time_slot: 'anytime',
    })
    // Optimistic: 즉시 초기화 (캐시는 onMutate에서 이미 업데이트됨)
    setValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Derive tasks: live mutation data → module-level cache fallback
  const aiResponse = aiSuggest.data as AiDecomposeResponse | undefined
  const liveAiTasks = useMemo(
    () => aiResponse?.tasks ?? aiResponse?.groups?.flatMap((g) => g.tasks ?? []) ?? [],
    [aiResponse]
  )
  const aiTasks = liveAiTasks.length > 0 ? liveAiTasks : (aiTaskCache.get(key) ?? [])

  const handleCloseAi = () => {
    setShowAi(false)
    aiTaskCache.delete(key)
  }

  const handleAiGenerate = () => {
    setShowAi(true)
    aiSuggest.mutate(
      {
        type: 'decompose',
        decomposeTarget: 'tasks',
        context: {
          direction: direction?.statement,
          areaName: area?.name,
          areaType: area?.type,
          areaWhy: area?.why,
          goalName: goal?.name,
          goalWhy: goal?.why,
          groupName: group?.name,
          groupDescription: group?.description,
          existingTasks: existingTasks.map((t) => t.name),
        },
      },
      {
        onSuccess: (data) => {
          const res = data as AiDecomposeResponse
          const tasks = res?.tasks ?? res?.groups?.flatMap((g) => g.tasks ?? []) ?? []
          if (tasks.length > 0) aiTaskCache.set(key, tasks)
        },
      }
    )
  }

  const handleAiTaskSelect = (aiTask: AiDecomposeTask) => {
    const repeatType = (aiTask.repeat_type as RepeatType) || 'once'
    createTask.mutate({
      goal_id: goalId,
      group_id: groupId,
      name: aiTask.name,
      why: aiTask.why,
      repeat_type: repeatType,
      ...(repeatType === 'once' ? { scheduled_date: format(new Date(), 'yyyy-MM-dd') } : {}),
      duration_minutes: aiTask.duration_minutes || 15,
      time_slot:
        (aiTask.time_slot as 'anytime' | 'dawn' | 'morning' | 'afternoon' | 'evening') || 'anytime',
    })
  }

  const contextTasks = groupId ? existingTasks.filter((t) => t.group_id === groupId) : existingTasks
  const isEmpty = contextTasks.length === 0

  return (
    <div className="space-y-1">
      <div className="group/quick-input flex items-center gap-1.5 rounded-md px-2.5 py-1.5">
        <Plus className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="할 일 추가..."
          className="w-full rounded-none border-b border-transparent bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-b-[var(--color-primary-500)] focus:outline-none"
        />
        {!isEmpty && (
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={aiSuggest.isPending}
            className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] disabled:opacity-50"
            title="AI로 할 일 추천받기"
          >
            {aiSuggest.isPending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI 추천
          </button>
        )}
      </div>

      {isEmpty && !showAi && (
        <button
          type="button"
          onClick={handleAiGenerate}
          disabled={aiSuggest.isPending}
          className="mx-2.5 flex w-[calc(100%-20px)] items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-primary-200)] px-3 py-2.5 text-xs text-[var(--color-primary-500)] transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI로 할일 추천받기
        </button>
      )}

      <AnimatePresence>
        {showAi && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
            className="px-2.5"
          >
            {aiSuggest.isPending && (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between px-1">
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
                    onClick={handleCloseAi}
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

            {!aiSuggest.isPending && aiTasks.length > 0 && !aiSuggest.error && (
              <div className="space-y-1.5 py-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">AI 추천</span>
                  <button
                    type="button"
                    onClick={handleCloseAi}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                    aria-label="닫기"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {aiTasks.map((aiTask, index) => (
                  <motion.button
                    key={aiTask.name}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAiTaskSelect(aiTask)}
                    className="flex w-full flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-left text-xs transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                      <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-primary-400)]" />
                      {aiTask.name}
                    </span>
                    {aiTask.why && (
                      <span className="ml-[18px] text-[11px] text-[var(--color-text-tertiary)] italic">
                        {aiTask.why}
                      </span>
                    )}
                  </motion.button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={aiSuggest.isPending}
                  className="w-full gap-1 text-xs text-[var(--color-text-tertiary)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  다시 추천받기
                </Button>
              </div>
            )}

            {!aiSuggest.isPending && aiSuggest.error && (
              <p className="py-1 text-xs text-[var(--color-miss)]">{aiSuggest.error.message}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
