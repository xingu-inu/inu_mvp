import { describe, it, expect } from 'vitest'
import { addDays, subDays, format } from 'date-fns'
import { computeNotifications, countActionableNotifications } from '../notifications'
import type { AppNotification } from '@/types/entities'
import type { NotificationGoal } from '@/repositories/goal.repository'
import type { NotificationGroup } from '@/repositories/group.repository'

const TODAY = new Date('2026-02-24T00:00:00')
const DATE_STR = '2026-02-24'

function makeGoal(overrides: Partial<NotificationGoal> = {}): NotificationGoal {
  return {
    id: 'g1',
    name: 'Goal',
    status: 'active',
    target_date: null,
    updated_at: TODAY.toISOString(),
    completed_at: null,
    task_count: 1,
    ...overrides,
  }
}

function makeGroup(overrides: Partial<NotificationGroup> = {}): NotificationGroup {
  return {
    id: 'gr1',
    name: 'Phase 1',
    goal_id: 'g1',
    goal_name: 'Goal',
    completed_at: TODAY.toISOString(),
    ...overrides,
  }
}

// ─── Deadline ────────────────────────────────────────────

describe('computeDeadlines', () => {
  it('generates D-0 with priority 5 and alarm for today deadline', () => {
    const goals = [makeGoal({ target_date: DATE_STR })]
    const result = computeNotifications(goals, [], [], TODAY)

    const deadlines = result.filter((n) => n.type === 'deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-0')
    expect(deadlines[0].priority).toBe(5)
    expect(deadlines[0].icon).toBe('AlertTriangle')
    expect(deadlines[0].message).toBe('목표 마감일이 오늘이에요!')
  })

  it('generates D-2 with priority 5 for 2-day deadline', () => {
    const futureDate = format(addDays(TODAY, 2), 'yyyy-MM-dd')
    const goals = [makeGoal({ target_date: futureDate })]
    const result = computeNotifications(goals, [], [], TODAY)

    const deadlines = result.filter((n) => n.type === 'deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-2')
    expect(deadlines[0].priority).toBe(5)
  })

  it('generates D-7 with priority 3 and calendar for 7-day deadline', () => {
    const futureDate = format(addDays(TODAY, 7), 'yyyy-MM-dd')
    const goals = [makeGoal({ target_date: futureDate })]
    const result = computeNotifications(goals, [], [], TODAY)

    const deadlines = result.filter((n) => n.type === 'deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-7')
    expect(deadlines[0].priority).toBe(3)
    expect(deadlines[0].icon).toBe('Calendar')
  })

  it('does NOT generate for deadline > 7 days away', () => {
    const futureDate = format(addDays(TODAY, 8), 'yyyy-MM-dd')
    const goals = [makeGoal({ target_date: futureDate })]
    const result = computeNotifications(goals, [], [], TODAY)

    expect(result.filter((n) => n.type === 'deadline')).toHaveLength(0)
  })

  it('does NOT generate for goals with no target_date', () => {
    const goals = [makeGoal()]
    const result = computeNotifications(goals, [], [], TODAY)

    expect(result.filter((n) => n.type === 'deadline')).toHaveLength(0)
  })

  it('generates overdue notifications for D+1 to D+3', () => {
    const yesterday = format(addDays(TODAY, -1), 'yyyy-MM-dd')
    const goals = [makeGoal({ target_date: yesterday })]
    const result = computeNotifications(goals, [], [], TODAY)

    const deadlines = result.filter((n) => n.type === 'deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D+1')
    expect(deadlines[0].priority).toBe(4)
  })

  it('does NOT generate for deadlines older than D+3', () => {
    const oldDate = format(addDays(TODAY, -4), 'yyyy-MM-dd')
    const goals = [makeGoal({ target_date: oldDate })]
    const result = computeNotifications(goals, [], [], TODAY)

    expect(result.filter((n) => n.type === 'deadline')).toHaveLength(0)
  })

  it('generates multiple deadline notifications sorted by priority', () => {
    const goals = [
      makeGoal({ id: 'g1', name: 'Urgent', target_date: DATE_STR }),
      makeGoal({
        id: 'g2',
        name: 'Soon',
        target_date: format(addDays(TODAY, 5), 'yyyy-MM-dd'),
      }),
    ]
    const result = computeNotifications(goals, [], [], TODAY)

    const deadlines = result.filter((n) => n.type === 'deadline')
    expect(deadlines).toHaveLength(2)
    expect(deadlines[0].priority).toBeGreaterThanOrEqual(deadlines[1].priority)
  })

  it('returns empty for no goals', () => {
    const result = computeNotifications([], [], [], TODAY)
    expect(result).toHaveLength(0)
  })
})

// ─── Milestone ───────────────────────────────────────────

describe('computeMilestones', () => {
  it('generates goal completion milestone', () => {
    const completedGoals = [
      makeGoal({
        status: 'completed',
        completed_at: TODAY.toISOString(),
      }),
    ]
    const result = computeNotifications([], completedGoals, [], TODAY)

    const milestones = result.filter((n) => n.type === 'milestone_goal')
    expect(milestones).toHaveLength(1)
    expect(milestones[0].icon).toBe('Trophy')
    expect(milestones[0].title).toContain('달성')
    expect(milestones[0].relatedGoalId).toBe('g1')
  })

  it('generates group completion milestone', () => {
    const groups = [makeGroup()]
    const result = computeNotifications([], [], groups, TODAY)

    const milestones = result.filter((n) => n.type === 'milestone_group')
    expect(milestones).toHaveLength(1)
    expect(milestones[0].icon).toBe('Sparkles')
    expect(milestones[0].message).toContain('Phase 1')
    expect(milestones[0].relatedGoalId).toBe('g1')
  })

  it('does NOT generate milestone for group without completed_at', () => {
    const groups = [makeGroup({ completed_at: null })]
    const result = computeNotifications([], [], groups, TODAY)

    expect(result.filter((n) => n.type === 'milestone_group')).toHaveLength(0)
  })
})

// ─── Insight ─────────────────────────────────────────────

describe('computeInsights', () => {
  it('generates stale goal insight for 14+ days without update', () => {
    const staleGoal = makeGoal({
      updated_at: subDays(TODAY, 15).toISOString(),
    })
    const result = computeNotifications([staleGoal], [], [], TODAY)

    const insights = result.filter((n) => n.type === 'insight')
    expect(insights).toHaveLength(1)
    expect(insights[0].message).toContain('한동안 손이 닿지 않았네요')
    expect(insights[0].relatedGoalId).toBe('g1')
  })

  it('does NOT generate stale insight for recently updated goal', () => {
    const freshGoal = makeGoal({
      updated_at: subDays(TODAY, 5).toISOString(),
    })
    const result = computeNotifications([freshGoal], [], [], TODAY)

    const staleInsights = result.filter((n) => n.type === 'insight' && n.id.includes('stale'))
    expect(staleInsights).toHaveLength(0)
  })

  it('generates no-tasks insight for goal with 0 tasks', () => {
    const emptyGoal = makeGoal({ task_count: 0 })
    const result = computeNotifications([emptyGoal], [], [], TODAY)

    const taskInsights = result.filter((n) => n.type === 'insight' && n.id.includes('no-tasks'))
    expect(taskInsights).toHaveLength(1)
    expect(taskInsights[0].message).toContain('첫 Task를 만들어볼까요')
  })

  it('does NOT generate no-tasks insight for goal with tasks', () => {
    const goalWithTasks = makeGoal({ task_count: 3 })
    const result = computeNotifications([goalWithTasks], [], [], TODAY)

    const taskInsights = result.filter((n) => n.type === 'insight' && n.id.includes('no-tasks'))
    expect(taskInsights).toHaveLength(0)
  })

  it('can generate both stale and no-tasks insights for same goal', () => {
    const staleEmptyGoal = makeGoal({
      updated_at: subDays(TODAY, 20).toISOString(),
      task_count: 0,
    })
    const result = computeNotifications([staleEmptyGoal], [], [], TODAY)

    const insights = result.filter((n) => n.type === 'insight')
    expect(insights).toHaveLength(2)
  })
})

// ─── countActionableNotifications ────────────────────────

describe('countActionableNotifications', () => {
  it('counts announcement type notifications', () => {
    const notifications: AppNotification[] = [
      {
        id: 'a1',
        type: 'announcement',
        title: 'Update',
        message: 'New feature',
        icon: 'Megaphone',
        priority: 5,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts deadline notifications', () => {
    const notifications: AppNotification[] = [
      {
        id: 'n1',
        type: 'deadline',
        title: 'Deadline',
        message: 'Soon',
        icon: 'Calendar',
        priority: 3,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts milestone notifications', () => {
    const notifications: AppNotification[] = [
      {
        id: 'm1',
        type: 'milestone_goal',
        title: 'Goal 달성!',
        message: '축하!',
        icon: 'Trophy',
        priority: 4,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts insight with priority >= 3', () => {
    const notifications: AppNotification[] = [
      {
        id: 'i1',
        type: 'insight',
        title: 'Goal',
        message: 'Stale',
        icon: 'Lightbulb',
        priority: 3,
        autoResolve: true,
      },
      {
        id: 'i2',
        type: 'insight',
        title: 'Goal 2',
        message: 'Low',
        icon: 'Lightbulb',
        priority: 2,
        autoResolve: true,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts combined notifications correctly', () => {
    const notifications: AppNotification[] = [
      {
        id: 'a1',
        type: 'announcement',
        title: 'Update',
        message: 'New',
        icon: 'Megaphone',
        priority: 5,
        autoResolve: false,
      },
      {
        id: 'n1',
        type: 'deadline',
        title: 'Deadline',
        message: 'Soon',
        icon: 'Calendar',
        priority: 5,
        autoResolve: false,
      },
      {
        id: 'm1',
        type: 'milestone_goal',
        title: 'Done!',
        message: '축하!',
        icon: 'Trophy',
        priority: 4,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(countActionableNotifications([])).toBe(0)
  })
})
