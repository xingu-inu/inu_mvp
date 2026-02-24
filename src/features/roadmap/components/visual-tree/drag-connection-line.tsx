'use client'

import { useMemo, useState, useCallback, useLayoutEffect, memo, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTreeDndStore, selectOverId } from '@/stores/tree-dnd.store'

interface TargetCoords {
  cx: number
  cy: number
  rx: number
  ry: number
}

export const DragConnectionLine = memo(function DragConnectionLine({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const storeOverId = useTreeDndStore(selectOverId)
  const overGroupId = useMemo(() => {
    if (!storeOverId) return null
    const match = (storeOverId as string).match(/^group-drop-(.+)$/)
    return match ? match[1] : null
  }, [storeOverId])

  const [coords, setCoords] = useState<TargetCoords | null>(null)

  const calculatePositions = useCallback(() => {
    const container = containerRef.current
    if (!container || !overGroupId) {
      setCoords(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const targetEl = container.querySelector(`[data-node-id="${overGroupId}"]`)
    if (!targetEl) {
      setCoords(null)
      return
    }

    const targetRect = targetEl.getBoundingClientRect()
    setCoords({
      cx: targetRect.left - containerRect.left + targetRect.width / 2,
      cy: targetRect.top - containerRect.top + targetRect.height / 2,
      rx: targetRect.width / 2 + 10,
      ry: targetRect.height / 2 + 10,
    })
  }, [containerRef, overGroupId])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const frameId = requestAnimationFrame(calculatePositions)
    return () => cancelAnimationFrame(frameId)
  }, [containerRef, calculatePositions])

  if (!coords) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <AnimatePresence>
        <motion.ellipse
          key={overGroupId}
          cx={coords.cx}
          cy={coords.cy}
          rx={coords.rx}
          ry={coords.ry}
          fill="none"
          stroke="var(--color-primary-400)"
          strokeWidth={2}
          strokeDasharray="8 5"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: 1,
            strokeDashoffset: [0, -26],
          }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{
            opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.2 },
            strokeDashoffset: { duration: 1, repeat: Infinity, ease: 'linear' },
          }}
        />
      </AnimatePresence>
    </svg>
  )
})
