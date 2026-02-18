'use client'

import { useState } from 'react'
import { Pause, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TASK_PAUSE_REASONS } from '@/lib/task-status'

interface TaskPausePopoverProps {
  taskName: string
  onConfirm: (reason?: string, note?: string) => void
  trigger: React.ReactNode
  /** Controlled open state (optional). When provided, overrides internal state. */
  controlledOpen?: boolean
  /** Callback when open state changes (used with controlledOpen). */
  onOpenChange?: (open: boolean) => void
}

export function TaskPausePopover({
  taskName,
  onConfirm,
  trigger,
  controlledOpen,
  onOpenChange,
}: TaskPausePopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [selectedReason, setSelectedReason] = useState<string>()
  const [customReason, setCustomReason] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [note, setNote] = useState('')

  const handleReasonSelect = (value: string) => {
    setSelectedReason((prev) => (prev === value ? undefined : value))
    setShowCustomInput(false)
    setCustomReason('')
  }

  const handleCustomToggle = () => {
    if (showCustomInput) {
      setShowCustomInput(false)
      setCustomReason('')
    } else {
      setShowCustomInput(true)
      setSelectedReason(undefined)
    }
  }

  const finalReason = showCustomInput ? customReason.trim() : selectedReason
  const isConfirmDisabled = showCustomInput && !customReason.trim()

  const resetState = () => {
    setSelectedReason(undefined)
    setCustomReason('')
    setShowCustomInput(false)
    setNote('')
  }

  const handleConfirm = () => {
    onConfirm(finalReason || undefined, note || undefined)
    setOpen(false)
    resetState()
  }

  const handleCancel = () => {
    setOpen(false)
    resetState()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-4"
        align="end"
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Pause className="size-4 text-[var(--color-paused)]" />
            <p className="text-sm font-medium">일시 정지할까요?</p>
          </div>

          <p className="line-clamp-1 text-xs text-[var(--color-text-secondary)]">{taskName}</p>

          {/* Reason chips */}
          <div className="flex flex-wrap gap-1.5">
            {TASK_PAUSE_REASONS.map((reason) => (
              <Chip
                key={reason.value}
                variant="selection"
                selected={selectedReason === reason.value}
                onClick={() => handleReasonSelect(reason.value)}
                className="cursor-pointer text-xs"
              >
                {reason.label}
              </Chip>
            ))}
            {!showCustomInput ? (
              <Chip
                variant="selection"
                selected={false}
                onClick={handleCustomToggle}
                className="cursor-pointer border-dashed border-[var(--color-text-tertiary)]/40 text-xs text-[var(--color-text-secondary)]"
              >
                <Plus className="size-3.5" />
                직접 입력
              </Chip>
            ) : (
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="직접 입력..."
                className="h-8 w-36 text-sm"
                autoFocus
              />
            )}
          </div>

          {/* Note input */}
          <input
            type="text"
            placeholder="메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
            >
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
