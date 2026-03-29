'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import { ZOOM_COMPACT, ZOOM_FULL, type AreaNodeData } from '../types'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'

export const AreaNode = memo(function AreaNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<AreaNodeData, 'area'>>) {
  const {
    treeNode,
    goalCount,
    statusCounts,
    ancestorWhys,
    isSelected,
    isSearchMatch,
    zoomLevel = ZOOM_FULL,
    balanceWarning,
    balanceLevel,
  } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL
  const { handleNodeSelect, handleDeleteNode, handleStartAdd, addingToId, getQuickAddContent } =
    useCanvasInteractionsContext()

  const onSelect = useCallback(() => handleNodeSelect('area', id), [handleNodeSelect, id])
  const onAddChild = useCallback(() => handleStartAdd('area', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('area', id), [handleDeleteNode, id])

  return (
    <div className="group/why">
      {isFull && ancestorWhys && ancestorWhys.length > 0 && (
        <WhyChainTooltip
          ancestorWhys={ancestorWhys}
          currentName={treeNode.name}
          currentWhy={treeNode.why}
        />
      )}
      <Handle type="target" position={targetPosition ?? Position.Top} />

      <TreeContextMenu
        node={treeNode}
        onEdit={onSelect}
        onAddChild={onAddChild}
        onDelete={onDelete}
      >
        <div
          className={cn(
            'relative max-w-[280px] min-w-[200px] cursor-pointer overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm transition-shadow',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]',
            balanceLevel === 'critical' && 'animate-pulse'
          )}
          onClick={onSelect}
        >
          {/* Left color accent bar */}
          {treeNode.color && (
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: treeNode.color }}
            />
          )}

          <div className="flex items-center gap-2 py-2.5 pr-3 pl-4">
            {/* Color dot + emoji */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {treeNode.color && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: treeNode.color,
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${treeNode.color} 30%, transparent)`,
                  }}
                />
              )}
              {!isCompact && treeNode.emoji && <span className="text-base">{treeNode.emoji}</span>}
            </div>

            {/* Name */}
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
              {treeNode.name}
            </span>

            {/* Goal status counts badge */}
            {!isCompact && goalCount > 0 && (
              <div className="flex flex-shrink-0 items-center gap-1">
                {isFull && statusCounts && Object.keys(statusCounts).length > 1 ? (
                  (Object.entries(statusCounts) as [GoalStatus, number][]).map(
                    ([status, count]) => {
                      const config = GOAL_STATUS_CONFIG[status]
                      if (!config || !count) return null
                      return (
                        <span
                          key={status}
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            config.bg,
                            config.text
                          )}
                        >
                          {count}
                        </span>
                      )
                    }
                  )
                ) : (
                  <span className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                    {goalCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </TreeContextMenu>

      {/* AI Balance warning badge */}
      {balanceWarning && (
        <div className="flex items-center gap-1 px-3 pb-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-500" />
          <span className="truncate text-[9px] text-red-600">{balanceWarning}</span>
        </div>
      )}

      {/* Quick-add popover */}
      {addingToId === id && (
        <div className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 shadow-sm">
          {getQuickAddContent(treeNode)}
        </div>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
