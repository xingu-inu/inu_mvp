'use client'

import { createContext, useContext } from 'react'

/**
 * Context to detect when components are rendered inside a Vaul Drawer.
 * When true, ResponsiveModal should force dialog mode to avoid nested drawers.
 */
const GoalDrawerContext = createContext(false)

export function GoalDrawerProvider({ children }: { children: React.ReactNode }) {
  return <GoalDrawerContext.Provider value={true}>{children}</GoalDrawerContext.Provider>
}

export function useIsInsideDrawer() {
  return useContext(GoalDrawerContext)
}
