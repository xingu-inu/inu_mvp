'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import { ZOOM_COMPACT, ZOOM_FULL, type GoalNodeData } from '../types'
import { TreeNodeCard } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'

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
  } = useCanvasInteractionsContext()

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
        'group/why max-w-[300px] min-w-[220px]',
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
            'cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm',
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
                isExpanded={isExpanded ?? false}
                hasChildren={hasChildren}
                onSelect={handleSelect}
                onToggle={handleToggle}
                isSearchMatch={isSearchMatch}
                searchQuery={searchQuery}
              />
            </div>
          </TreeContextMenu>

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

          {/* Expand/collapse children indicator */}
          {hasChildren && isFull && (
            <div className="flex justify-center pb-1">
              <button
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle()
                }}
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    <span>접기</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span>{treeNode.children?.length}개 항목</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
