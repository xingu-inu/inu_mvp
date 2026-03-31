'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ZOOM_COMPACT, ZOOM_FULL, type DirectionNodeData } from '../types'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { AddChildButton } from './add-child-button'

export const DirectionNode = memo(function DirectionNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<DirectionNodeData, 'direction'>>) {
  const { treeNode, isSelected, isSearchMatch, zoomLevel = ZOOM_FULL } = data
  const areaCount = treeNode.children?.length ?? 0
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL
  const { handleNodeSelect, handleStartAdd, addingToId, getQuickAddContent, handleQuickCreate } =
    useCanvasInteractionsContext()

  const onSelect = useCallback(() => handleNodeSelect('direction', id), [handleNodeSelect, id])
  const onAddChild = useCallback(() => handleStartAdd('direction', id), [handleStartAdd, id])

  return (
    <div className="group/add relative">
      <Handle type="target" position={targetPosition ?? Position.Top} className="!invisible" />

      <TreeContextMenu node={treeNode} onEdit={onSelect} onAddChild={onAddChild}>
        <div className="relative">
          {/* Subtle animated glow */}
          <div
            className="animate-direction-glow absolute -inset-1.5 rounded-2xl blur-[8px]"
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
            }}
          />

          {/* Main card */}
          <div
            className={cn(
              'relative flex max-w-[400px] min-w-[280px] cursor-pointer items-center gap-3 rounded-2xl px-5 py-4 shadow-lg transition-all hover:shadow-xl hover:brightness-105',
              'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)]',
              isSelected &&
                'ring-2 ring-white/60 ring-offset-2 ring-offset-[var(--color-primary-500)]',
              isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
            )}
            onClick={onSelect}
          >
            {/* Icon with decorative circle */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <Sparkles className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block text-lg leading-snug font-bold break-keep whitespace-normal text-white">
                {treeNode.name}
              </span>
              {!isCompact && treeNode.why && (
                <span className="mt-0.5 block text-xs leading-snug break-keep whitespace-normal text-white/75 italic">
                  {treeNode.why}
                </span>
              )}
            </div>

            {isFull && areaCount > 0 && (
              <span className="flex-shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                {areaCount}
              </span>
            )}
          </div>
        </div>
      </TreeContextMenu>

      {/* Quick-add popover */}
      {addingToId === id && (
        <div className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 shadow-sm">
          {getQuickAddContent(treeNode)}
        </div>
      )}

      {addingToId !== id && (
        <AddChildButton
          onClick={() => handleQuickCreate('direction', id)}
          label="영역 추가"
          sourcePosition={sourcePosition}
        />
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})
