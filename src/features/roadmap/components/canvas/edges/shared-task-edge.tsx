import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
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

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
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
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          className="pointer-events-none absolute rounded-full bg-[var(--color-bg-primary)]/90 px-1.5 py-0.5 text-[9px] font-semibold shadow-sm"
        >
          {strength}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})
