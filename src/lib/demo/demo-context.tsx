'use client'

import { createContext, useContext } from 'react'

export type DemoTab = 'roadmap' | 'review'

interface DemoModeContextValue {
  isDemoMode: boolean
  showLoginGate: () => void
  activeTab: DemoTab
  setActiveTab: (tab: DemoTab) => void
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  showLoginGate: () => {},
  activeTab: 'roadmap',
  setActiveTab: () => {},
})

export const DemoModeProvider = DemoModeContext.Provider
export const useDemoMode = () => useContext(DemoModeContext)
