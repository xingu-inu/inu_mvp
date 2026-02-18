'use client'

import { useSyncExternalStore } from 'react'

function subscribeToScroll(callback: () => void) {
  window.addEventListener('scroll', callback, { passive: true })
  return () => window.removeEventListener('scroll', callback)
}

function getScrollY() {
  return window.scrollY
}

function getServerScrollY() {
  return 0
}

export function useScrollY() {
  const scrollY = useSyncExternalStore(subscribeToScroll, getScrollY, getServerScrollY)
  return { scrollY }
}
