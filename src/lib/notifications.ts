import { differenceInDays, parseISO } from 'date-fns'
import { calculateTaskStats } from '@/lib/utils/task-utils'
import { isStreakMilestone } from '@/lib/constants/animations'
import type { HomeTask, Goal, AppNotification } from '@/types/entities'

export interface WeeklyStats {
  totalDone: number
  totalScheduled: number
}

export interface GoalWeeklyStats {
  goalId: string
  goalName: string
  done: number
  total: number
}

/**
 * Compute all notifications from existing data (no DB table needed).
 * Called on-demand when the notification popover opens.
 */
export function computeNotifications(
  todayTasks: HomeTask[],
  activeGoals: Goal[],
  today: Date = new Date(),
  weeklyData?: {
    lastWeekStats?: WeeklyStats
    goalStats?: GoalWeeklyStats[]
  }
): AppNotification[] {
  const notifications: AppNotification[] = []
  const dateStr = today.toISOString().slice(0, 10)

  // Streak protection (3+ day streaks only)
  notifications.push(...computeStreakAtRisk(todayTasks, dateStr))

  // Goal deadlines
  notifications.push(...computeGoalDeadlines(activeGoals, today))

  // All complete + reflection CTA
  const allComplete = computeAllComplete(todayTasks, dateStr)
  if (allComplete) notifications.push(allComplete)

  // Streak milestones
  notifications.push(...computeStreakMilestones(todayTasks, dateStr))

  // Streak recovery (new round encouragement)
  notifications.push(...computeStreakRecovery(todayTasks, dateStr))

  // Weekly summary (Monday only)
  const weeklySummary = computeWeeklySummary(weeklyData?.lastWeekStats, today)
  if (weeklySummary) notifications.push(weeklySummary)

  // Goal progress milestones
  notifications.push(...computeGoalProgress(weeklyData?.goalStats, dateStr))

  return notifications.sort((a, b) => b.priority - a.priority)
}

/**
 * Count only actionable notifications (for badge display).
 */
export function countActionableNotifications(notifications: AppNotification[]): number {
  return notifications.filter((n) => n.autoResolve && n.priority >= 3).length
}

// ─── Individual Notification Computers ─────────────────────────

function computeStreakAtRisk(tasks: HomeTask[], dateStr: string): AppNotification[] {
  return tasks
    .filter((t) => t.streak_count >= 3 && !t.todayCheckIn)
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
    message: '하루 어땠나요? 기분을 기록해보세요',
    emoji: '🎉',
    priority: 2,
    actionLabel: '회고 쓰기',
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

function computeStreakRecovery(tasks: HomeTask[], dateStr: string): AppNotification[] {
  return tasks
    .filter((t) => t.streak_count === 0 && t.best_streak >= 3 && !t.todayCheckIn)
    .sort((a, b) => b.best_streak - a.best_streak)
    .slice(0, 3)
    .map((task) => ({
      id: `streak-recovery-${task.id}-${dateStr}`,
      type: 'streak_recovery' as const,
      title: `${task.name} 새 라운드 시작`,
      message: `새 라운드 시작! 누적 ${task.total_completed}회는 그대로예요 🌱`,
      emoji: '🌱',
      priority: 3,
      actionLabel: '시작하기',
      actionPath: '/home',
      relatedTaskId: task.id,
      autoResolve: true,
    }))
}

function computeWeeklySummary(
  lastWeekStats: WeeklyStats | undefined,
  today: Date
): AppNotification | null {
  if (today.getDay() !== 1) return null
  if (!lastWeekStats || lastWeekStats.totalScheduled === 0) return null

  const { totalDone: done, totalScheduled: total } = lastWeekStats
  const rate = Math.round((done / total) * 100)
  const dateStr = today.toISOString().slice(0, 10)

  return {
    id: `weekly-summary-${dateStr}`,
    type: 'weekly_summary' as const,
    title: '지난주 회고',
    message: `지난주 ${done}/${total} 완료 (${rate}%)`,
    emoji: '📊',
    priority: 3,
    actionLabel: '리뷰 보러가기',
    actionPath: '/review',
    autoResolve: false,
  }
}

function computeGoalProgress(
  goalStats: GoalWeeklyStats[] | undefined,
  dateStr: string
): AppNotification[] {
  if (!goalStats) return []

  return goalStats
    .filter((g) => g.total > 0 && Math.round((g.done / g.total) * 100) >= 50)
    .map((g) => {
      const rate = Math.round((g.done / g.total) * 100)
      const milestone = rate === 100 ? '🎯' : rate >= 80 ? '🚀' : '📈'
      const priority = rate >= 80 ? 4 : 3

      return {
        id: `goal-progress-${g.goalId}-${dateStr}`,
        type: 'goal_progress' as const,
        title: `'${g.goalName}' 이번 주 ${rate}% 달성!`,
        message: `${g.done}/${g.total} 완료`,
        emoji: milestone,
        priority,
        actionPath: '/roadmap',
        relatedGoalId: g.goalId,
        autoResolve: false,
      }
    })
}
