'use client'

import { memo, useState } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Pencil, Plus, Copy, Trash2, ChevronRight, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveModal, ModalFooter } from '@/components/ui/responsive-modal'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_OPTIONS } from '@/lib/goal-status'
import { useUpdateGoal } from '@/queries/use-goals'
import type { VisualTreeNode } from './tree-node-card'
import type { GoalStatus } from '@/types/entities'
import {
  useGoalVibeStore,
  VIBE_COLORS,
  VIBE_EMOJIS,
  type VibeColorKey,
} from '@/stores/goal-vibe.store'

interface TreeContextMenuProps {
  node: VisualTreeNode
  onEdit: () => void
  onAddChild: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  children: React.ReactNode
}

const ADD_CHILD_LABEL: Partial<Record<VisualTreeNode['type'], string>> = {
  direction: '영역 추가',
  area: '목표 추가',
  goal: '그룹 / 할 일 추가',
  group: '할 일 추가',
}

export const TreeContextMenu = memo(function TreeContextMenu({
  node,
  onEdit,
  onAddChild,
  onDuplicate,
  onDelete,
  children,
}: TreeContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const updateGoal = useUpdateGoal()
  const setGoalVibe = useGoalVibeStore((s) => s.setGoalVibe)
  const clearGoalVibe = useGoalVibeStore((s) => s.clearGoalVibe)
  const currentVibe = useGoalVibeStore((s) =>
    node.type === 'goal' ? s.goalVibes[node.id] : undefined
  )

  const canAddChild = node.type !== 'task'
  const canDuplicate = node.type === 'goal' || node.type === 'group' || node.type === 'task'
  const canChangeStatus = node.type === 'goal'
  const canVibe = node.type === 'goal'
  const canDelete =
    node.type === 'area' || node.type === 'goal' || node.type === 'group' || node.type === 'task'

  function handleStatusChange(status: GoalStatus) {
    updateGoal.mutate({
      id: node.id,
      input: { status },
      previousStatus: (node.status as GoalStatus) ?? undefined,
    })
  }

  const deleteDescription = getDeleteDescription(node.type)

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className={cn(
              'z-50 min-w-[160px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1 shadow-lg',
              'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
            )}
          >
            {/* 편집 */}
            <ContextMenu.Item className={menuItemClass} onSelect={onEdit}>
              <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
              편집
            </ContextMenu.Item>

            {/* 하위 추가 */}
            {canAddChild && (
              <ContextMenu.Item className={menuItemClass} onSelect={onAddChild}>
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                {ADD_CHILD_LABEL[node.type] ?? '하위 추가'}
              </ContextMenu.Item>
            )}

            {/* 복제 */}
            {canDuplicate && onDuplicate && (
              <ContextMenu.Item className={menuItemClass} onSelect={onDuplicate}>
                <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                복제
              </ContextMenu.Item>
            )}

            {/* 상태 변경 (Goal only) */}
            {canChangeStatus && (
              <>
                <ContextMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className={cn(menuItemClass, 'justify-between')}>
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 flex-shrink-0" />
                      상태 변경
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent
                      className={cn(
                        'z-50 min-w-[140px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1 shadow-lg',
                        'animate-in fade-in-0 zoom-in-95'
                      )}
                      sideOffset={4}
                    >
                      {GOAL_STATUS_OPTIONS.map((option) => (
                        <ContextMenu.Item
                          key={option.value}
                          className={cn(
                            menuItemClass,
                            node.status === option.value &&
                              'font-semibold text-[var(--color-primary-600)]'
                          )}
                          onSelect={() => handleStatusChange(option.value)}
                        >
                          {option.label}
                        </ContextMenu.Item>
                      ))}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              </>
            )}

            {/* Vibe (Goal only) */}
            {canVibe && (
              <>
                <ContextMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className={cn(menuItemClass, 'justify-between')}>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                      Vibe
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent
                      className={cn(
                        'z-50 w-[180px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 shadow-lg',
                        'animate-in fade-in-0 zoom-in-95'
                      )}
                      sideOffset={4}
                    >
                      {/* Color swatches */}
                      <p className="mb-1.5 px-1 text-[10px] font-medium tracking-wide text-[var(--color-text-tertiary)] uppercase">
                        색상
                      </p>
                      <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                        {(Object.entries(VIBE_COLORS) as [VibeColorKey, string][]).map(
                          ([key, hex]) => (
                            <button
                              key={key}
                              className={cn(
                                'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                                currentVibe?.themeColor === key
                                  ? 'border-[var(--color-text-primary)]'
                                  : 'border-transparent'
                              )}
                              style={{ backgroundColor: hex }}
                              title={key}
                              onClick={(e) => {
                                e.stopPropagation()
                                setGoalVibe(node.id, { themeColor: key })
                              }}
                            />
                          )
                        )}
                      </div>

                      {/* Emoji grid */}
                      <p className="mb-1.5 px-1 text-[10px] font-medium tracking-wide text-[var(--color-text-tertiary)] uppercase">
                        이모지
                      </p>
                      <div className="mb-2 flex flex-wrap gap-0.5 px-1">
                        {VIBE_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-[var(--color-bg-secondary)]',
                              currentVibe?.emoji === emoji && 'bg-[var(--color-bg-secondary)]'
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              setGoalVibe(node.id, { emoji })
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Reset */}
                      {currentVibe && (currentVibe.emoji ?? currentVibe.themeColor) && (
                        <ContextMenu.Item
                          className={cn(menuItemClass, 'text-[var(--color-text-tertiary)]')}
                          onSelect={() => clearGoalVibe(node.id)}
                        >
                          <X className="h-3.5 w-3.5 flex-shrink-0" />
                          초기화
                        </ContextMenu.Item>
                      )}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              </>
            )}

            {/* 삭제 */}
            {canDelete && onDelete && (
              <>
                <ContextMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                <ContextMenu.Item
                  className={cn(
                    menuItemClass,
                    'text-[var(--color-miss)] focus:bg-[var(--color-miss-bg)] focus:text-[var(--color-miss)]'
                  )}
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                  삭제
                </ContextMenu.Item>
              </>
            )}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* 삭제 확인 모달 */}
      {canDelete && onDelete && (
        <ResponsiveModal
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={`"${node.name}"을(를) 삭제할까요?`}
          description={deleteDescription}
        >
          <ModalFooter>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-[var(--color-miss)] hover:bg-[var(--color-miss)]"
              onClick={() => {
                onDelete()
                setDeleteDialogOpen(false)
              }}
            >
              삭제하기
            </Button>
          </ModalFooter>
        </ResponsiveModal>
      )}
    </>
  )
})

function getDeleteDescription(type: VisualTreeNode['type']): string | undefined {
  switch (type) {
    case 'area':
      return '이 영역에 속한 목표, 그룹, 할 일도 함께 삭제됩니다.'
    case 'goal':
      return '연결된 그룹과 할 일도 함께 삭제됩니다.'
    case 'group':
      return '이 그룹의 할 일도 함께 삭제됩니다.'
    default:
      return undefined
  }
}

const menuItemClass =
  'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:bg-[var(--color-bg-secondary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
