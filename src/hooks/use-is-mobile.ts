'use client'

import { useSyncExternalStore } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribe(cb: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

function getSnapshot() {
  return !window.matchMedia(DESKTOP_QUERY).matches
}

function getServerSnapshot() {
  return false // SSR defaults to desktop
}

/**
 * SSR-safe hook that returns true when viewport is below lg (1024px).
 * Uses useSyncExternalStore to avoid setState-in-effect lint errors.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
