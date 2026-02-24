'use client'

import { Chip } from '@/components/ui/chip'
import { GOAL_STATUS_OPTIONS } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'

interface StatusTransitionSectionProps {
  currentStatus: GoalStatus
  onStatusChange: (status: GoalStatus) => void
}

export function StatusTransitionSection({
  currentStatus,
  onStatusChange,
}: StatusTransitionSectionProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">상태</h3>
      <div className="flex flex-wrap gap-2">
        {GOAL_STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            variant="selection"
            selected={currentStatus === option.value}
            onClick={() => onStatusChange(option.value)}
            className="cursor-pointer"
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
