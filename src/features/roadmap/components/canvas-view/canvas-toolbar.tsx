'use client'

import { memo } from 'react'
import { StickyNote, LayoutGrid, Maximize2 } from 'lucide-react'

interface CanvasToolbarProps {
  onTidyUp: () => void
  onAddSticky: () => void
  onFitView: () => void
}

export const CanvasToolbar = memo(function CanvasToolbar({
  onTidyUp,
  onAddSticky,
  onFitView,
}: CanvasToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 px-2 py-1.5 shadow-lg backdrop-blur-md">
        <ToolbarButton
          icon={<StickyNote className="h-4 w-4" />}
          label="스티키 노트 추가"
          shortcut="N"
          onClick={onAddSticky}
        />
        <Divider />
        <ToolbarButton
          icon={<LayoutGrid className="h-4 w-4" />}
          label="트리 정렬"
          onClick={onTidyUp}
        />
        <ToolbarButton
          icon={<Maximize2 className="h-3.5 w-3.5" />}
          label="전체 보기"
          onClick={onFitView}
        />
      </div>
    </div>
  )
})

function ToolbarButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group/btn relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />
}
