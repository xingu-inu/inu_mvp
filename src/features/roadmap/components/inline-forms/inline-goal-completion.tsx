'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  COMPLETION_CHOICES,
  type CompletionChoice,
} from '@/features/roadmap/components/shared/goal-completion-constants'
import { useGoalCompletion } from '@/features/roadmap/hooks'

interface InlineGoalCompletionProps {
  goalName: string
  areaId: string
  onComplete: (choice: CompletionChoice, note?: string) => void
  onCancel: () => void
}

export function InlineGoalCompletion({
  goalName,
  areaId: _areaId,
  onComplete,
  onCancel,
}: InlineGoalCompletionProps) {
  const { selected, setSelected, note, setNote, handleConfirm } = useGoalCompletion({
    onComplete,
  })

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <div className="space-y-3 rounded-xl border border-[var(--color-done)] bg-[var(--color-done-bg)] p-3">
        <div>
          <p className="text-sm font-medium">🎉 &ldquo;{goalName}&rdquo; 목표 달성!</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">이 성취를 어떻게 이어갈까요?</p>
        </div>

        {/* Choice Cards */}
        <div className="space-y-1.5">
          {COMPLETION_CHOICES.map((choice) => {
            const Icon = choice.icon
            const isSelected = selected === choice.id
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => setSelected(choice.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg border-2 p-2.5 text-left transition-colors',
                  isSelected
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-border-hover)]'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                    isSelected
                      ? 'bg-[var(--color-primary-500)] text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{choice.label}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {choice.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Reflection Note */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
            이 경험에서 배운 것 <span className="text-[var(--color-text-tertiary)]">(선택)</span>
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="어떤 전략이 효과적이었나요?"
            aria-label="이 경험에서 배운 것"
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleConfirm}>
            확인
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
