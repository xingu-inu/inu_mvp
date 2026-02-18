'use client'

import { ArrowLeft } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import { DDayBadge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { useHomeStore } from '@/stores/home.store'
import { useGoal } from '@/queries/use-goals'

/**
 * Lightweight goal detail view in the home panel.
 * Shows goal info, group progress, and task list.
 */
export function HomeGoalView() {
  const { selectedGoalId, clearPanelSelection, selectTask } = useHomeStore()
  const { data: goal, isLoading } = useGoal(selectedGoalId ?? '')

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <GoalViewHeader onBack={clearPanelSelection} />
        <div className="flex-1 space-y-4 p-4">
          <div className="h-6 w-40 animate-pulse rounded bg-[var(--color-bg-primary)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--color-bg-primary)]" />
        </div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="flex h-full flex-col">
        <GoalViewHeader onBack={clearPanelSelection} />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-[var(--color-text-tertiary)]">목표를 찾을 수 없어요</p>
        </div>
      </div>
    )
  }

  const activeTasks = goal.tasks?.filter((t) => t.is_active) ?? []
  const completedGroups = goal.groups?.filter((g) => g.is_completed).length ?? 0
  const totalGroups = goal.groups?.length ?? 0

  return (
    <div className="flex h-full flex-col">
      <GoalViewHeader onBack={clearPanelSelection} />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Area chip */}
        {goal.area && (
          <Chip variant="area" emoji={goal.area.emoji} color={goal.area.color}>
            {goal.area.name}
          </Chip>
        )}

        {/* Goal name + D-Day */}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{goal.name}</h3>
          {goal.target_date && <DDayBadge targetDate={goal.target_date} />}
        </div>

        {/* Why */}
        {goal.why && <p className="text-sm text-[var(--color-text-secondary)]">💭 {goal.why}</p>}

        {/* Group progress */}
        {totalGroups > 0 && (
          <div className="space-y-2 rounded-xl bg-[var(--color-bg-primary)] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--color-text-secondary)]">그룹 현황</span>
              <span className="text-[var(--color-text-tertiary)]">
                {completedGroups}/{totalGroups}
              </span>
            </div>
            <ProgressBar value={completedGroups} max={totalGroups} />
          </div>
        )}

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-[var(--color-text-tertiary)]">
              활성 Task ({activeTasks.length})
            </h4>
            {activeTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => selectTask(task.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-primary)]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: goal.area?.color ?? 'var(--color-border)' }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
                  {task.name}
                </span>
                {task.streak_count > 0 && (
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    🔥{task.streak_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GoalViewHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-3">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </button>
    </div>
  )
}
