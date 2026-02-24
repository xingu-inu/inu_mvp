'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useUpdateGoal } from '@/queries/use-goals'
import { GOAL_STATUS_CONFIG, needsTransitionDialog } from '@/lib/goal-status'
import { InlineStatusTransition } from './inline-forms/inline-status-transition'
import { cn } from '@/lib/utils'
import type { Goal, GoalStatus } from '@/types/entities'

const STATUS_LIST: { value: GoalStatus; label: string; dotColor: string }[] = [
  { value: 'backlog', label: '시작 전', dotColor: 'var(--color-text-tertiary)' },
  { value: 'active', label: '진행 중', dotColor: 'var(--color-active)' },
  { value: 'paused', label: '일시 정지', dotColor: 'var(--color-paused)' },
  { value: 'completed', label: '완료', dotColor: 'var(--color-done)' },
  { value: 'archived', label: '나중에 하기', dotColor: 'var(--color-archived)' },
]

interface GoalStatusPopoverProps {
  goal: Goal
}

export function GoalStatusPopover({ goal }: GoalStatusPopoverProps) {
  const [open, setOpen] = useState(false)
  const [transitionType, setTransitionType] = useState<'pause' | 'archive' | null>(null)
  const updateGoal = useUpdateGoal()
  const currentConfig = GOAL_STATUS_CONFIG[goal.status]

  const handleStatusClick = (newStatus: GoalStatus) => {
    if (newStatus === goal.status) {
      setOpen(false)
      return
    }

    const dialog = needsTransitionDialog(goal.status, newStatus)

    if (dialog === 'pause' || dialog === 'archive') {
      setTransitionType(dialog)
      return
    }

    updateGoal.mutate(
      {
        id: goal.id,
        input: { status: newStatus },
        previousStatus: goal.status,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  const TRANSITION_STATUS_MAP: Record<'pause' | 'archive', GoalStatus> = {
    pause: 'paused',
    archive: 'archived',
  }

  const handleTransitionConfirm = (reason?: string, note?: string) => {
    if (!transitionType) return
    updateGoal.mutate(
      {
        id: goal.id,
        input: {
          status: TRANSITION_STATUS_MAP[transitionType],
          status_change_reason: reason,
          status_change_note: note,
        },
        previousStatus: goal.status,
      },
      {
        onSuccess: () => {
          setTransitionType(null)
          setOpen(false)
        },
      }
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setTransitionType(null)
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80',
            currentConfig.bg,
            currentConfig.text
          )}
        >
          {currentConfig.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-1',
          transitionType ? 'max-h-[min(420px,70vh)] w-80 overflow-y-auto' : 'w-48'
        )}
        align="end"
        collisionPadding={16}
        onClick={(e) => e.stopPropagation()}
      >
        {transitionType ? (
          <div className="p-1">
            <InlineStatusTransition
              goalName={goal.name}
              transitionType={transitionType}
              onConfirm={handleTransitionConfirm}
              onCancel={() => setTransitionType(null)}
            />
          </div>
        ) : (
          <div className="py-1">
            {STATUS_LIST.map((option) => {
              const isCurrent = option.value === goal.status
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusClick(option.value)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    isCurrent
                      ? 'bg-[var(--color-bg-secondary)]'
                      : 'hover:bg-[var(--color-bg-secondary)]'
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 flex-shrink-0 rounded-full',
                      isCurrent && 'ring-2 ring-offset-1'
                    )}
                    style={{
                      backgroundColor: option.dotColor,
                      ['--tw-ring-color' as string]: option.dotColor,
                    }}
                  />
                  <span className={cn('flex-1', isCurrent && 'font-medium')}>{option.label}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />}
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
