'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal, ModalFooter } from '@/components/ui/responsive-modal'
import { useDirectionHistory, useDeleteArchivedRoadmap } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'

export function DeleteVersionDialog() {
  const directionId = useRoadmapStore((s) => s.deleteTargetDirectionId)
  const setDeleteTargetDirectionId = useRoadmapStore((s) => s.setDeleteTargetDirectionId)

  const isOpen = directionId !== null

  const { data: history = [] } = useDirectionHistory()
  const version = history.find((h) => h.id === directionId)

  const deleteMutation = useDeleteArchivedRoadmap()

  const handleClose = () => setDeleteTargetDirectionId(null)

  const handleDelete = async () => {
    if (!directionId) return
    await deleteMutation.mutateAsync(directionId)
    handleClose()
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title="로드맵 기록 삭제"
      description="이 작업은 되돌릴 수 없습니다"
    >
      <div className="space-y-4 p-1">
        {version && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">v{version.version}</span>
              {version.name && (
                <span className="text-xs text-[var(--color-text-secondary)]">{version.name}</span>
              )}
            </div>
            <p className="mt-1 text-sm">{version.statement}</p>
            <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
              {version.areaCount}개 영역 · {version.goalCount}개 목표
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">
            이 기록을 삭제하면 해당 버전의 영역, 목표, 그룹, 태스크가 모두 삭제되며 되돌릴 수
            없습니다.
          </p>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          취소
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
        </Button>
      </ModalFooter>
    </ResponsiveModal>
  )
}
