'use client'

import { useState, useLayoutEffect, useCallback, type RefObject } from 'react'

export interface CrossLink {
  sourceTaskId: string
  targetGoalId: string
  /** The actual node to draw the line to (groupId if specified, otherwise goalId) */
  targetNodeId: string
  areaColor: string
}

type AnchorSide = 'left' | 'right' | 'top' | 'bottom'
type OverlayLayoutMode = 'horizontal' | 'vertical' | 'list'

interface CrossLinkOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>
  crossLinks: CrossLink[]
  layoutDirection?: OverlayLayoutMode
}

interface LinePosition {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourceAnchor: AnchorSide
  targetAnchor: AnchorSide
  areaColor: string
  sourceTaskId: string
  targetGoalId: string
}

// ─── Helpers ────────────────────────────────────────

function getAnchorPoint(
  rect: DOMRect,
  containerRect: DOMRect,
  side: AnchorSide
): { x: number; y: number } {
  const relLeft = rect.left - containerRect.left
  const relTop = rect.top - containerRect.top

  switch (side) {
    case 'left':
      return { x: relLeft, y: relTop + rect.height / 2 }
    case 'right':
      return { x: relLeft + rect.width, y: relTop + rect.height / 2 }
    case 'top':
      return { x: relLeft + rect.width / 2, y: relTop }
    case 'bottom':
      return { x: relLeft + rect.width / 2, y: relTop + rect.height }
  }
}

function getAnchorSides(
  sourceRect: DOMRect,
  targetRect: DOMRect,
  layout: OverlayLayoutMode
): { sourceAnchor: AnchorSide; targetAnchor: AnchorSide } {
  const sourceCX = sourceRect.left + sourceRect.width / 2
  const sourceCY = sourceRect.top + sourceRect.height / 2
  const targetCX = targetRect.left + targetRect.width / 2
  const targetCY = targetRect.top + targetRect.height / 2

  if (layout === 'list') {
    return { sourceAnchor: 'left', targetAnchor: 'left' }
  }

  if (layout === 'horizontal') {
    const sameX = Math.abs(sourceCX - targetCX) < 20
    if (sameX) {
      return sourceCY > targetCY
        ? { sourceAnchor: 'top', targetAnchor: 'bottom' }
        : { sourceAnchor: 'bottom', targetAnchor: 'top' }
    }
    // Backward: source is to the right of target (common case)
    return sourceCX > targetCX
      ? { sourceAnchor: 'left', targetAnchor: 'right' }
      : { sourceAnchor: 'right', targetAnchor: 'left' }
  }

  // vertical
  const sameY = Math.abs(sourceCY - targetCY) < 20
  if (sameY) {
    return sourceCX > targetCX
      ? { sourceAnchor: 'left', targetAnchor: 'right' }
      : { sourceAnchor: 'right', targetAnchor: 'left' }
  }
  return sourceCY > targetCY
    ? { sourceAnchor: 'top', targetAnchor: 'bottom' }
    : { sourceAnchor: 'bottom', targetAnchor: 'top' }
}

function getControlPoints(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sAnchor: AnchorSide,
  tAnchor: AnchorSide
): { cx1: number; cy1: number; cx2: number; cy2: number } {
  const dx = Math.abs(tx - sx)
  const dy = Math.abs(ty - sy)

  // List layout: both anchors LEFT → bracket-shaped curve
  if (sAnchor === 'left' && tAnchor === 'left') {
    const arcOffset = -Math.max(30, Math.min(dy * 0.25, 80))
    return { cx1: sx + arcOffset, cy1: sy, cx2: tx + arcOffset, cy2: ty }
  }

  // Same-side horizontal (LEFT→RIGHT or RIGHT→LEFT = backward/forward)
  if ((sAnchor === 'left' && tAnchor === 'right') || (sAnchor === 'right' && tAnchor === 'left')) {
    const clearance = Math.max(40, Math.min(dx * 0.3, 150))
    const sSign = sAnchor === 'left' ? -1 : 1
    const tSign = tAnchor === 'left' ? -1 : 1
    return { cx1: sx + sSign * clearance, cy1: sy, cx2: tx + tSign * clearance, cy2: ty }
  }

  // Same-side vertical (TOP→BOTTOM or BOTTOM→TOP)
  if ((sAnchor === 'top' && tAnchor === 'bottom') || (sAnchor === 'bottom' && tAnchor === 'top')) {
    const clearance = Math.max(40, Math.min(dy * 0.3, 150))
    const sSign = sAnchor === 'top' ? -1 : 1
    const tSign = tAnchor === 'top' ? -1 : 1
    return { cx1: sx, cy1: sy + sSign * clearance, cx2: tx, cy2: ty + tSign * clearance }
  }

  // Mixed-axis fallback (e.g. LEFT→BOTTOM, TOP→RIGHT)
  const offset = Math.max(40, Math.min(Math.max(dx, dy) * 0.3, 120))
  const cx1 = sAnchor === 'left' ? sx - offset : sAnchor === 'right' ? sx + offset : sx
  const cy1 = sAnchor === 'top' ? sy - offset : sAnchor === 'bottom' ? sy + offset : sy
  const cx2 = tAnchor === 'left' ? tx - offset : tAnchor === 'right' ? tx + offset : tx
  const cy2 = tAnchor === 'top' ? ty - offset : tAnchor === 'bottom' ? ty + offset : ty
  return { cx1, cy1, cx2, cy2 }
}

// ─── Component ──────────────────────────────────────

export function CrossLinkOverlay({
  containerRef,
  crossLinks,
  layoutDirection = 'horizontal',
}: CrossLinkOverlayProps) {
  const [lines, setLines] = useState<LinePosition[]>([])

  const calculatePositions = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newLines: LinePosition[] = []

    for (const link of crossLinks) {
      const sourceEl = container.querySelector(`[data-node-id="${link.sourceTaskId}"]`)
      const targetEl = container.querySelector(`[data-node-id="${link.targetNodeId}"]`)

      if (!sourceEl || !targetEl) continue

      const sourceRect = sourceEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()

      // Skip if nodes overlap or are too close
      const dist = Math.hypot(sourceRect.left - targetRect.left, sourceRect.top - targetRect.top)
      if (dist < 10) continue

      const { sourceAnchor, targetAnchor } = getAnchorSides(sourceRect, targetRect, layoutDirection)

      const source = getAnchorPoint(sourceRect, containerRect, sourceAnchor)
      const target = getAnchorPoint(targetRect, containerRect, targetAnchor)

      newLines.push({
        sourceX: source.x,
        sourceY: source.y,
        targetX: target.x,
        targetY: target.y,
        sourceAnchor,
        targetAnchor,
        areaColor: link.areaColor,
        sourceTaskId: link.sourceTaskId,
        targetGoalId: link.targetGoalId,
      })
    }

    setLines(newLines)
  }, [containerRef, crossLinks, layoutDirection])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const frameId = requestAnimationFrame(calculatePositions)

    const resizeObserver = new ResizeObserver(() => {
      calculatePositions()
    })
    resizeObserver.observe(container)

    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(calculatePositions)
    })
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [containerRef, calculatePositions])

  if (lines.length === 0) return null

  // Collect unique colors for arrow markers
  const uniqueColors = [...new Set(lines.map((l) => l.areaColor))]

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        width: '100%',
        height: '100%',
      }}
    >
      <defs>
        {uniqueColors.map((color) => {
          const colorId = color.replace('#', '')
          return (
            <marker
              key={colorId}
              id={`crosslink-arrow-${colorId}`}
              viewBox="0 0 8 6"
              refX={7}
              refY={3}
              markerWidth={8}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 3 L 0 6 Z" fill={color} opacity={0.6} />
            </marker>
          )
        })}
      </defs>

      {lines.map((line) => {
        const { cx1, cy1, cx2, cy2 } = getControlPoints(
          line.sourceX,
          line.sourceY,
          line.targetX,
          line.targetY,
          line.sourceAnchor,
          line.targetAnchor
        )

        const path = `M ${line.sourceX} ${line.sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${line.targetX} ${line.targetY}`
        const colorId = line.areaColor.replace('#', '')

        return (
          <path
            key={`${line.sourceTaskId}-${line.targetGoalId}`}
            d={path}
            fill="none"
            stroke={line.areaColor}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            opacity={0.45}
            markerEnd={`url(#crosslink-arrow-${colorId})`}
          />
        )
      })}
    </svg>
  )
}
