'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { ZOOM_COMPACT, ZOOM_FULL, type GroupNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'

export const GroupNode = memo(function GroupNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<GroupNodeData, 'group'>>) {
  const { treeNode, isSelected, isSearchMatch, searchQuery, zoomLevel = ZOOM_FULL } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const hasChildren = !!treeNode.children?.length

  const { handleNodeSelect, handleDeleteNode, handleStartAdd, addingToId, getQuickAddContent } =
    useCanvasInteractionsContext()

  const handleSelect = useCallback(() => {
    handleNodeSelect('group', id)
  }, [handleNodeSelect, id])

  const onAddChild = useCallback(() => handleStartAdd('group', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('group', id), [handleDeleteNode, id])

  return (
    <div className={cn('group/why max-w-[260px] min-w-[180px]')}>
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
          <span className="block truncate text-xs font-medium text-[var(--color-text-primary)]">
            {treeNode.name}
          </span>
        </div>
      ) : (
        <>
          <TreeContextMenu
            node={treeNode}
            onEdit={handleSelect}
            onAddChild={onAddChild}
            onDelete={onDelete}
          >
            <div>
              <TreeNodeCard
                node={treeNode}
                isSelected={isSelected ?? false}
                isExpanded={false}
                hasChildren={hasChildren}
                onSelect={handleSelect}
                onToggle={handleSelect}
                isSearchMatch={isSearchMatch}
                searchQuery={searchQuery}
              />
            </div>
          </TreeContextMenu>

          {addingToId === id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
              {getQuickAddContent(treeNode)}
            </div>
          )}
        </>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
