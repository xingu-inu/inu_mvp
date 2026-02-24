'use client'

import { createContext, useContext } from 'react'

export type DemoTab = 'home' | 'roadmap' | 'review'

interface DemoModeContextValue {
  isDemoMode: boolean
  showLoginGate: () => void
  activeTab: DemoTab
  setActiveTab: (tab: DemoTab) => void
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  showLoginGate: () => {},
  activeTab: 'home',
  setActiveTab: () => {},
})

export const DemoModeProvider = DemoModeContext.Provider
export const useDemoMode = () => useContext(DemoModeContext)
