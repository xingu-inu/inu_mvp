'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input, Textarea } from '@/components/ui/input'
import { STATUS_CHANGE_REASONS } from '@/lib/goal-status'

const TRANSITION_CONFIG = {
  pause: {
    emoji: '⏸️',
    title: (name: string) => `"${name}"를 일시 정지하시나요?`,
    description: '쉬는 것도 과정의 일부예요. 준비되면 언제든 돌아오세요.',
    confirmLabel: '일시 정지하기',
  },
  archive: {
    emoji: '📦',
    title: (name: string) => `"${name}"를 나중으로 미루시나요?`,
    description: '괜찮아요. 이 경험에서 배운 것을 남겨두면 나중에 도움이 될 거예요.',
    confirmLabel: '나중에 하기',
  },
} as const

interface InlineStatusTransitionProps {
  goalName: string
  transitionType: 'pause' | 'archive'
  onConfirm: (reason?: string, note?: string) => void
  onCancel: () => void
}

export function InlineStatusTransition({
  goalName,
  transitionType,
  onConfirm,
  onCancel,
}: InlineStatusTransitionProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [note, setNote] = useState('')

  const config = TRANSITION_CONFIG[transitionType]

  const handleReasonSelect = (value: string) => {
    setSelectedReason((prev) => (prev === value ? null : value))
    setShowCustomInput(false)
    setCustomReason('')
  }

  const handleCustomToggle = () => {
    if (showCustomInput) {
      setShowCustomInput(false)
      setCustomReason('')
    } else {
      setShowCustomInput(true)
      setSelectedReason(null)
    }
  }

  const finalReason = showCustomInput ? customReason.trim() : selectedReason

  const handleConfirm = () => {
    onConfirm(finalReason || undefined, note.trim() || undefined)
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div>
          <p className="text-sm font-semibold">
            {config.emoji} {config.title(goalName)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{config.description}</p>
        </div>

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
                onClick={() => handleReasonSelect(reason.value)}
                className="cursor-pointer"
              >
                {reason.label}
              </Chip>
            ))}
            {!showCustomInput ? (
              <Chip
                variant="selection"
                selected={false}
                onClick={handleCustomToggle}
                className="cursor-pointer border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                직접 입력
              </Chip>
            ) : (
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="직접 입력..."
                className="h-8 w-36"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
            배운 것이 있다면 남겨두세요{' '}
            <span className="text-[var(--color-text-tertiary)]">(선택)</span>
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="다시 시작할 때 참고할 수 있어요"
            aria-label="배운 것이 있다면 남겨두세요"
            className="min-h-0 py-2"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleConfirm}>
            {config.confirmLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
