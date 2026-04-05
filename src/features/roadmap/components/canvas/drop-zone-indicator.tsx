'use client'

import { ViewportPortal } from '@xyflow/react'

export interface DropZoneIndicatorProps {
  slotPositions: { x: number; y: number }[]
  insertIndex: number
  direction: 'TB' | 'LR'
  visible: boolean
}

const LINE_LENGTH = 60
const DOT_RADIUS = 4
const COLOR = 'var(--color-primary-400)'
const DEFAULT_SLOT_GAP = 40

export function DropZoneIndicator({
  slotPositions,
  insertIndex,
  direction,
  visible,
}: DropZoneIndicatorProps) {
  if (slotPositions.length === 0) return null

  // Compute midpoint between adjacent slots (or edge position for first/last)
  let mx: number
  let my: number

  if (insertIndex <= 0) {
    // Before the first slot
    const first = slotPositions[0]
    const second = slotPositions.length > 1 ? slotPositions[1] : null
    if (direction === 'TB') {
      const gap = second ? (second.x - first.x) / 2 : DEFAULT_SLOT_GAP
      mx = first.x - gap
      my = first.y
    } else {
      const gap = second ? (second.y - first.y) / 2 : DEFAULT_SLOT_GAP
      mx = first.x
      my = first.y - gap
    }
  } else if (insertIndex >= slotPositions.length) {
    // After the last slot
    const last = slotPositions[slotPositions.length - 1]
    const prev = slotPositions.length > 1 ? slotPositions[slotPositions.length - 2] : null
    if (direction === 'TB') {
      const gap = prev ? (last.x - prev.x) / 2 : DEFAULT_SLOT_GAP
      mx = last.x + gap
      my = last.y
    } else {
      const gap = prev ? (last.y - prev.y) / 2 : DEFAULT_SLOT_GAP
      mx = last.x
      my = last.y + gap
    }
  } else {
    // Between two slots
    const left = slotPositions[insertIndex - 1]
    const right = slotPositions[insertIndex]
    mx = (left.x + right.x) / 2
    my = (left.y + right.y) / 2
  }

  // TB layout: siblings on x-axis → vertical insertion line (along y)
  // LR layout: siblings on y-axis → horizontal insertion line (along x)
  const half = LINE_LENGTH / 2
  const x1 = direction === 'TB' ? mx : mx - half
  const y1 = direction === 'TB' ? my - half : my
  const x2 = direction === 'TB' ? mx : mx + half
  const y2 = direction === 'TB' ? my + half : my

  return (
    <ViewportPortal>
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
          overflow: 'visible',
          opacity: visible ? 0.8 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLOR} strokeWidth={2} />
        <circle cx={x1} cy={y1} r={DOT_RADIUS} fill={COLOR} />
        <circle cx={x2} cy={y2} r={DOT_RADIUS} fill={COLOR} />
      </svg>
    </ViewportPortal>
  )
}
