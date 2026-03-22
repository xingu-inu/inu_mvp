'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { TreeNodeCard, type VisualTreeNode } from '../visual-tree/tree-node-card'
import { useRoadmapStore, selectSelectedNodeId } from '@/stores/roadmap.store'

export type CanvasNodeData = {
  treeNode: VisualTreeNode
  hasChildren: boolean
  sourcePosition?: Position
  targetPosition?: Position
}

export type CanvasNodeType = Node<CanvasNodeData, 'canvas'>

export const CanvasNode = memo(function CanvasNode({ data, selected }: NodeProps<CanvasNodeType>) {
  const { treeNode, hasChildren, sourcePosition, targetPosition } = data
  const selectedNodeId = useRoadmapStore(selectSelectedNodeId)
  const isSelected = selectedNodeId === treeNode.id || !!selected

  return (
    <div className="nodrag-handle">
      {/* Target handle (incoming edge) — position adapts to layout direction */}
      {treeNode.type !== 'direction' && (
        <Handle
          type="target"
          position={targetPosition ?? Position.Top}
          className="!h-1.5 !w-1.5 !border-none !bg-[var(--color-border)] opacity-0 group-hover:opacity-100"
        />
      )}

      <TreeNodeCard
        node={treeNode}
        isSelected={isSelected}
        isExpanded={false}
        hasChildren={hasChildren}
        onSelect={() => {}}
        onToggle={() => {}}
      />

      {/* Source handle (outgoing edge) — position adapts to layout direction */}
      {hasChildren && (
        <Handle
          type="source"
          position={sourcePosition ?? Position.Bottom}
          className="!h-1.5 !w-1.5 !border-none !bg-[var(--color-border)] opacity-0 group-hover:opacity-100"
        />
      )}
    </div>
  )
})
