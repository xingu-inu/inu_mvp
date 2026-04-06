'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Cmd/Ctrl + Key 단축키
const SHORTCUTS: Record<string, string> = {
  r: '/', // Roadmap
}

export function useKeyboardNavigation() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Cmd/Ctrl + Key 조합
      if (e.metaKey || e.ctrlKey) {
        const route = SHORTCUTS[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
