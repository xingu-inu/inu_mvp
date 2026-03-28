import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { HierarchyEdgeData } from '../types'

export const HierarchyEdge = memo(function HierarchyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  ...rest
}: EdgeProps<Edge<HierarchyEdgeData>>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  })

  return (
    <BaseEdge
      path={edgePath}
      style={{ strokeWidth: 1.5, stroke: 'var(--color-border)', ...style }}
      {...rest}
    />
  )
})
