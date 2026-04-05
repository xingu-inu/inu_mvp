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
  data,
  markerStart,
  markerEnd,
  interactionWidth,
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

  // Deeper hierarchy levels get thinner, subtler edges
  const depth = data?.depth ?? 0
  const strokeWidth = depth >= 2 ? 1 : 1.5
  const opacity = depth >= 2 ? 0.5 : 0.85

  return (
    <BaseEdge
      path={edgePath}
      style={{ strokeWidth, stroke: 'var(--color-border)', opacity, ...style }}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  )
})
