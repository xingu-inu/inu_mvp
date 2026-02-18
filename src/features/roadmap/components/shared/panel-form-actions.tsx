'use client'

import { Button } from '@/components/ui/button'

interface PanelFormActionsProps {
  onCancel: () => void
  isPending: boolean
  submitLabel?: string
}

export function PanelFormActions({
  onCancel,
  isPending,
  submitLabel = '저장',
}: PanelFormActionsProps) {
  return (
    <div className="flex gap-3 border-t border-[var(--color-border)] p-4">
      <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
        취소
      </Button>
      <Button type="submit" variant="primary" className="flex-1" isLoading={isPending}>
        {submitLabel}
      </Button>
    </div>
  )
}
