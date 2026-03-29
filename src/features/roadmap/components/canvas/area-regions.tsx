'use client'

import { useMemo } from 'react'
import { useNodes, ViewportPortal } from '@xyflow/react'
import type { WhyMapNode, AreaNodeData, GoalNodeData } from './types'

interface AreaRegion {
  areaId: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

const PADDING = 24

export function AreaRegions() {
  const nodes = useNodes<WhyMapNode>()

  const regions = useMemo(() => computeAreaRegions(nodes), [nodes])

  if (regions.length === 0) return null

  return (
    <ViewportPortal>
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {regions.map((r) => (
          <rect
            key={r.areaId}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={16}
            ry={16}
            fill={`color-mix(in srgb, ${r.color} 6%, transparent)`}
            stroke={`color-mix(in srgb, ${r.color} 15%, transparent)`}
            strokeWidth={1}
          />
        ))}
      </svg>
    </ViewportPortal>
  )
}

function computeAreaRegions(nodes: WhyMapNode[]): AreaRegion[] {
  // Collect area nodes
  const areaMap = new Map<string, { color: string; nodeIds: string[] }>()

  for (const node of nodes) {
    if (node.type === 'area') {
      const data = node.data as AreaNodeData
      areaMap.set(node.id, {
        color: data.treeNode.color ?? '#8a8078',
        nodeIds: [node.id],
      })
    }
  }

  // Associate goal nodes with their parent area
  for (const node of nodes) {
    if (node.type === 'goal') {
      const data = node.data as GoalNodeData
      if (data.parentAreaId) {
        const entry = areaMap.get(data.parentAreaId)
        if (entry) {
          entry.nodeIds.push(node.id)
        }
      }
    }
  }

  // O(1) lookup map instead of repeated O(n) finds
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const regions: AreaRegion[] = []

  for (const [areaId, { color, nodeIds }] of areaMap) {
    // Need at least the area + 1 goal to form a region
    if (nodeIds.length < 2) continue

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const id of nodeIds) {
      const n = nodeMap.get(id)
      if (!n) continue

      const w = n.measured?.width ?? 240
      const h = n.measured?.height ?? 60
      const x = n.position.x
      const y = n.position.y

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }

    if (minX === Infinity) continue

    regions.push({
      areaId,
      x: minX - PADDING,
      y: minY - PADDING,
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
      color,
    })
  }

  return regions
}
