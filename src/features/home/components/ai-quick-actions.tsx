'use client'

import { useState } from 'react'
import { Sparkles, ListOrdered, Loader2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useTaskSuggestContext } from '../hooks/use-task-suggest-context'
import { AiTaskSuggestPreview } from './ai-task-suggest-preview'
import { PriorityRankModal } from './priority-rank-modal'
import { useHomeStore } from '@/stores/home.store'
import type { HomeTask } from '@/types/entities'
import type { AiTaskSuggestResponse } from '@/lib/ai/types'

interface AiQuickActionsProps {
  tasks: HomeTask[]
  selectedDate: Date
}

export function AiQuickActions({ tasks: _tasks, selectedDate }: AiQuickActionsProps) {
  void _tasks // kept for interface compatibility
  const [suggestResult, setSuggestResult] = useState<AiTaskSuggestResponse | null>(null)

  const { context: suggestContext, isLoading: suggestContextLoading } = useTaskSuggestContext()
  const suggestMutation = useAiSuggest()

  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)

  const handleTaskSuggest = () => {
    if (!suggestContext || suggestMutation.isPending) return
    suggestMutation.mutate(
      { type: 'task-suggest', context: suggestContext },
      { onSuccess: (data) => setSuggestResult(data as AiTaskSuggestResponse) }
    )
  }

  const handleCloseSuggest = () => {
    setSuggestResult(null)
    suggestMutation.reset()
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleTaskSuggest}
          disabled={suggestContextLoading || suggestMutation.isPending}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          AI 할일 추천
        </Button>
        <button
          type="button"
          onClick={() => setIsPriorityRankOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
        >
          <ListOrdered className="h-3.5 w-3.5" />
          우선순위 정리
        </button>
      </div>

      {/* Task suggest loading */}
      {suggestMutation.isPending && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-bg-secondary)] px-4 py-6">
          <Sparkles className="h-4 w-4 animate-pulse text-[var(--color-ai)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">분석 중...</span>
        </div>
      )}

      {/* Task suggest error */}
      {suggestMutation.isError && (
        <div className="rounded-2xl bg-[var(--color-bg-secondary)] p-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">AI 응답을 생성하지 못했어요.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={handleTaskSuggest}>
            다시 시도
          </Button>
        </div>
      )}

      {/* Task suggest results */}
      <AnimatePresence>
        {suggestResult && (
          <AiTaskSuggestPreview
            data={suggestResult}
            selectedDate={selectedDate}
            onComplete={handleCloseSuggest}
            onCancel={handleCloseSuggest}
          />
        )}
      </AnimatePresence>

      {/* Priority rank modal */}
      <PriorityRankModal />
    </div>
  )
}
