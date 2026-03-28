'use client'

import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Compass } from 'lucide-react'
import type { DirectionNodeData } from '../types'

export const DirectionNode = memo(function DirectionNode({
  data,
}: NodeProps<Node<DirectionNodeData, 'direction'>>) {
  const { treeNode } = data
  const areaCount = treeNode.children?.length ?? 0

  return (
    <div>
      <Handle type="target" position={Position.Top} className="!invisible" />

      <div className="flex max-w-[320px] min-w-[240px] items-center gap-2 rounded-xl bg-[var(--color-primary-500)] px-4 py-3.5 shadow-sm">
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

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
