'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ZOOM_COMPACT, ZOOM_FULL, type GroupNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { AddChildButton } from './add-child-button'
import { InlineEditInput } from './inline-edit-input'

export const GroupNode = memo(function GroupNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<GroupNodeData, 'group'>>) {
  const {
    treeNode,
    isSelected,
    isSearchMatch,
    searchQuery,
    zoomLevel = ZOOM_FULL,
    isExpanded,
  } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const hasChildren = !!treeNode.children?.length
  const isGhost = data.isGhost === true
  const isGhostPulsing = data.isGhostPulsing === true
  const isDropTarget = data.isDropTarget === true
  const isInvalidHover = data.isInvalidHover === true

  const {
    handleNodeSelect,
    handleDeleteNode,
    handleStartEdit,
    handleStartAdd,
    addingToId,
    getQuickAddContent,
    editingNodeId,
    pendingEditValueRef,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
    toggleGroupExpand,
  } = useCanvasInteractionsContext()
  const isEditing = editingNodeId === id

  const handleSelect = useCallback(() => {
    handleNodeSelect('group', id)
  }, [handleNodeSelect, id])

  const handleEdit = useCallback(() => {
    handleStartEdit('group', id)
  }, [handleStartEdit, id])

  const handleToggle = useCallback(() => {
    toggleGroupExpand(id)
  }, [toggleGroupExpand, id])

  const onAddChild = useCallback(() => handleStartAdd('group', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('group', id), [handleDeleteNode, id])

  return (
    <div
      className={cn(
        'group/add group/why relative max-w-[260px] min-w-[180px]',
        !isGhost && 'cursor-grab',
        isGhost && [
          'cursor-default rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-900/20',
        ],
        isGhostPulsing && 'animate-pulse',
        isDropTarget && 'ring-dashed rounded-lg ring-2 ring-[var(--color-primary-400)]/60',
        isInvalidHover && !isDropTarget && 'rounded-lg ring-2 ring-red-400/70 ring-offset-1'
      )}
    >
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        <div
          className={cn(
            'cursor-grab rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 shadow-sm transition-all hover:border-[var(--color-border-secondary)] hover:shadow-md',
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
          {isEditing ? (
            <div className="rounded-lg border border-[var(--color-primary-400)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                <div className="min-w-0 flex-1">
                  <InlineEditInput
                    nodeType="group"
                    nodeId={id}
                    defaultValue={treeNode.name}
                    className="text-sm font-medium text-[var(--color-text-primary)]"
                    onCommit={handleRenameCommit}
                    onCancel={handleCancelEdit}
                    pendingValueRef={pendingEditValueRef}
                    onChainTab={() => handleQuickCreate('group', id)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <TreeContextMenu
              node={treeNode}
              onEdit={handleEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            >
              <div>
                <TreeNodeCard
                  node={treeNode}
                  isSelected={isSelected ?? false}
                  isExpanded={isExpanded ?? false}
                  hasChildren={hasChildren}
                  onSelect={handleSelect}
                  onToggle={handleToggle}
                  isSearchMatch={isSearchMatch}
                  searchQuery={searchQuery}
                />
              </div>
            </TreeContextMenu>
          )}

          {addingToId === id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
              {getQuickAddContent(treeNode)}
            </div>
          )}

          {addingToId !== id && !isCompact && (
            <AddChildButton
              onClick={() => handleQuickCreate('group', id)}
              label="할일 추가"
              sourcePosition={sourcePosition}
            />
          )}
        </>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
