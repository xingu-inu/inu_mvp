'use client'

import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { AreaNodeData } from '../types'

export const AreaNode = memo(function AreaNode({ data }: NodeProps<Node<AreaNodeData, 'area'>>) {
  const { treeNode, goalCount } = data

  return (
    <div>
      <Handle type="target" position={Position.Top} />

      <div className="relative max-w-[280px] min-w-[200px] overflow-hidden rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm">
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
            {treeNode.emoji && <span className="text-base">{treeNode.emoji}</span>}
          </div>

          {/* Name */}
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
            {treeNode.name}
          </span>

          {/* Goal count badge */}
          {goalCount > 0 && (
            <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
              {goalCount}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})
