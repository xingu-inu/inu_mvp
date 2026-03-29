import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import type { DependencyEdgeData, DependencyRelation } from '../types'

const RELATION_CONFIG: Record<DependencyRelation, { color: string; label: string }> = {
  'depends-on': { color: '#6366f1', label: 'depends on' },
  supports: { color: '#22c55e', label: 'supports' },
  conflicts: { color: '#ef4444', label: 'conflicts' },
}

export const DependencyEdge = memo(function DependencyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  interactionWidth,
}: EdgeProps<Edge<DependencyEdgeData>>) {
  const relation = data?.relation ?? 'depends-on'
  const config = RELATION_CONFIG[relation]

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
          strokeWidth: 1.5,
          stroke: config.color,
          ...style,
        }}
        markerEnd={MarkerType.ArrowClosed}
        interactionWidth={interactionWidth}
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          className="pointer-events-none absolute rounded bg-[var(--color-bg-primary)]/90 px-1.5 py-0.5 text-[9px] font-medium shadow-sm"
        >
          <span style={{ color: config.color }}>{config.label}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
})
