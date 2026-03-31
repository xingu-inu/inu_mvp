'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import { ZOOM_COMPACT, ZOOM_FULL, type GoalNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'
import { AddChildButton } from './add-child-button'
import { InlineEditInput } from './inline-edit-input'

// ── Main component ─────────────────────────────────────────

export const GoalNode = memo(function GoalNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<GoalNodeData, 'goal'>>) {
  const {
    treeNode,
    ancestorWhys,
    isSelected,
    isSearchMatch,
    searchQuery,
    zoomLevel = ZOOM_FULL,
    isExpanded,
  } = data
  const hasChildren = !!treeNode.children?.length
  const isDraft = treeNode.status === 'backlog'
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL

  const {
    handleNodeSelect,
    handleDeleteNode,
    handleStartAdd,
    addingToId,
    getQuickAddContent,
    toggleGoalExpand,
    editingNodeId,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
  } = useCanvasInteractionsContext()
  const isEditing = editingNodeId === id

  const handleToggle = useCallback(() => {
    toggleGoalExpand(id)
  }, [id, toggleGoalExpand])

  const handleSelect = useCallback(() => {
    handleNodeSelect('goal', id)
  }, [handleNodeSelect, id])

  const onAddChild = useCallback(() => handleStartAdd('goal', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('goal', id), [handleDeleteNode, id])

  return (
    <div
      className={cn(
        'group/add group/why relative max-w-[300px] min-w-[220px]',
        isDraft && 'rounded-xl border-2 border-dashed border-[var(--color-border)]',
        isDraft && '[&_[data-node-card]]:border-transparent'
      )}
    >
      {isFull && ancestorWhys && ancestorWhys.length > 0 && (
        <WhyChainTooltip
          ancestorWhys={ancestorWhys}
          currentName={treeNode.name}
          currentWhy={treeNode.why}
        />
      )}
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        /* Compact zoom: name-only simplified box */
        <div
          className={cn(
            'cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm transition-all hover:border-[var(--color-border-secondary)] hover:shadow-md',
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
            <div className="rounded-lg border border-[var(--color-primary-400)] bg-[var(--color-bg-primary)] px-3 py-2.5 shadow-sm">
              <InlineEditInput
                nodeType="goal"
                nodeId={id}
                defaultValue={treeNode.name}
                className="text-sm font-medium text-[var(--color-text-primary)]"
                onCommit={handleRenameCommit}
                onCancel={handleCancelEdit}
                onChainEnter={
                  data.parentAreaId
                    ? () => handleQuickCreate('area', data.parentAreaId!)
                    : undefined
                }
                onChainTab={() => handleQuickCreate('goal', id)}
              />
            </div>
          ) : (
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

          {/* Status tag (non-active only) */}
          {(() => {
            if (!treeNode.status || treeNode.status === 'active') return null
            const statusConfig = GOAL_STATUS_CONFIG[treeNode.status as GoalStatus]
            if (!statusConfig) return null
            return (
              <div className="px-3 pb-1">
                <span
                  className={cn(
                    'inline-block rounded-full px-1.5 py-px text-[9px] font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
            )
          })()}

          {/* Quick-add popover */}
          {addingToId === id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
              {getQuickAddContent(treeNode)}
            </div>
          )}

          {addingToId !== id && !isCompact && (
            <AddChildButton
              onClick={() => handleQuickCreate('goal', id)}
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
