'use client'

import { memo } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Pencil, Plus, Copy, Trash2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_OPTIONS } from '@/lib/goal-status'
import { useUpdateGoal } from '@/queries/use-goals'
import type { VisualTreeNode } from './tree-node-card'
import type { GoalStatus } from '@/types/entities'

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
  const updateGoal = useUpdateGoal()

  const canAddChild = node.type !== 'task'
  const canDuplicate = node.type === 'goal' || node.type === 'group' || node.type === 'task'
  const canChangeStatus = node.type === 'goal'
  const canDelete =
    node.type === 'area' || node.type === 'goal' || node.type === 'group' || node.type === 'task'

  function handleDelete() {
    const confirmed = window.confirm(`"${node.name}"을(를) 삭제하시겠습니까?`)
    if (confirmed) {
      onDelete?.()
    }
  }

  function handleStatusChange(status: GoalStatus) {
    updateGoal.mutate({
      id: node.id,
      input: { status },
      previousStatus: (node.status as GoalStatus) ?? undefined,
    })
  }

  return (
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

          {/* 삭제 */}
          {canDelete && onDelete && (
            <>
              <ContextMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
              <ContextMenu.Item
                className={cn(
                  menuItemClass,
                  'text-[var(--color-miss)] focus:bg-[var(--color-miss-bg)] focus:text-[var(--color-miss)]'
                )}
                onSelect={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                삭제
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
})

const menuItemClass =
  'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:bg-[var(--color-bg-secondary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
