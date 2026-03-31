'use client'

import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDirection, useDirectionHistory } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { VersionCard } from './version-shared'

export function VersionDropdown() {
  const { data: direction } = useDirection()
  const setIsNewVersionWizardOpen = useRoadmapStore((s) => s.setIsNewVersionWizardOpen)
  const setIsVersionHistoryOpen = useRoadmapStore((s) => s.setIsVersionHistoryOpen)
  const [open, setOpen] = useState(false)

  const version = direction?.version ?? 1

  return (
    <>
      {/* Desktop: Popover */}
      <div className="hidden lg:block">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="버전 기록 열기"
              className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
            >
              v{version}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[360px] p-0">
            <DropdownBody
              onClose={() => setOpen(false)}
              onNewVersion={() => {
                setOpen(false)
                setIsNewVersionWizardOpen(true)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: Badge that opens existing Drawer */}
      <button
        aria-label="버전 기록 열기"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-0.5 rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)] lg:hidden"
        onClick={() => setIsVersionHistoryOpen(true)}
      >
        v{version}
        <ChevronDown className="h-3 w-3" />
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// DropdownBody — content for the popover
// ---------------------------------------------------------------------------

function DropdownBody({
  onClose,
  onNewVersion,
}: {
  onClose: () => void
  onNewVersion: () => void
}) {
  const { data: history = [], isLoading } = useDirectionHistory()
  const setRestoreSourceDirectionId = useRoadmapStore((s) => s.setRestoreSourceDirectionId)
  const setDeleteTargetDirectionId = useRoadmapStore((s) => s.setDeleteTargetDirectionId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleRestoreFrom = (directionId: string) => {
    onClose()
    setRestoreSourceDirectionId(directionId)
  }

  const handleDelete = (directionId: string) => {
    onClose()
    setDeleteTargetDirectionId(directionId)
  }

  return (
    <div className="flex max-h-[70vh] flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-sm font-semibold">로드맵 기록</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">나의 로드맵 변천사</p>
      </div>

      {/* Version list */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {isLoading && (
          <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
            불러오는 중...
          </p>
        )}

        {!isLoading && history.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
            아직 기록이 없습니다
          </p>
        )}

        {history.map((v) => (
          <VersionCard
            key={v.id}
            version={v}
            isExpanded={expandedId === v.id}
            onToggle={() => setExpandedId((prev) => (prev === v.id ? null : v.id))}
            onRestore={() => handleRestoreFrom(v.id)}
            onDelete={() => handleDelete(v.id)}
            compact
          />
        ))}
      </div>

      {/* Footer — new roadmap */}
      <div className="border-t border-[var(--color-border)] px-3 py-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onNewVersion}>
          <Plus className="mr-1.5 h-4 w-4" />새 로드맵
        </Button>
      </div>
    </div>
  )
}
