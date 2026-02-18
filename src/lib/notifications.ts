import { differenceInDays, parseISO } from 'date-fns'
import { calculateTaskStats } from '@/lib/utils/task-utils'
import { isStreakMilestone } from '@/lib/constants/animations'
import type { HomeTask, Goal, AppNotification } from '@/types/entities'

/**
 * Compute all notifications from existing data (no DB table needed).
 * Called on-demand when the notification popover opens.
 */
export function computeNotifications(
  todayTasks: HomeTask[],
  activeGoals: Goal[],
  today: Date = new Date()
): AppNotification[] {
  const notifications: AppNotification[] = []
  const dateStr = today.toISOString().slice(0, 10)

  const incomplete = computeIncompleteTasks(todayTasks, dateStr)
  if (incomplete) notifications.push(incomplete)

  notifications.push(...computeStreakAtRisk(todayTasks, dateStr))
  notifications.push(...computeGoalDeadlines(activeGoals, today))

  const allComplete = computeAllComplete(todayTasks, dateStr)
  if (allComplete) notifications.push(allComplete)

  notifications.push(...computeStreakMilestones(todayTasks, dateStr))

  return notifications.sort((a, b) => b.priority - a.priority)
}

/**
 * Count only actionable notifications (for badge display).
 */
export function countActionableNotifications(notifications: AppNotification[]): number {
  return notifications.filter((n) => n.autoResolve && n.priority >= 3).length
}

// ─── Individual Notification Computers ─────────────────────────

function computeIncompleteTasks(tasks: HomeTask[], dateStr: string): AppNotification | null {
  const stats = calculateTaskStats(tasks)
  if (stats.remaining === 0) return null

  return {
    id: `incomplete-tasks-${dateStr}`,
    type: 'incomplete_tasks',
    title: `오늘 ${stats.remaining}개 할 일이 남아있어요`,
    message: `총 ${stats.total}개 중 ${stats.completed}개 완료`,
    emoji: '📝',
    priority: 3,
    actionLabel: '보러가기',
    actionPath: '/home',
    autoResolve: true,
  }
}

function computeStreakAtRisk(tasks: HomeTask[], dateStr: string): AppNotification[] {
  return tasks
    .filter((t) => t.streak_count > 0 && !t.todayCheckIn)
    .sort((a, b) => b.streak_count - a.streak_count)
    .slice(0, 3)
    .map((task) => ({
      id: `streak-risk-${task.id}-${dateStr}`,
      type: 'streak_at_risk' as const,
      title: `${task.name} 연속 기록이 위험해요`,
      message: `🔥${task.streak_count}일 연속을 유지하려면 오늘 달성하세요`,
      emoji: '⚠️',
      priority: 4,
      actionLabel: '체크하기',
      actionPath: '/home',
      relatedTaskId: task.id,
      autoResolve: true,
    }))
}

function computeGoalDeadlines(goals: Goal[], today: Date): AppNotification[] {
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

function computeAllComplete(tasks: HomeTask[], dateStr: string): AppNotification | null {
  const stats = calculateTaskStats(tasks)
  if (!stats.isAllDone || stats.total === 0) return null

  return {
    id: `all-complete-${dateStr}`,
    type: 'all_complete',
    title: '오늘 모든 할 일을 완료했어요!',
    message: `${stats.total}개 할 일 모두 달성!`,
    emoji: '🎉',
    priority: 2,
    actionPath: '/home',
    autoResolve: false,
  }
}

function computeStreakMilestones(tasks: HomeTask[], dateStr: string): AppNotification[] {
  return tasks
    .filter((t) => t.todayCheckIn?.status === 'done' && isStreakMilestone(t.streak_count))
    .map((task) => ({
      id: `streak-milestone-${task.id}-${dateStr}`,
      type: 'streak_milestone' as const,
      title: `${task.name} 🔥${task.streak_count} 달성!`,
      message: `${task.streak_count}일 연속 완료!`,
      emoji: '🏆',
      priority: 4,
      autoResolve: false,
    }))
}
