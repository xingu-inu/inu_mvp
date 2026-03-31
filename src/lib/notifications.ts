import { differenceInDays, parseISO } from 'date-fns'
import type { AppNotification } from '@/types/entities'
import type { NotificationGoal } from '@/repositories/goal.repository'
import type { NotificationGroup } from '@/repositories/group.repository'

/**
 * Compute all notifications from existing data (no DB table needed).
 * Called on-demand when the notification popover opens.
 *
 * Categories:
 * - Milestone: Goal/Group 완료 축하
 * - Deadline: 마감 D-0~D-7 리마인더
 * - Insight: 부드러운 넛지 (오래 멈춤, Task 없음)
 */
export function computeNotifications(
  activeGoals: NotificationGoal[],
  completedGoals: NotificationGoal[],
  recentGroups: NotificationGroup[],
  today: Date = new Date()
): AppNotification[] {
  return [
    ...computeMilestones(completedGoals, recentGroups),
    ...computeDeadlines(activeGoals, today),
    ...computeInsights(activeGoals, today),
  ].sort((a, b) => b.priority - a.priority)
}

/**
 * Count only actionable notifications (for badge display).
 */
export function countActionableNotifications(notifications: AppNotification[]): number {
  return notifications.filter(
    (n) =>
      n.type === 'announcement' ||
      n.type === 'milestone_goal' ||
      n.type === 'milestone_group' ||
      n.type === 'deadline' ||
      (n.type === 'insight' && n.priority >= 3)
  ).length
}

// ─── Milestone ────────────────────────────────────────

function computeMilestones(
  completedGoals: NotificationGoal[],
  recentGroups: NotificationGroup[]
): AppNotification[] {
  const goalMilestones: AppNotification[] = completedGoals
    .filter((g) => g.completed_at)
    .map((goal) => ({
      id: `milestone-goal-${goal.id}`,
      type: 'milestone_goal' as const,
      title: `${goal.name} 달성!`,
      message: '목표를 달성했어요! 축하해요!',
      icon: 'Trophy',
      priority: 4,
      relatedGoalId: goal.id,
      autoResolve: false,
    }))

  const groupMilestones: AppNotification[] = recentGroups
    .filter((g) => g.completed_at)
    .map((group) => ({
      id: `milestone-group-${group.id}`,
      type: 'milestone_group' as const,
      title: `${group.goal_name}`,
      message: `${group.name} 단계를 마쳤어요!`,
      icon: 'Sparkles',
      priority: 3,
      relatedGoalId: group.goal_id,
      autoResolve: false,
    }))

  return [...goalMilestones, ...groupMilestones]
}

// ─── Deadline ─────────────────────────────────────────

function computeDeadlines(goals: NotificationGoal[], today: Date): AppNotification[] {
  const results: AppNotification[] = []

  for (const goal of goals) {
    if (!goal.target_date) continue
    const daysUntil = differenceInDays(parseISO(goal.target_date), today)
    if (daysUntil < 0 || daysUntil > 7) continue

    results.push({
      id: `deadline-${goal.id}`,
      type: 'deadline' as const,
      title: `${goal.name} D-${daysUntil}`,
      message: daysUntil === 0 ? '목표 마감일이 오늘이에요!' : `${daysUntil}일 후 마감`,
      icon: daysUntil <= 2 ? 'AlertTriangle' : 'Calendar',
      priority: daysUntil <= 2 ? 5 : 3,
      relatedGoalId: goal.id,
      autoResolve: false,
    })
  }

  return results
}

// ─── Insight (부드러운 넛지) ──────────────────────────

const STALE_DAYS = 14

function computeInsights(goals: NotificationGoal[], today: Date): AppNotification[] {
  const insights: AppNotification[] = []

  for (const goal of goals) {
    // 오래 멈춤 Goal (14일+ 미업데이트)
    if (goal.updated_at) {
      const daysSinceUpdate = differenceInDays(today, parseISO(goal.updated_at))
      if (daysSinceUpdate >= STALE_DAYS) {
        insights.push({
          id: `insight-stale-${goal.id}`,
          type: 'insight' as const,
          title: goal.name,
          message: '한동안 손이 닿지 않았네요. 괜찮아요, 한번 확인해볼까요?',
          icon: 'Lightbulb',
          priority: 2,
          relatedGoalId: goal.id,
          autoResolve: true,
        })
      }
    }

    // Task 없는 Goal
    if (goal.task_count === 0) {
      insights.push({
        id: `insight-no-tasks-${goal.id}`,
        type: 'insight' as const,
        title: goal.name,
        message: '아직 할 일이 없어요. 첫 Task를 만들어볼까요?',
        icon: 'Lightbulb',
        priority: 2,
        relatedGoalId: goal.id,
        autoResolve: true,
      })
    }
  }

  return insights
}
