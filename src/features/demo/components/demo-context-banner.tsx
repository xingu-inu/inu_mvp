'use client'

import { useState, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'inu-demo-banner-dismissed'

function getSnapshot(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === 'true'
}

function getServerSnapshot(): boolean {
  return true // hidden on server to avoid flash
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export function DemoContextBanner() {
  const wasDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || wasDismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(STORAGE_KEY, 'true')
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 lg:px-6">
      <p className="text-xs text-[var(--color-text-secondary)]">
        <span className="mr-1">🌱</span>
        지은(27세)의 인생 로드맵을 체험 중이에요
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
        aria-label="배너 닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
