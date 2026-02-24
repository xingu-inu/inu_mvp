'use client'

import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'

interface TreeInsertionIndicatorProps {
  id: string
  layoutDirection: TreeLayoutDirection
}

export const TreeInsertionIndicator = memo(function TreeInsertionIndicator({
  id,
  layoutDirection,
}: TreeInsertionIndicatorProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const isHorizontal = layoutDirection === 'horizontal'

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-150',
        isHorizontal ? 'mx-0 h-full w-3' : 'my-0 h-3 w-full'
      )}
    >
      {isOver && (
        <div
          className={cn(
            'rounded-full bg-[var(--color-primary-500)]',
            isHorizontal ? 'mx-auto h-full w-0.5' : 'my-auto h-0.5 w-full'
          )}
        />
      )}
    </div>
  )
})
