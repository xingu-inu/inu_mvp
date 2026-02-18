'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDirection, useDirectionHistory } from '@/queries/use-direction'
import { useReviewStore } from '@/stores/review.store'
import type { DirectionHistoryItem } from '@/types/entities'

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function getVersionLabel(item: DirectionHistoryItem): string {
  const prefix = `v${item.version}`
  if (item.status === 'active') return `${prefix} 현재 로드맵`
  const label = item.name || truncate(item.statement, 20)
  return `${prefix} ${label}`
}

export function VersionFilter() {
  const { data: currentDirection } = useDirection()
  const { data: history } = useDirectionHistory()
  const selectedDirectionId = useReviewStore((s) => s.selectedDirectionId)
  const setSelectedDirectionId = useReviewStore((s) => s.setSelectedDirectionId)

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = useCallback(
    (directionId: string | null) => {
      setSelectedDirectionId(directionId)
      setOpen(false)
    },
    [setSelectedDirectionId]
  )

  // If no history or no archived versions, render nothing
  if (!history || !currentDirection) return null
  const archivedVersions = history.filter((item) => item.status === 'archived')
  if (archivedVersions.length === 0) return null

  // Sort history by version descending (current first, then past)
  const sortedHistory = [...history].sort((a, b) => b.version - a.version)

  // Determine what is currently selected
  const isViewingPast = selectedDirectionId !== null && selectedDirectionId !== currentDirection.id
  const selectedItem = selectedDirectionId
    ? sortedHistory.find((item) => item.id === selectedDirectionId)
    : sortedHistory.find((item) => item.status === 'active')

  const buttonLabel = selectedItem
    ? getVersionLabel(selectedItem)
    : `v${currentDirection.version} 현재 로드맵`

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
          isViewingPast
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
        )}
      >
        <span>{buttonLabel}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute left-0 z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-1 shadow-lg">
          {sortedHistory.map((item) => {
            const isActive = item.status === 'active'
            const isSelected = isActive
              ? selectedDirectionId === null || selectedDirectionId === item.id
              : selectedDirectionId === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(isActive ? null : item.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                  'hover:bg-[var(--color-bg-tertiary)]',
                  isSelected && 'bg-[var(--color-bg-secondary)]'
                )}
              >
                <span className="flex-1 truncate text-[var(--color-text-primary)]">
                  v{item.version}{' '}
                  {isActive
                    ? truncate(item.statement, 20)
                    : item.name || truncate(item.statement, 20)}
                </span>
                {isActive && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    현재
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
