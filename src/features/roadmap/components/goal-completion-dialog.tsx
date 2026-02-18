'use client'

import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  COMPLETION_CHOICES,
  type CompletionChoice,
} from '@/features/roadmap/components/shared/goal-completion-constants'
import { useGoalCompletion } from '@/features/roadmap/hooks'

interface GoalCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalName: string
  areaId: string
  onComplete: (choice: CompletionChoice, note?: string) => void
}

export function GoalCompletionDialog({
  open,
  onOpenChange,
  goalName,
  areaId: _areaId,
  onComplete,
}: GoalCompletionDialogProps) {
  const { selected, setSelected, note, setNote, handleConfirm, reset } = useGoalCompletion({
    onComplete,
    resetAfterConfirm: true,
  })

  const handleCancel = () => {
    onOpenChange(false)
    reset()
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={`🎉 "${goalName}" 목표 달성!`}
      description="이 성취를 어떻게 이어갈까요?"
    >
      <ModalBody>
        {/* Choice Cards */}
        <div className="space-y-2">
          {COMPLETION_CHOICES.map((choice) => {
            const Icon = choice.icon
            const isSelected = selected === choice.id
            return (
              <button
                key={choice.id}
                onClick={() => setSelected(choice.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                  isSelected
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)]'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                    isSelected
                      ? 'bg-[var(--color-primary-500)] text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      isSelected
                        ? 'text-[var(--color-primary-600)]'
                        : 'text-[var(--color-text-primary)]'
                    )}
                  >
                    {choice.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{choice.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Reflection Note */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
            이 경험에서 배운 것 <span className="text-[var(--color-text-tertiary)]">(선택)</span>
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="어떤 전략이 효과적이었나요?"
            aria-label="이 경험에서 배운 것"
            className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
            rows={3}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" className="flex-1" onClick={handleCancel}>
          취소
        </Button>
        <Button variant="primary" className="flex-1" onClick={handleConfirm}>
          확인
        </Button>
      </ModalFooter>
    </ResponsiveModal>
  )
}
