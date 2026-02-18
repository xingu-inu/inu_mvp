'use client'

import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelFormActions } from './panel-form-actions'

interface PanelFormShellProps {
  children: React.ReactNode
  title: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onDelete?: () => void
  isPending: boolean
  submitLabel?: string
  headerIcon?: React.ReactNode
}

export function PanelFormShell({
  children,
  title,
  onSubmit,
  onCancel,
  onDelete,
  isPending,
  submitLabel,
  headerIcon,
}: PanelFormShellProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {headerIcon}
        <h2 className="flex-1 text-lg font-bold">{title}</h2>
        {onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="삭제">
            <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
          </Button>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
        <PanelFormActions onCancel={onCancel} isPending={isPending} submitLabel={submitLabel} />
      </form>
    </div>
  )
}
