'use client'

import { useEffect, useRef } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'

export interface TreeSearchBarProps {
  isOpen: boolean
  onClose: () => void
  query: string
  onQueryChange: (query: string) => void
  currentIndex: number
  total: number
  onNext: () => void
  onPrev: () => void
  /** Called when currentIndex changes — parent should scroll to the node */
  onNavigate: (nodeId: string) => void
  orderedMatches: string[]
}

export function TreeSearchBar({
  isOpen,
  onClose,
  query,
  onQueryChange,
  currentIndex,
  total,
  onNext,
  onPrev,
  onNavigate,
  orderedMatches,
}: TreeSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Notify parent when currentIndex changes and there are matches
  useEffect(() => {
    if (total > 0 && orderedMatches[currentIndex]) {
      onNavigate(orderedMatches[currentIndex])
    }
  }, [currentIndex, orderedMatches, total, onNavigate])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
    }
  }

  const handleNavNext = () => {
    onNext()
    inputRef.current?.focus()
  }

  const handleNavPrev = () => {
    onPrev()
    inputRef.current?.focus()
  }

  const countLabel = total > 0 ? `${currentIndex + 1}/${total}` : '0/0'

  return (
    <div
      className="absolute top-4 right-4 z-30 flex min-w-[280px] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 px-3 py-2 shadow-lg backdrop-blur-md"
      role="search"
      aria-label="트리 노드 검색"
    >
      {/* Search icon */}
      <Search className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="노드 검색..."
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
        aria-label="노드 검색"
      />

      {/* Match count */}
      <span className="flex-shrink-0 text-xs text-[var(--color-text-tertiary)] tabular-nums">
        {countLabel}
      </span>

      {/* Prev / Next */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleNavPrev}
          disabled={total === 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
          aria-label="이전 결과"
          title="이전 (Shift+Enter)"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleNavNext}
          disabled={total === 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
          aria-label="다음 결과"
          title="다음 (Enter)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        aria-label="검색 닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
