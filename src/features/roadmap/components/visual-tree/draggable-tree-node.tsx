'use client'

import { memo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { TreeNodeCard, type VisualTreeNode } from './tree-node-card'

interface DraggableTreeNodeProps {
  node: VisualTreeNode
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onToggle: () => void
  isDragDisabled?: boolean
  isSearchMatch?: boolean
  searchQuery?: string
}

export const DraggableTreeNode = memo(function DraggableTreeNode({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  isDragDisabled = false,
  isSearchMatch,
  searchQuery,
}: DraggableTreeNodeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag-${node.id}`,
    data: {
      type: node.type,
      id: node.id,
      node,
    },
    disabled: isDragDisabled || node.type === 'direction',
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-draggable
      className={cn(isDragging && 'opacity-30')}
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
    </div>
  )
})
