'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Module-level listener list for same-tab localStorage notifications
let themeListeners: (() => void)[] = []

function subscribeTheme(callback: () => void) {
  themeListeners.push(callback)
  window.addEventListener('storage', callback)
  return () => {
    themeListeners = themeListeners.filter((l) => l !== callback)
    window.removeEventListener('storage', callback)
  }
}

function getThemeSnapshot(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'light'
}

function getServerSnapshot(): Theme {
  return 'system'
}

function emitThemeChange() {
  for (const listener of themeListeners) listener()
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme)
    emitThemeChange()
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
