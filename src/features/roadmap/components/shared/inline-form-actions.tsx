'use client'

import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InlineFormActionsProps {
  onCancel: () => void
  isPending: boolean
  submitLabel?: string
  cancelLabel?: string
}

export function InlineFormActions({
  onCancel,
  isPending,
  submitLabel = '추가',
  cancelLabel = '취소',
}: InlineFormActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="flex-1 gap-1"
        onClick={onCancel}
      >
        <X className="h-3.5 w-3.5" />
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        className="flex-1 gap-1"
        isLoading={isPending}
      >
        <Check className="h-3.5 w-3.5" />
        {submitLabel}
      </Button>
    </div>
  )
}
