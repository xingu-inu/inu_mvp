'use client'

import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AiPriorityRankResponse, AiPriorityTier, AiPriorityGoal } from '@/lib/ai/types'

interface AiPriorityRankPreviewProps {
  data: AiPriorityRankResponse
  onClose: () => void
  onTaskClick?: (taskId: string) => void
}

const TIER_STYLES: Record<number, string> = {
  1: 'bg-[var(--color-done)]/10',
  2: 'bg-amber-500/10',
  3: 'bg-[var(--color-bg-tertiary)]',
}

function GoalSection({
  goal,
  onTaskClick,
}: {
  goal: AiPriorityGoal
  onTaskClick?: (taskId: string) => void
}) {
  return (
    <div>
      {/* Goal Header */}
      <div className="px-3 py-2 pl-4">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">
          {goal.areaEmoji ? `${goal.areaEmoji} ` : ''}
          {goal.goalName}
        </div>
        {goal.goalReason && (
          <p className="text-xs text-[var(--color-text-tertiary)] italic">{goal.goalReason}</p>
        )}
      </div>

      {/* Task Rows */}
      <div className="space-y-0.5">
        {goal.tasks.map((task) => (
          <button
            key={task.taskId}
            type="button"
            onClick={() => onTaskClick?.(task.taskId)}
            className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg py-1.5 pr-3 pl-8 text-left transition-colors hover:bg-[var(--color-bg-tertiary)]"
          >
            <span className="text-sm text-[var(--color-text-primary)]">{task.taskName}</span>
            <span className="text-xs text-[var(--color-text-secondary)] italic">{task.reason}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function TierSection({
  tier,
  onTaskClick,
}: {
  tier: AiPriorityTier
  onTaskClick?: (taskId: string) => void
}) {
  const bgClass = TIER_STYLES[tier.tier] ?? TIER_STYLES[3]

  return (
    <div className="space-y-1">
      {/* Tier Header */}
      <div className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', bgClass)}>
        {tier.emoji} {tier.label}
      </div>

      {/* Goal Groups */}
      <div className="space-y-1">
        {tier.goals.map((goal, idx) => (
          <GoalSection
            key={goal.goalId ?? `no-goal-${idx}`}
            goal={goal}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  )
}

export function AiPriorityRankPreview({ data, onClose, onTaskClick }: AiPriorityRankPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 rounded-2xl bg-[var(--color-bg-secondary)] p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">우선순위 정리</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--color-text-secondary)]">{data.summary}</p>

      {/* Tier Sections */}
      <div className="space-y-2">
        {data.tiers.map((tier) => (
          <TierSection key={tier.tier} tier={tier} onTaskClick={onTaskClick} />
        ))}
      </div>

      {/* AI Insight */}
      <div className="rounded-lg bg-[var(--color-primary-50)] px-3 py-2">
        <p className="text-sm text-[var(--color-ai)]">
          <span className="mr-1">💡</span>
          {data.insight}
        </p>
      </div>
    </motion.div>
  )
}
