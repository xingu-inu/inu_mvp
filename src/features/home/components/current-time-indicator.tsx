'use client'

import { useState, useEffect } from 'react'
import { HOUR_HEIGHT } from '@/lib/constants/time-slots'

/**
 * Red horizontal line showing the current time position in the 24-hour grid.
 * Placed inside a day column with `position: relative`.
 */
export function CurrentTimeIndicator() {
  const [topPx, setTopPx] = useState<number>(() => {
    const now = new Date()
    return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
  })

  useEffect(() => {
    function update() {
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      setTopPx((minutes / 60) * HOUR_HEIGHT)
    }

    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none absolute right-0 left-0 z-10" style={{ top: `${topPx}px` }}>
      <div className="flex items-center">
        <div className="h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--color-primary-500)]" />
        <div className="h-0.5 flex-1 bg-[var(--color-primary-500)]" />
      </div>
    </div>
  )
}
