'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { ZOOM_COMPACT, ZOOM_FULL, type TaskNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { InlineEditInput } from './inline-edit-input'

export const TaskNode = memo(function TaskNode({
  id,
  data,
  targetPosition,
}: NodeProps<Node<TaskNodeData, 'task'>>) {
  const { treeNode, isSelected, isSearchMatch, searchQuery, zoomLevel = ZOOM_FULL } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT

  const {
    handleNodeSelect,
    handleDeleteNode,
    handleStartEdit,
    editingNodeId,
    pendingEditValueRef,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
  } = useCanvasInteractionsContext()
  const isEditing = editingNodeId === id

  const handleSelect = useCallback(() => {
    handleNodeSelect('task', id)
  }, [handleNodeSelect, id])

  const handleEdit = useCallback(() => {
    handleStartEdit('task', id)
  }, [handleStartEdit, id])

  const onDelete = useCallback(() => handleDeleteNode('task', id), [handleDeleteNode, id])

  return (
    <div className={cn('group/add group/why max-w-[240px] min-w-[160px]')}>
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        <div
          className={cn(
            'cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 shadow-sm transition-all hover:border-[var(--color-border-secondary)] hover:shadow-md',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
          )}
          onClick={handleSelect}
        >
          <span className="block truncate text-xs text-[var(--color-text-secondary)]">
            {treeNode.name}
          </span>
        </div>
      ) : isEditing ? (
        <div className="rounded-lg border border-[var(--color-primary-400)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
          <InlineEditInput
            nodeType="task"
            nodeId={id}
            defaultValue={treeNode.name}
            className="text-sm font-medium text-[var(--color-text-primary)]"
            onCommit={handleRenameCommit}
            onCancel={handleCancelEdit}
            pendingValueRef={pendingEditValueRef}
            onChainEnter={() => {
              const parentId = data.parentGroupId || data.parentGoalId
              const parentType = data.parentGroupId ? ('group' as const) : ('goal' as const)
              handleQuickCreate(parentType, parentId)
            }}
          />
        </div>
      ) : (
        <TreeContextMenu
          node={treeNode}
          onEdit={handleEdit}
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
