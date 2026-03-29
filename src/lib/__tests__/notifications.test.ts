import { describe, it, expect } from 'vitest'
import { addDays, format } from 'date-fns'
import { computeNotifications, countActionableNotifications } from '../notifications'
import type { AppNotification } from '@/types/entities'

const TODAY = new Date('2026-02-24T00:00:00')
const DATE_STR = '2026-02-24'

// ─── computeGoalDeadlines ────────────────────────────────────

describe('computeGoalDeadlines', () => {
  it('generates D-0 with priority 5 and alarm for today deadline', () => {
    const goals = [{ id: 'g1', name: 'Goal', target_date: DATE_STR }]
    const result = computeNotifications(goals, TODAY)

    const deadlines = result.filter((n) => n.type === 'goal_deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-0')
    expect(deadlines[0].priority).toBe(5)
    expect(deadlines[0].emoji).toBe('🚨')
    expect(deadlines[0].message).toBe('목표 마감일이 오늘이에요!')
  })

  it('generates D-2 with priority 5 for 2-day deadline', () => {
    const futureDate = format(addDays(TODAY, 2), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: futureDate }]
    const result = computeNotifications(goals, TODAY)

    const deadlines = result.filter((n) => n.type === 'goal_deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-2')
    expect(deadlines[0].priority).toBe(5)
    expect(deadlines[0].emoji).toBe('🚨')
  })

  it('generates D-7 with priority 3 and calendar for 7-day deadline', () => {
    const futureDate = format(addDays(TODAY, 7), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: futureDate }]
    const result = computeNotifications(goals, TODAY)

    const deadlines = result.filter((n) => n.type === 'goal_deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-7')
    expect(deadlines[0].priority).toBe(3)
    expect(deadlines[0].emoji).toBe('📅')
  })

  it('does NOT generate for deadline > 7 days away', () => {
    const futureDate = format(addDays(TODAY, 8), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: futureDate }]
    const result = computeNotifications(goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })

  it('does NOT generate for goals with no target_date', () => {
    const goals = [{ id: 'g1', name: 'Goal', target_date: null }]
    const result = computeNotifications(goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })

  it('does NOT generate for past deadlines (daysUntil < 0)', () => {
    const pastDate = format(addDays(TODAY, -1), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: pastDate }]
    const result = computeNotifications(goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })

  it('generates multiple deadline notifications sorted by priority', () => {
    const goals = [
      { id: 'g1', name: 'Urgent', target_date: DATE_STR },
      { id: 'g2', name: 'Soon', target_date: format(addDays(TODAY, 5), 'yyyy-MM-dd') },
    ]
    const result = computeNotifications(goals, TODAY)

    expect(result).toHaveLength(2)
    // Highest priority first
    expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority)
  })

  it('returns empty for no goals', () => {
    const result = computeNotifications([], TODAY)
    expect(result).toHaveLength(0)
  })
})

// ─── countActionableNotifications ────────────────────────────

describe('countActionableNotifications', () => {
  it('counts announcement type notifications', () => {
    const notifications: AppNotification[] = [
      {
        id: 'a1',
        type: 'announcement',
        title: 'Update',
        message: 'New feature',
        emoji: '📢',
        priority: 5,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts goal_deadline notifications', () => {
    const notifications: AppNotification[] = [
      {
        id: 'n1',
        type: 'goal_deadline',
        title: 'Deadline',
        message: 'Soon',
        emoji: '📅',
        priority: 3,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts combined announcements and goal deadlines', () => {
    const notifications: AppNotification[] = [
      {
        id: 'a1',
        type: 'announcement',
        title: 'Update',
        message: 'New',
        emoji: '📢',
        priority: 5,
        autoResolve: false,
      },
      {
        id: 'n1',
        type: 'goal_deadline',
        title: 'Deadline',
        message: 'Soon',
        emoji: '📅',
        priority: 5,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(2)
  })

  it('returns 0 for empty array', () => {
    expect(countActionableNotifications([])).toBe(0)
  })
})
