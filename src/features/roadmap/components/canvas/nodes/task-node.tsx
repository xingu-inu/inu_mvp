'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { ZOOM_COMPACT, ZOOM_FULL, type TaskNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'

export const TaskNode = memo(function TaskNode({
  id,
  data,
  targetPosition,
}: NodeProps<Node<TaskNodeData, 'task'>>) {
  const { treeNode, isSelected, isSearchMatch, searchQuery, zoomLevel = ZOOM_FULL } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT

  const { handleNodeSelect, handleDeleteNode } = useCanvasInteractionsContext()

  const handleSelect = useCallback(() => {
    handleNodeSelect('task', id)
  }, [handleNodeSelect, id])

  const onDelete = useCallback(() => handleDeleteNode('task', id), [handleDeleteNode, id])

  return (
    <div className={cn('group/why max-w-[240px] min-w-[160px]')}>
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        <div
          className={cn(
            'cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 shadow-sm',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
          )}
          onClick={handleSelect}
        >
          <span className="block truncate text-xs text-[var(--color-text-secondary)]">
            {treeNode.name}
          </span>
        </div>
      ) : (
        <TreeContextMenu
          node={treeNode}
          onEdit={handleSelect}
          onAddChild={handleSelect}
          onDelete={onDelete}
        >
          <div>
            <TreeNodeCard
              node={treeNode}
              isSelected={isSelected ?? false}
              isExpanded={false}
              hasChildren={false}
              onSelect={handleSelect}
              onToggle={handleSelect}
              isSearchMatch={isSearchMatch}
              searchQuery={searchQuery}
            />
          </div>
        </TreeContextMenu>
      )}
    </div>
  )
})
