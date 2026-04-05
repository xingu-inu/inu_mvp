'use client'

import { useRef, useEffect, useCallback, type RefObject } from 'react'
import { useReactFlow } from '@xyflow/react'

// ── Constants ─────────────────────────────────────────────────

const EDGE_ZONE = 80 // px from viewport edge
const MAX_SPEED = 15 // px per frame

// ── Interface ─────────────────────────────────────────────────

interface UseAutoPanOptions {
  containerRef: RefObject<HTMLDivElement | null>
  enabled: boolean // draggingNodeId !== null
}

// ── Hook ──────────────────────────────────────────────────────

export function useAutoPan({ containerRef, enabled }: UseAutoPanOptions): {
  updateMousePosition: (clientX: number, clientY: number) => void
} {
  const { getViewport, setViewport } = useReactFlow()
  const getViewportRef = useRef(getViewport)
  const setViewportRef = useRef(setViewport)
  useEffect(() => {
    getViewportRef.current = getViewport
    setViewportRef.current = setViewport
  })

  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rafIdRef = useRef<number | null>(null)

  // RAF loop: check edge proximity and pan each frame
  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    function tick() {
      const container = containerRef.current
      if (!container) {
        rafIdRef.current = requestAnimationFrame(tick)
        return
      }

      const rect = container.getBoundingClientRect()
      const { x: mx, y: my } = mousePositionRef.current

      let dx = 0
      let dy = 0

      // Left edge
      const distLeft = mx - rect.left
      if (distLeft < EDGE_ZONE && distLeft >= 0) {
        dx = -MAX_SPEED * (1 - distLeft / EDGE_ZONE)
      }

      // Right edge
      const distRight = rect.right - mx
      if (distRight < EDGE_ZONE && distRight >= 0) {
        dx = MAX_SPEED * (1 - distRight / EDGE_ZONE)
      }

      // Top edge
      const distTop = my - rect.top
      if (distTop < EDGE_ZONE && distTop >= 0) {
        dy = -MAX_SPEED * (1 - distTop / EDGE_ZONE)
      }

      // Bottom edge
      const distBottom = rect.bottom - my
      if (distBottom < EDGE_ZONE && distBottom >= 0) {
        dy = MAX_SPEED * (1 - distBottom / EDGE_ZONE)
      }

      if (dx !== 0 || dy !== 0) {
        const vp = getViewportRef.current()
        setViewportRef.current({ x: vp.x - dx, y: vp.y - dy, zoom: vp.zoom })
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [enabled, containerRef])

  const updateMousePosition = useCallback((clientX: number, clientY: number) => {
    mousePositionRef.current = { x: clientX, y: clientY }
  }, [])

  return { updateMousePosition }
}
