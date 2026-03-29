'use client'

import { Trash2, Target, X, ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { PeriodBadge } from '@/components/ui/badge'
import type { Goal } from '@/types/entities'

interface GoalViewHeaderProps {
  goal: Goal
  showBackButton?: boolean
  onBack?: () => void
  showCloseButton?: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function GoalViewHeader({
  goal,
  showBackButton = false,
  onBack,
  showCloseButton = true,
  onClose,
  onEdit,
  onDelete,
}: GoalViewHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-[var(--color-border)] p-4">
      <div className="flex-1">
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 gap-1">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
        )}
        {goal.area && (
          <Chip variant="area" emoji={goal.area.emoji} color={goal.area.color} className="mb-2">
            {goal.area.name}
          </Chip>
        )}
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[var(--color-primary-500)]" />
          <h2 className="text-xl font-bold">{goal.name}</h2>
          {(goal.start_date || goal.target_date) && (
            <PeriodBadge startDate={goal.start_date} targetDate={goal.target_date} />
          )}
        </div>
      </div>
      <div className="flex gap-1">
        {goal.area && (
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="편집">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="삭제">
          <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
        </Button>
        {showCloseButton && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
