'use client'

import { useCallback } from 'react'
import { Drawer } from 'vaul'
import { useRoadmapStore, selectMobileDrawerGoalId } from '@/stores/roadmap.store'
import { GoalDrawerProvider } from '@/features/roadmap/contexts/goal-drawer-context'
import { GoalViewMode } from './panel-modes'

export function GoalDetailDrawer() {
  const goalId = useRoadmapStore(selectMobileDrawerGoalId)
  const closeMobileDrawer = useRoadmapStore((s) => s.closeMobileDrawer)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeMobileDrawer()
      }
    },
    [closeMobileDrawer]
  )

  return (
    <Drawer.Root open={!!goalId} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[92vh] flex-col rounded-t-[20px] bg-[var(--color-bg-primary)]">
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--color-border)]" />

          {/* Accessible title (sr-only since GoalViewMode has its own header) */}
          <Drawer.Title className="sr-only">목표 상세</Drawer.Title>
          <Drawer.Description className="sr-only">
            목표의 상세 정보를 확인하고 관리할 수 있습니다
          </Drawer.Description>

          {/* Content: wrap in GoalDrawerProvider so child modals use dialog mode */}
          <div className="flex-1 overflow-hidden">
            <GoalDrawerProvider>
              {goalId && (
                <GoalViewMode
                  goalId={goalId}
                  onClose={closeMobileDrawer}
                  showCloseButton={false}
                  showBackButton={false}
                />
              )}
            </GoalDrawerProvider>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
