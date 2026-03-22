'use client'

import { useState, useLayoutEffect, useCallback, useRef, type RefObject } from 'react'

export interface CrossLink {
  sourceTaskId?: string
  sourceGoalId?: string
  targetGoalId?: string
  /** The actual node to draw the line to (groupId if specified, otherwise goalId) */
  targetNodeId: string
  areaColor: string
  /** Human-readable label describing this link (e.g. "Task → Goal") */
  label?: string
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
  sourceId: string
  targetId: string
  label: string
}

interface TooltipState {
  x: number
  y: number
  label: string
  visible: boolean
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

/** Compute the midpoint of a cubic Bézier at t=0.5 */
function bezierMidpoint(
  sx: number,
  sy: number,
  cx1: number,
  cy1: number,
  cx2: number,
  cy2: number,
  tx: number,
  ty: number
): { x: number; y: number } {
  const t = 0.5
  const mt = 1 - t
  const x = mt * mt * mt * sx + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * tx
  const y = mt * mt * mt * sy + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * ty
  return { x, y }
}

// ─── CSS animation injected once ────────────────────

const ANIMATION_STYLE_ID = 'crosslink-animation-style'
let animationStyleMountCount = 0

function ensureAnimationStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(ANIMATION_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = ANIMATION_STYLE_ID
  style.textContent = `
    @keyframes crosslink-flow {
      from { stroke-dashoffset: 20; }
      to   { stroke-dashoffset: 0; }
    }
    .crosslink-path {
      animation: crosslink-flow 2.5s linear infinite;
    }
    .crosslink-path-hovered {
      animation: crosslink-flow 1.5s linear infinite;
    }
  `
  document.head.appendChild(style)
  return style
}

// ─── Component ──────────────────────────────────────

export function CrossLinkOverlay({
  containerRef,
  crossLinks,
  layoutDirection = 'horizontal',
}: CrossLinkOverlayProps) {
  const [lines, setLines] = useState<LinePosition[]>([])
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, label: '', visible: false })
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Inject CSS once, clean up on unmount (ref-counted for concurrent instances)
  useLayoutEffect(() => {
    animationStyleMountCount++
    ensureAnimationStyle()
    return () => {
      animationStyleMountCount--
      if (animationStyleMountCount <= 0) {
        document.getElementById(ANIMATION_STYLE_ID)?.remove()
        animationStyleMountCount = 0
      }
    }
  }, [])

  const calculatePositions = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newLines: LinePosition[] = []

    for (const link of crossLinks) {
      // Support both task-level and goal-level cross-links
      const sourceNodeId = link.sourceTaskId ?? link.sourceGoalId
      if (!sourceNodeId) continue

      const sourceEl = container.querySelector(`[data-node-id="${CSS.escape(sourceNodeId)}"]`)
      const targetEl = container.querySelector(`[data-node-id="${CSS.escape(link.targetNodeId)}"]`)

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
        sourceId: sourceNodeId,
        targetId: link.targetNodeId,
        label: link.label ?? `${sourceNodeId} → ${link.targetNodeId}`,
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

  function handleLinkEnter(line: LinePosition, cx1: number, cy1: number, cx2: number, cy2: number) {
    const key = `${line.sourceId}-${line.targetId}`
    setHoveredKey(key)

    const mid = bezierMidpoint(
      line.sourceX,
      line.sourceY,
      cx1,
      cy1,
      cx2,
      cy2,
      line.targetX,
      line.targetY
    )

    // Convert SVG coords to container-relative coords
    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return

    const containerRect = container.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()
    const offsetX = svgRect.left - containerRect.left
    const offsetY = svgRect.top - containerRect.top

    setTooltip({ x: mid.x + offsetX, y: mid.y + offsetY, label: line.label, visible: true })
  }

  function handleLinkLeave() {
    setHoveredKey(null)
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  function handleLinkClick(line: LinePosition) {
    const container = containerRef.current
    if (!container) return

    // Highlight source node
    const sourceEl = container.querySelector(`[data-node-id="${CSS.escape(line.sourceId)}"]`)
    const targetEl = container.querySelector(`[data-node-id="${CSS.escape(line.targetId)}"]`)

    if (sourceEl instanceof HTMLElement) {
      sourceEl.classList.add('crosslink-focused')
      sourceEl.style.outline = `2px solid ${line.areaColor}`
      sourceEl.style.outlineOffset = '2px'
      setTimeout(() => {
        sourceEl.classList.remove('crosslink-focused')
        sourceEl.style.outline = ''
        sourceEl.style.outlineOffset = ''
      }, 2000)
    }

    if (targetEl instanceof HTMLElement) {
      targetEl.classList.add('crosslink-focused')
      targetEl.style.outline = `2px solid ${line.areaColor}`
      targetEl.style.outlineOffset = '2px'
      setTimeout(() => {
        targetEl.classList.remove('crosslink-focused')
        targetEl.style.outline = ''
        targetEl.style.outlineOffset = ''
      }, 2000)
    }
  }

  return (
    <>
      <svg
        ref={svgRef}
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

          const pathD = `M ${line.sourceX} ${line.sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${line.targetX} ${line.targetY}`
          const colorId = line.areaColor.replace('#', '')
          const key = `${line.sourceId}-${line.targetId}`
          const isHovered = hoveredKey === key

          return (
            <g key={key}>
              {/* Invisible hit-area path for easier hover targeting */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onMouseEnter={() => handleLinkEnter(line, cx1, cy1, cx2, cy2)}
                onMouseLeave={handleLinkLeave}
                onClick={() => handleLinkClick(line)}
              />
              {/* Visible animated path */}
              <path
                d={pathD}
                fill="none"
                stroke={line.areaColor}
                strokeDasharray="6 4"
                strokeWidth={isHovered ? 2 : 1.5}
                opacity={isHovered ? 0.8 : 0.45}
                markerEnd={`url(#crosslink-arrow-${colorId})`}
                className={isHovered ? 'crosslink-path-hovered' : 'crosslink-path'}
                style={{ transition: 'opacity 0.2s, stroke-width 0.2s', pointerEvents: 'none' }}
              />
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            marginTop: -8,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 15, 15, 0.85)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 1.4,
              padding: '3px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {tooltip.label}
          </div>
          {/* Tiny downward caret */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(15, 15, 15, 0.85)',
              margin: '0 auto',
            }}
          />
        </div>
      )}
    </>
  )
}
