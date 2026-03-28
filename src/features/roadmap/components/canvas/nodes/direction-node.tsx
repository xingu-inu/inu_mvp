'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DirectionNodeData } from '../types'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'

export const DirectionNode = memo(function DirectionNode({
  id,
  data,
}: NodeProps<Node<DirectionNodeData, 'direction'>>) {
  const { treeNode, isSelected, isSearchMatch } = data
  const areaCount = treeNode.children?.length ?? 0
  const { handleNodeSelect, handleStartAdd, addingToId, getQuickAddContent } =
    useCanvasInteractionsContext()

  const onSelect = useCallback(() => handleNodeSelect('direction', id), [handleNodeSelect, id])
  const onAddChild = useCallback(() => handleStartAdd('direction', id), [handleStartAdd, id])

  return (
    <div>
      <Handle type="target" position={Position.Top} className="!invisible" />

      <TreeContextMenu node={treeNode} onEdit={onSelect} onAddChild={onAddChild}>
        <div
          className={cn(
            'flex max-w-[320px] min-w-[240px] cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-primary-500)] px-4 py-3.5 shadow-sm transition-shadow',
            isSelected &&
              'ring-2 ring-white/60 ring-offset-2 ring-offset-[var(--color-primary-500)]',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
          )}
          onClick={onSelect}
        >
          <Compass className="h-4 w-4 flex-shrink-0 text-[var(--color-text-on-primary)]" />

          <div className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-[var(--color-text-on-primary)]">
              {treeNode.name}
            </span>
            {treeNode.why && (
              <span className="block truncate text-[10px] text-[var(--color-text-on-primary)] italic opacity-80">
                {treeNode.why}
              </span>
            )}
          </div>

          {areaCount > 0 && (
            <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-on-primary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-on-primary)]">
              {areaCount}
            </span>
          )}
        </div>
      </TreeContextMenu>

      {/* Quick-add popover */}
      {addingToId === id && (
        <div className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 shadow-sm">
          {getQuickAddContent(treeNode)}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
