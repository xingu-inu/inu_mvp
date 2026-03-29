import { differenceInDays, parseISO } from 'date-fns'
import type { AppNotification } from '@/types/entities'

/** Minimal goal shape needed for notification computation */
interface NotificationGoal {
  id: string
  name: string
  target_date: string | null
}

/**
 * Compute all notifications from existing data (no DB table needed).
 * Called on-demand when the notification popover opens.
 */
export function computeNotifications(
  activeGoals: NotificationGoal[],
  today: Date = new Date()
): AppNotification[] {
  return computeGoalDeadlines(activeGoals, today).sort((a, b) => b.priority - a.priority)
}

/**
 * Count only actionable notifications (for badge display).
 */
export function countActionableNotifications(notifications: AppNotification[]): number {
  return notifications.filter(
    (n) =>
      n.type === 'announcement' || n.type === 'goal_deadline' || (n.autoResolve && n.priority >= 3)
  ).length
}

// ─── Individual Notification Computers ─────────────────────────

function computeGoalDeadlines(goals: NotificationGoal[], today: Date): AppNotification[] {
  return goals
    .filter((g) => {
      if (!g.target_date) return false
      const daysUntil = differenceInDays(parseISO(g.target_date), today)
      return daysUntil >= 0 && daysUntil <= 7
    })
    .map((goal) => {
      const daysUntil = differenceInDays(parseISO(goal.target_date!), today)
      return {
        id: `goal-deadline-${goal.id}`,
        type: 'goal_deadline' as const,
        title: `${goal.name} D-${daysUntil}`,
        message: daysUntil === 0 ? '목표 마감일이 오늘이에요!' : `${daysUntil}일 후 마감`,
        emoji: daysUntil <= 2 ? '🚨' : '📅',
        priority: daysUntil <= 2 ? 5 : 3,
        actionPath: `/roadmap/${goal.id}`,
        relatedGoalId: goal.id,
        autoResolve: false,
      }
    })
}
