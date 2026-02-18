'use client'

import { useEffect } from 'react'

/**
 * Overrides desktop viewport lock (html/body overflow:hidden in globals.css)
 * so the landing page can scroll normally. Restores on unmount.
 */
export function LandingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflow = html.style.overflow
    const prevHtmlHeight = html.style.height
    const prevBodyOverflow = body.style.overflow
    const prevBodyHeight = body.style.height

    html.style.overflow = 'auto'
    html.style.height = 'auto'
    body.style.overflow = 'auto'
    body.style.height = 'auto'

    return () => {
      html.style.overflow = prevHtmlOverflow
      html.style.height = prevHtmlHeight
      body.style.overflow = prevBodyOverflow
      body.style.height = prevBodyHeight
    }
  }, [])

  return <>{children}</>
}
