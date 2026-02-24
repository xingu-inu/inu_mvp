'use client'

import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { TreeNodeCard, type VisualTreeNode } from './tree-node-card'

interface DroppableGroupNodeProps {
  node: VisualTreeNode
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onToggle: () => void
  isSearchMatch?: boolean
  searchQuery?: string
}

export const DroppableGroupNode = memo(function DroppableGroupNode({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  isSearchMatch,
  searchQuery,
}: DroppableGroupNodeProps) {
  const droppableId = `group-drop-${node.id}`
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'group-target',
      groupId: node.id,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-draggable
      className={cn(
        'relative rounded-xl transition-all duration-200',
        isOver && [
          'ring-2 ring-[var(--color-primary-400)]',
          'shadow-[0_0_16px_rgba(99,102,241,0.3)]',
          'scale-[1.03]',
        ]
      )}
    >
      <TreeNodeCard
        node={node}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onSelect={onSelect}
        onToggle={onToggle}
        isSearchMatch={isSearchMatch}
        searchQuery={searchQuery}
      />
      {isOver && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl opacity-40 ring-2 ring-[var(--color-primary-300)]" />
      )}
    </div>
  )
})
