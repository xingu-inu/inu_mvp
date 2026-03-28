import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { SharedTaskEdgeData } from '../types'

export const SharedTaskEdge = memo(function SharedTaskEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
}: EdgeProps<Edge<SharedTaskEdgeData>>) {
  const { strength = 1, areaColor = '#8a8078' } = data ?? {}

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      style={{
        strokeWidth: Math.min(5, 1 + strength),
        stroke: areaColor,
        strokeDasharray: '6 4',
        opacity: 0.6,
        ...style,
      }}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  )
})
