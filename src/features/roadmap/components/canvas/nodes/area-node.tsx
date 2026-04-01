'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import { ZOOM_COMPACT, ZOOM_FULL, type AreaNodeData } from '../types'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'
import { AddChildButton } from './add-child-button'
import { InlineEditInput } from './inline-edit-input'

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
  } = data
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL
  const isGhost = data.isGhost === true
  const isGhostPulsing = data.isGhostPulsing === true
  const {
    handleNodeSelect,
    handleDeleteNode,
    handleStartEdit,
    handleStartAdd,
    addingToId,
    getQuickAddContent,
    editingNodeId,
    pendingEditValueRef,
    directionId,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
  } = useCanvasInteractionsContext()
  const isEditing = editingNodeId === id

  const onSelect = useCallback(() => handleNodeSelect('area', id), [handleNodeSelect, id])
  const onEdit = useCallback(() => handleStartEdit('area', id), [handleStartEdit, id])
  const onAddChild = useCallback(() => handleStartAdd('area', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('area', id), [handleDeleteNode, id])

  return (
    <div className="group/add group/why relative">
      {isFull && ancestorWhys && ancestorWhys.length > 0 && (
        <WhyChainTooltip
          ancestorWhys={ancestorWhys}
          currentName={treeNode.name}
          currentWhy={treeNode.why}
        />
      )}
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isEditing && !isGhost ? (
        <div
          className={cn(
            'relative max-w-[280px] min-w-[200px] overflow-hidden rounded-xl border-2 border-[var(--color-primary-400)] bg-[var(--color-bg-primary)] shadow-sm'
          )}
        >
          {treeNode.color && (
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: treeNode.color }}
            />
          )}
          <div className="flex items-center gap-2 py-2.5 pr-3 pl-4">
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
            <div className="min-w-0 flex-1">
              <InlineEditInput
                nodeType="area"
                nodeId={id}
                defaultValue={treeNode.name}
                className="text-[15px] font-semibold text-[var(--color-text-primary)]"
                onCommit={handleRenameCommit}
                onCancel={handleCancelEdit}
                pendingValueRef={pendingEditValueRef}
                onChainEnter={
                  directionId ? () => handleQuickCreate('direction', directionId) : undefined
                }
                onChainTab={() => handleQuickCreate('area', id)}
              />
            </div>
          </div>
        </div>
      ) : isGhost ? (
        <div
          className={cn(
            'relative max-w-[280px] min-w-[200px] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 shadow-sm transition-all dark:border-amber-600 dark:bg-amber-900/20',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]',
            isGhostPulsing && 'animate-pulse'
          )}
          onClick={onSelect}
        >
          {treeNode.color && (
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: treeNode.color }}
            />
          )}
          <div className="flex items-center gap-2 py-2.5 pr-3 pl-4">
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
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
                {treeNode.name}
              </span>
              {!isCompact && treeNode.why && (
                <span className="block truncate text-[10px] text-[var(--color-text-tertiary)] italic">
                  {treeNode.why}
                </span>
              )}
            </div>
            <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              NEW
            </span>
          </div>
        </div>
      ) : (
        <TreeContextMenu
          node={treeNode}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        >
          <div
            className={cn(
              'relative max-w-[280px] min-w-[200px] cursor-pointer overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm transition-all hover:border-[var(--color-border-secondary)] hover:shadow-md',
              isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
              isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
            )}
            onClick={onSelect}
          >
            {treeNode.color && (
              <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: treeNode.color }}
              />
            )}
            <div className="flex items-center gap-2 py-2.5 pr-3 pl-4">
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
                {!isCompact && treeNode.emoji && (
                  <span className="text-base">{treeNode.emoji}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {treeNode.name}
                </span>
                {!isCompact && treeNode.why && (
                  <span className="block truncate text-[10px] text-[var(--color-text-tertiary)] italic">
                    {treeNode.why}
                  </span>
                )}
              </div>
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
      )}

      {/* Quick-add popover */}
      {!isGhost && addingToId === id && (
        <div className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 shadow-sm">
          {getQuickAddContent(treeNode)}
        </div>
      )}

      {!isGhost && addingToId !== id && (
        <AddChildButton
          onClick={() => handleQuickCreate('area', id)}
          label="목표 추가"
          sourcePosition={sourcePosition}
        />
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
