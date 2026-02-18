'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigationStore } from '@/stores/navigation.store'

export function useScrollRestoration() {
  const pathname = usePathname()
  const { getScrollPosition, setScrollPosition } = useNavigationStore()

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = getScrollPosition(pathname)
    if (savedPosition > 0) {
      window.scrollTo(0, savedPosition)
    }
  }, [pathname, getScrollPosition])

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(pathname, window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname, setScrollPosition])
}
