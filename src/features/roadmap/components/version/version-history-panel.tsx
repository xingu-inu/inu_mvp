'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useDirectionHistory } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { VersionCard } from './version-shared'

export function VersionHistoryPanel() {
  const isOpen = useRoadmapStore((s) => s.isVersionHistoryOpen)
  const setIsOpen = useRoadmapStore((s) => s.setIsVersionHistoryOpen)
  const setRestoreSourceDirectionId = useRoadmapStore((s) => s.setRestoreSourceDirectionId)
  const setDeleteTargetDirectionId = useRoadmapStore((s) => s.setDeleteTargetDirectionId)
  const setIsNewVersionWizardOpen = useRoadmapStore((s) => s.setIsNewVersionWizardOpen)

  const { data: history = [], isLoading } = useDirectionHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleRestoreFrom = (directionId: string) => {
    setIsOpen(false)
    setRestoreSourceDirectionId(directionId)
  }

  const handleDelete = (directionId: string) => {
    setIsOpen(false)
    setDeleteTargetDirectionId(directionId)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      title="로드맵 기록"
      description="나의 로드맵 변천사"
    >
      <div className="space-y-3 p-1">
        {isLoading && (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            불러오는 중...
          </p>
        )}

        {!isLoading && history.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            아직 기록이 없습니다
          </p>
        )}

        {history.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            isExpanded={expandedId === version.id}
            onToggle={() => setExpandedId((prev) => (prev === version.id ? null : version.id))}
            onRestore={() => handleRestoreFrom(version.id)}
            onDelete={() => handleDelete(version.id)}
          />
        ))}

        {/* 새 로드맵 버튼 */}
        <div className="border-t border-[var(--color-border)] pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setIsOpen(false)
              setIsNewVersionWizardOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />새 로드맵
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
