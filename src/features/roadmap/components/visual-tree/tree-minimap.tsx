'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MINIMAP_WIDTH = 180
const MINIMAP_HEIGHT = 120

interface NodeRect {
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface TreeMinimapProps {
  scrollRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  isVisible: boolean
  onToggle: () => void
}

function getNodeColor(el: HTMLElement): string {
  // Map node type from data attribute or class hints
  const card = el.querySelector('[data-node-type]') as HTMLElement | null
  const type = card?.dataset.nodeType ?? el.dataset.nodeType ?? ''
  switch (type) {
    case 'direction':
      return '#6366f1' // indigo
    case 'area':
      return '#8b5cf6' // violet
    case 'goal':
      return '#3b82f6' // blue
    case 'group':
      return '#10b981' // emerald
    case 'task':
      return '#94a3b8' // slate
    default:
      return '#64748b'
  }
}

function collectNodeRects(contentEl: HTMLElement, zoom: number): NodeRect[] {
  const nodes = contentEl.querySelectorAll<HTMLElement>('[data-node-id]')
  const contentRect = contentEl.getBoundingClientRect()
  const rects: NodeRect[] = []

  nodes.forEach((el) => {
    const rect = el.getBoundingClientRect()
    // Convert to content-relative coordinates, accounting for zoom
    const x = (rect.left - contentRect.left) / zoom
    const y = (rect.top - contentRect.top) / zoom
    const w = rect.width / zoom
    const h = rect.height / zoom
    rects.push({ x, y, width: w, height: h, color: getNodeColor(el) })
  })

  return rects
}

export function TreeMinimap({ scrollRef, zoom, isVisible, onToggle: _onToggle }: TreeMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autoVisible, setAutoVisible] = useState(true)
  const isDraggingRef = useRef(false)

  // Schedule canvas draw on next animation frame
  const draw = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const canvas = canvasRef.current
      const scroll = scrollRef.current
      if (!canvas || !scroll) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // The zoomed content wrapper is the first child of scrollRef
      const contentEl = scroll.firstElementChild as HTMLElement | null
      if (!contentEl) return

      const nodeRects = collectNodeRects(contentEl, zoom)

      // Clear canvas first (show background even with no nodes)
      ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT)

      if (nodeRects.length === 0) return

      // Compute bounding box of all nodes in unzoomed content coords
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const r of nodeRects) {
        minX = Math.min(minX, r.x)
        minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.width)
        maxY = Math.max(maxY, r.y + r.height)
      }

      const contentWidth = maxX - minX || 1
      const contentHeight = maxY - minY || 1

      const padding = 8
      const drawW = MINIMAP_WIDTH - padding * 2
      const drawH = MINIMAP_HEIGHT - padding * 2

      // Scale to fit all content into minimap
      const scale = Math.min(drawW / contentWidth, drawH / contentHeight)
      const offsetX = padding + (drawW - contentWidth * scale) / 2
      const offsetY = padding + (drawH - contentHeight * scale) / 2

      // Draw nodes
      for (const r of nodeRects) {
        const nx = offsetX + (r.x - minX) * scale
        const ny = offsetY + (r.y - minY) * scale
        const nw = Math.max(2, r.width * scale)
        const nh = Math.max(2, r.height * scale)
        ctx.fillStyle = r.color + 'cc' // 80% opacity
        ctx.beginPath()
        ctx.roundRect(nx, ny, nw, nh, 2)
        ctx.fill()
      }

      // Draw viewport indicator
      // scrollRef scroll offsets are in CSS pixels (already accounting for zoom via CSS zoom)
      const scrollW = scroll.clientWidth
      const scrollH = scroll.clientHeight
      const scrollLeft = scroll.scrollLeft
      const scrollTop = scroll.scrollTop

      // Convert viewport to unzoomed content coords
      const vpX = scrollLeft / zoom
      const vpY = scrollTop / zoom
      const vpW = scrollW / zoom
      const vpH = scrollH / zoom

      const vx = offsetX + (vpX - minX) * scale
      const vy = offsetY + (vpY - minY) * scale
      const vw = vpW * scale
      const vh = vpH * scale

      ctx.strokeStyle = 'rgba(59,130,246,0.8)'
      ctx.lineWidth = 1.5
      ctx.fillStyle = 'rgba(59,130,246,0.08)'
      ctx.beginPath()
      ctx.roundRect(vx, vy, vw, vh, 3)
      ctx.fill()
      ctx.stroke()
    })
  }, [scrollRef, zoom])

  // Auto-hide logic: show for 10s after activity, then fade
  const resetHideTimer = useCallback(() => {
    setAutoVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setAutoVisible(false), 10000)
  }, [])

  // Attach scroll/resize/mutation listeners
  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return

    const onScroll = () => {
      draw()
      resetHideTimer()
    }

    const ro = new ResizeObserver(() => draw())

    // MutationObserver to detect when tree nodes are added/removed from DOM
    let moTimer: ReturnType<typeof setTimeout> | null = null
    const mo = new MutationObserver(() => {
      if (moTimer) clearTimeout(moTimer)
      moTimer = setTimeout(() => draw(), 300)
    })

    scroll.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(scroll)

    const contentEl = scroll.firstElementChild
    if (contentEl) {
      ro.observe(contentEl)
      mo.observe(contentEl, { childList: true, subtree: true })
    }

    // Initial draw + start hide timer
    draw()
    const initTimer = setTimeout(() => resetHideTimer(), 0)

    return () => {
      clearTimeout(initTimer)
      if (moTimer) clearTimeout(moTimer)
      scroll.removeEventListener('scroll', onScroll)
      ro.disconnect()
      mo.disconnect()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [scrollRef, draw, resetHideTimer])

  // Redraw when zoom changes
  useEffect(() => {
    draw()
    const t = setTimeout(() => resetHideTimer(), 0)
    return () => clearTimeout(t)
  }, [zoom, draw, resetHideTimer])

  // Convert minimap click/drag coordinates to scroll position
  const minimapToScroll = useCallback(
    (clientX: number, clientY: number, canvasEl: HTMLCanvasElement) => {
      const scroll = scrollRef.current
      const contentEl = scroll?.firstElementChild as HTMLElement | null
      if (!scroll || !contentEl) return

      const nodeRects = collectNodeRects(contentEl, zoom)
      if (nodeRects.length === 0) return

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const r of nodeRects) {
        minX = Math.min(minX, r.x)
        minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.width)
        maxY = Math.max(maxY, r.y + r.height)
      }
      const contentWidth = maxX - minX || 1
      const contentHeight = maxY - minY || 1

      const padding = 8
      const drawW = MINIMAP_WIDTH - padding * 2
      const drawH = MINIMAP_HEIGHT - padding * 2
      const scale = Math.min(drawW / contentWidth, drawH / contentHeight)
      const offsetX = padding + (drawW - contentWidth * scale) / 2
      const offsetY = padding + (drawH - contentHeight * scale) / 2

      const canvasRect = canvasEl.getBoundingClientRect()
      const mx = clientX - canvasRect.left
      const my = clientY - canvasRect.top

      // Map minimap coords back to unzoomed content coords
      const cx = (mx - offsetX) / scale + minX
      const cy = (my - offsetY) / scale + minY

      // Center viewport on clicked point
      const scrollX = cx * zoom - scroll.clientWidth / 2
      const scrollY = cy * zoom - scroll.clientHeight / 2

      scroll.scrollTo({
        left: Math.max(0, scrollX),
        top: Math.max(0, scrollY),
        behavior: 'smooth',
      })
    },
    [scrollRef, zoom]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      isDraggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      minimapToScroll(e.clientX, e.clientY, e.currentTarget)
      resetHideTimer()
    },
    [minimapToScroll, resetHideTimer]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return
      minimapToScroll(e.clientX, e.clientY, e.currentTarget)
    },
    [minimapToScroll]
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleMouseEnter = useCallback(() => {
    setAutoVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }, [])

  const handleMouseLeave = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {autoVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-6 bottom-6 z-20 hidden md:block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 shadow-sm backdrop-blur-sm"
            style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
          >
            <canvas
              ref={canvasRef}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              className="cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="트리 미니맵 — 클릭하여 이동"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
