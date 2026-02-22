'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'

interface TreeInsertionIndicatorProps {
  id: string // unique droppable ID like "insert-before-{nodeId}" or "insert-after-{nodeId}"
  layoutDirection: TreeLayoutDirection
  isActive: boolean // from parent's activeDropId === this id
}

export function TreeInsertionIndicator({
  id,
  layoutDirection,
  isActive,
}: TreeInsertionIndicatorProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const isHorizontal = layoutDirection === 'horizontal'
  const showLine = isOver || isActive

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-150',
        isHorizontal
          ? 'mx-0 h-full w-3' // vertical line zone (horizontal layout = children side by side)
          : 'my-0 h-3 w-full' // horizontal line zone (vertical layout = children stacked)
      )}
    >
      {showLine && (
        <div
          className={cn(
            'rounded-full bg-[var(--color-primary-500)]',
            isHorizontal ? 'mx-auto h-full w-0.5' : 'my-auto h-0.5 w-full'
          )}
        />
      )}
    </div>
  )
}
