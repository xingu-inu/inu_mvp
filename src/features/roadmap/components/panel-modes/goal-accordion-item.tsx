'use client'

import { memo, useState, forwardRef } from 'react'
import { ChevronDown, ChevronRight, Trash2, Edit2, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OverflowMenu } from '@/features/roadmap/components/shared/overflow-menu'
import { StreakBadge, DDayBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GoalStatusPopover } from '../goal-status-popover'
import { InlineGoalEdit } from '../inline-forms'
import { GoalExpandedContent } from './goal-expanded-content'
import type { Goal, Area } from '@/types/entities'

interface GoalAccordionItemProps {
  goal: Goal
  area: Area
  isExpanded: boolean
  isHighlighted: boolean
  isEditing?: boolean
  onToggle: () => void
  onEditGoal: () => void
  onSaveEdit?: () => void
  onTaskSelect?: (taskId: string) => void
}

export const GoalAccordionItem = memo(
  forwardRef<HTMLDivElement, GoalAccordionItemProps>(function GoalAccordionItem(
    {
      goal,
      area,
      isExpanded,
      isHighlighted,
      isEditing,
      onToggle,
      onEditGoal,
      onSaveEdit,
      onTaskSelect,
    },
    ref
  ) {
    const goalTasks = goal.tasks || []
    const totalStreak = goalTasks.reduce((sum, t) => sum + t.streak_count, 0)
    const [showDelete, setShowDelete] = useState(false)

    const handleToggle = () => {
      if (isExpanded) setShowDelete(false)
      onToggle()
    }

    const handleDeleteClick = () => {
      if (!isExpanded) onToggle()
      setShowDelete(true)
    }

    return (
      <div
        ref={ref}
        className={cn(
          'group/goal overflow-hidden rounded-xl border transition-colors',
          isHighlighted
            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
            : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
        )}
      >
        {/* Header — 1줄: chevron + status + name + count + streak + ··· */}
        <div
          className="flex w-full items-center gap-2 p-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
          style={{ borderLeft: `4px solid ${area.color}` }}
        >
          <button
            className="flex-shrink-0 cursor-pointer"
            onClick={handleToggle}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            )}
          </button>

          <Target className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />

          <GoalStatusPopover goal={goal} />

          <button
            className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold"
            onClick={handleToggle}
          >
            {goal.name}
          </button>

          <div className="flex shrink-0 items-center gap-1.5">
            {goalTasks.length > 0 && (
              <span className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                {goalTasks.length}
              </span>
            )}
            {goal.target_date && <DDayBadge targetDate={goal.target_date} />}
            {totalStreak > 0 && <StreakBadge count={totalStreak} />}

            {/* ··· overflow menu */}
            <OverflowMenu
              items={[
                {
                  label: '수정',
                  icon: <Edit2 className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />,
                  onClick: onEditGoal,
                },
                {
                  label: '삭제',
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  onClick: handleDeleteClick,
                  variant: 'danger',
                },
              ]}
              alwaysVisible
              triggerClassName="h-7 w-7"
              iconClassName="h-4 w-4"
              contentWidth="w-40"
            />
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
              style={{
                backgroundColor: `color-mix(in srgb, ${area.color} 4%, transparent)`,
              }}
            >
              {isEditing ? (
                <div className="px-3 py-3">
                  <InlineGoalEdit
                    goal={goal}
                    area={area}
                    onDone={() => {
                      onSaveEdit?.()
                    }}
                  />
                </div>
              ) : (
                <GoalExpandedContent
                  goal={goal}
                  onTaskSelect={onTaskSelect}
                  onEditGoal={onEditGoal}
                  showDelete={showDelete}
                  onShowDeleteChange={setShowDelete}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  })
)
