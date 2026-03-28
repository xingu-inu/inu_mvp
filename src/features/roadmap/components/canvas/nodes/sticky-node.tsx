'use client'

import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { StickyNodeData } from '../types'

export const StickyNode = memo(function StickyNode({
  data,
}: NodeProps<Node<StickyNodeData, 'sticky'>>) {
  return (
    <div>
      <Handle type="target" position={Position.Top} className="!invisible" />

      <div
        className="max-w-[240px] min-w-[160px] rounded-lg p-3 shadow-sm"
        style={{ backgroundColor: data.color }}
      >
        <p className="text-sm whitespace-pre-wrap">{data.text}</p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  )
})
