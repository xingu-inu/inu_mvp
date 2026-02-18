'use client'

import { useState } from 'react'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { STATUS_CHANGE_REASONS } from '@/lib/goal-status'

interface StatusTransitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalName: string
  transitionType: 'pause'
  onConfirm: (reason?: string, note?: string) => void
}

const TRANSITION_CONFIG = {
  pause: {
    emoji: '⏸️',
    title: (name: string) => `"${name}"를 일시 정지하시나요?`,
    description: '쉬는 것도 과정의 일부예요. 준비되면 언제든 돌아오세요.',
    confirmLabel: '일시 정지하기',
  },
} as const

export function StatusTransitionDialog({
  open,
  onOpenChange,
  goalName,
  transitionType,
  onConfirm,
}: StatusTransitionDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const config = TRANSITION_CONFIG[transitionType]

  const handleConfirm = () => {
    onConfirm(selectedReason || undefined, note.trim() || undefined)
    setSelectedReason(null)
    setNote('')
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSelectedReason(null)
    setNote('')
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={`${config.emoji} ${config.title(goalName)}`}
      description={config.description}
    >
      <ModalBody>
        {/* Reason Tags */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
            왜 전환하게 되었나요? <span className="text-[var(--color-text-tertiary)]">(선택)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_CHANGE_REASONS.map((reason) => (
              <Chip
                key={reason.value}
                variant="selection"
                selected={selectedReason === reason.value}
                onClick={() =>
                  setSelectedReason((prev) => (prev === reason.value ? null : reason.value))
                }
                className="cursor-pointer text-xs"
              >
                {reason.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
            배운 것이 있다면 남겨두세요{' '}
            <span className="text-[var(--color-text-tertiary)]">(선택)</span>
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="다시 시작할 때 참고할 수 있어요"
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
          {config.confirmLabel}
        </Button>
      </ModalFooter>
    </ResponsiveModal>
  )
}
