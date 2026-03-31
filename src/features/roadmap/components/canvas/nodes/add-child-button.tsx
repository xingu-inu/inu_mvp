'use client'

import { memo, type MouseEvent } from 'react'
import { Position } from '@xyflow/react'
import { Plus } from 'lucide-react'

interface AddChildButtonProps {
  onClick: () => void
  label: string
  sourcePosition?: Position
}

export const AddChildButton = memo(function AddChildButton({
  onClick,
  label,
  sourcePosition,
}: AddChildButtonProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  const isVertical = sourcePosition === Position.Bottom

  return (
    <div
      className={
        isVertical
          ? 'absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full'
          : 'absolute top-1/2 -right-3 translate-x-full -translate-y-1/2'
      }
    >
      <button
        className="group/btn flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/80 opacity-0 shadow-sm transition-all duration-150 group-hover/add:opacity-100 hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]"
        style={{ height: 22, paddingLeft: 4, paddingRight: 4 }}
        onClick={handleClick}
      >
        <Plus className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)] group-hover/btn:text-[var(--color-primary-500)]" />
        <span className="max-w-0 overflow-hidden text-[10px] whitespace-nowrap text-[var(--color-text-tertiary)] opacity-0 transition-all duration-150 group-hover/btn:max-w-[80px] group-hover/btn:pr-1 group-hover/btn:text-[var(--color-primary-500)] group-hover/btn:opacity-100">
          {label}
        </span>
      </button>
    </div>
  )
})
