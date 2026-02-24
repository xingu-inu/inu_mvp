import { describe, it, expect } from 'vitest'
import { addDays, format } from 'date-fns'
import { computeNotifications, countActionableNotifications } from '../notifications'
import type { HomeTask, AppNotification } from '@/types/entities'

// ─── Mock Factory ────────────────────────────────────────────

function createMockTask(overrides: Partial<HomeTask> = {}): HomeTask {
  return {
    id: 'task-1',
    user_id: 'user-1',
    goal_id: 'goal-1',
    group_id: null,
    area_id: 'area-1',
    name: 'Test Task',
    why: null,
    repeat_type: 'daily',
    repeat_days: null,
    duration_minutes: 30,
    time_slot: 'morning',
    specific_time: null,
    streak_count: 0,
    best_streak: 0,
    last_check_in_date: null,
    is_active: true,
    status: 'active',
    scheduled_date: null,
    start_date: null,
    end_date: null,
    completed_at: null,
    paused_at: null,
    status_change_reason: null,
    status_change_note: null,
    sort_order: 'a0',
    related_area_ids: [],
    related_goal_ids: [],
    cross_link_group_map: {},
    google_event_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    total_completed: 0,
    todayCheckIn: null,
    goal: null,
    group: null,
    directArea: null,
    relatedAreas: null,
    relatedGoals: null,
    scheduledDate: null,
    taskStatus: 'active',
    directionVersion: null,
    ...overrides,
  }
}

const TODAY = new Date('2026-02-24T00:00:00')
const DATE_STR = '2026-02-24'

// ─── computeStreakAtRisk ─────────────────────────────────────

describe('computeStreakAtRisk', () => {
  it('generates notification for streak >= 3 with no check-in', () => {
    const tasks = [createMockTask({ streak_count: 5, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    const streakAtRisk = result.filter((n) => n.type === 'streak_at_risk')
    expect(streakAtRisk).toHaveLength(1)
    expect(streakAtRisk[0].priority).toBe(4)
    expect(streakAtRisk[0].emoji).toBe('⚠️')
    expect(streakAtRisk[0].autoResolve).toBe(true)
    expect(streakAtRisk[0].message).toContain('5일 연속')
  })

  it('generates for exact boundary streak = 3', () => {
    const tasks = [createMockTask({ streak_count: 3, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    const streakAtRisk = result.filter((n) => n.type === 'streak_at_risk')
    expect(streakAtRisk).toHaveLength(1)
    expect(streakAtRisk[0].message).toContain('3일 연속')
  })

  it('does NOT generate for streak < 3', () => {
    const tasks = [createMockTask({ streak_count: 2, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_at_risk')).toHaveLength(0)
  })

  it('does NOT generate when already checked in', () => {
    const tasks = [
      createMockTask({
        streak_count: 10,
        todayCheckIn: { status: 'done', note: null },
      }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_at_risk')).toHaveLength(0)
  })

  it('limits to max 3 notifications sorted by streak desc', () => {
    const tasks = [3, 5, 10, 20].map((streak, i) =>
      createMockTask({
        id: `task-${i}`,
        name: `Task ${i}`,
        streak_count: streak,
        todayCheckIn: null,
      })
    )
    const result = computeNotifications(tasks, [], TODAY)

    const streakAtRisk = result.filter((n) => n.type === 'streak_at_risk')
    expect(streakAtRisk).toHaveLength(3)
    // Highest streak first
    expect(streakAtRisk[0].message).toContain('20일')
    expect(streakAtRisk[1].message).toContain('10일')
    expect(streakAtRisk[2].message).toContain('5일')
  })

  it('returns empty for empty task array', () => {
    const result = computeNotifications([], [], TODAY)
    expect(result.filter((n) => n.type === 'streak_at_risk')).toHaveLength(0)
  })
})

// ─── computeGoalDeadlines ────────────────────────────────────

describe('computeGoalDeadlines', () => {
  it('generates D-0 with priority 5 and 🚨 for today deadline', () => {
    const goals = [{ id: 'g1', name: 'Goal', target_date: DATE_STR }]
    const result = computeNotifications([], goals, TODAY)

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
    const result = computeNotifications([], goals, TODAY)

    const deadlines = result.filter((n) => n.type === 'goal_deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-2')
    expect(deadlines[0].priority).toBe(5)
    expect(deadlines[0].emoji).toBe('🚨')
  })

  it('generates D-7 with priority 3 and 📅 for 7-day deadline', () => {
    const futureDate = format(addDays(TODAY, 7), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: futureDate }]
    const result = computeNotifications([], goals, TODAY)

    const deadlines = result.filter((n) => n.type === 'goal_deadline')
    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].title).toContain('D-7')
    expect(deadlines[0].priority).toBe(3)
    expect(deadlines[0].emoji).toBe('📅')
  })

  it('does NOT generate for deadline > 7 days away', () => {
    const futureDate = format(addDays(TODAY, 8), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: futureDate }]
    const result = computeNotifications([], goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })

  it('does NOT generate for goals with no target_date', () => {
    const goals = [{ id: 'g1', name: 'Goal', target_date: null }]
    const result = computeNotifications([], goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })

  it('does NOT generate for past deadlines (daysUntil < 0)', () => {
    const pastDate = format(addDays(TODAY, -1), 'yyyy-MM-dd')
    const goals = [{ id: 'g1', name: 'Goal', target_date: pastDate }]
    const result = computeNotifications([], goals, TODAY)

    expect(result.filter((n) => n.type === 'goal_deadline')).toHaveLength(0)
  })
})

// ─── computeAllComplete ──────────────────────────────────────

describe('computeAllComplete', () => {
  it('generates notification when all tasks are done', () => {
    const tasks = [
      createMockTask({ id: 't1', todayCheckIn: { status: 'done', note: null } }),
      createMockTask({ id: 't2', todayCheckIn: { status: 'done', note: null } }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    const allComplete = result.filter((n) => n.type === 'all_complete')
    expect(allComplete).toHaveLength(1)
    expect(allComplete[0].emoji).toBe('🎉')
    expect(allComplete[0].priority).toBe(2)
    expect(allComplete[0].actionLabel).toBe('회고 쓰기')
  })

  it('generates notification when all tasks are done or skipped', () => {
    const tasks = [
      createMockTask({ id: 't1', todayCheckIn: { status: 'done', note: null } }),
      createMockTask({ id: 't2', todayCheckIn: { status: 'skip', note: null } }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    const allComplete = result.filter((n) => n.type === 'all_complete')
    expect(allComplete).toHaveLength(1)
  })

  it('does NOT generate when some tasks are pending', () => {
    const tasks = [
      createMockTask({ id: 't1', todayCheckIn: { status: 'done', note: null } }),
      createMockTask({ id: 't2', todayCheckIn: null }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'all_complete')).toHaveLength(0)
  })

  it('does NOT generate for empty task array', () => {
    const result = computeNotifications([], [], TODAY)
    expect(result.filter((n) => n.type === 'all_complete')).toHaveLength(0)
  })

  it('does NOT generate when all tasks are skipped (zero done)', () => {
    const tasks = [
      createMockTask({ id: 't1', todayCheckIn: { status: 'skip', note: null } }),
      createMockTask({ id: 't2', todayCheckIn: { status: 'skip', note: null } }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'all_complete')).toHaveLength(0)
  })
})

// ─── computeStreakMilestones ─────────────────────────────────

describe('computeStreakMilestones', () => {
  it('generates for milestone streak (5) with done check-in', () => {
    const tasks = [
      createMockTask({
        streak_count: 5,
        todayCheckIn: { status: 'done', note: null },
      }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    const milestones = result.filter((n) => n.type === 'streak_milestone')
    expect(milestones).toHaveLength(1)
    expect(milestones[0].emoji).toBe('🏆')
    expect(milestones[0].title).toContain('🔥5')
    expect(milestones[0].priority).toBe(4)
  })

  it('does NOT generate for non-milestone streak (4)', () => {
    const tasks = [
      createMockTask({
        streak_count: 4,
        todayCheckIn: { status: 'done', note: null },
      }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_milestone')).toHaveLength(0)
  })

  it('does NOT generate without check-in', () => {
    const tasks = [createMockTask({ streak_count: 10, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_milestone')).toHaveLength(0)
  })
})

// ─── computeStreakRecovery ───────────────────────────────────

describe('computeStreakRecovery', () => {
  it('generates for streak=0 with best_streak >= 3 and no check-in', () => {
    const tasks = [
      createMockTask({
        streak_count: 0,
        best_streak: 5,
        total_completed: 20,
        todayCheckIn: null,
      }),
    ]
    const result = computeNotifications(tasks, [], TODAY)

    const recovery = result.filter((n) => n.type === 'streak_recovery')
    expect(recovery).toHaveLength(1)
    expect(recovery[0].emoji).toBe('🌱')
    expect(recovery[0].priority).toBe(3)
    expect(recovery[0].message).toContain('누적 20회')
    expect(recovery[0].autoResolve).toBe(true)
  })

  it('does NOT generate for best_streak < 3', () => {
    const tasks = [createMockTask({ streak_count: 0, best_streak: 2, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_recovery')).toHaveLength(0)
  })

  it('does NOT generate when streak > 0', () => {
    const tasks = [createMockTask({ streak_count: 1, best_streak: 10, todayCheckIn: null })]
    const result = computeNotifications(tasks, [], TODAY)

    expect(result.filter((n) => n.type === 'streak_recovery')).toHaveLength(0)
  })

  it('limits to max 3 sorted by best_streak desc', () => {
    const tasks = [3, 5, 10, 20].map((best, i) =>
      createMockTask({
        id: `task-${i}`,
        name: `Task ${i}`,
        streak_count: 0,
        best_streak: best,
        todayCheckIn: null,
      })
    )
    const result = computeNotifications(tasks, [], TODAY)

    const recovery = result.filter((n) => n.type === 'streak_recovery')
    expect(recovery).toHaveLength(3)
    // Verify sorted by best_streak descending
    expect(recovery[0].message).toContain('누적')
    expect(recovery[0].id).toContain('task-3') // best_streak=20
    expect(recovery[1].id).toContain('task-2') // best_streak=10
    expect(recovery[2].id).toContain('task-1') // best_streak=5
  })
})

// ─── computeWeeklySummary ────────────────────────────────────

describe('computeWeeklySummary', () => {
  // Monday = day 1
  const MONDAY = new Date('2026-02-23T09:00:00') // 2026-02-23 is Monday

  it('generates on Monday with last week data', () => {
    const result = computeNotifications([], [], MONDAY, {
      lastWeekStats: { totalDone: 15, totalScheduled: 20 },
    })

    const summary = result.filter((n) => n.type === 'weekly_summary')
    expect(summary).toHaveLength(1)
    expect(summary[0].message).toContain('15/20')
    expect(summary[0].message).toContain('75%')
    expect(summary[0].emoji).toBe('📊')
    expect(summary[0].actionPath).toBe('/review')
  })

  it('does NOT generate on non-Monday', () => {
    // TODAY (2026-02-24) is Tuesday
    const result = computeNotifications([], [], TODAY, {
      lastWeekStats: { totalDone: 15, totalScheduled: 20 },
    })

    expect(result.filter((n) => n.type === 'weekly_summary')).toHaveLength(0)
  })

  it('does NOT generate on Monday without data', () => {
    const result = computeNotifications([], [], MONDAY)

    expect(result.filter((n) => n.type === 'weekly_summary')).toHaveLength(0)
  })
})

// ─── computeGoalProgress ─────────────────────────────────────

describe('computeGoalProgress', () => {
  it('generates with 🚀 and priority 4 for 80%+ completion', () => {
    const result = computeNotifications([], [], TODAY, {
      goalStats: [{ goalId: 'g1', goalName: 'Running', done: 4, total: 5 }],
    })

    const progress = result.filter((n) => n.type === 'goal_progress')
    expect(progress).toHaveLength(1)
    expect(progress[0].emoji).toBe('🚀')
    expect(progress[0].priority).toBe(4)
    expect(progress[0].title).toContain('80%')
  })

  it('generates with 📈 and priority 3 for 50-79%', () => {
    const result = computeNotifications([], [], TODAY, {
      goalStats: [{ goalId: 'g1', goalName: 'Running', done: 3, total: 5 }],
    })

    const progress = result.filter((n) => n.type === 'goal_progress')
    expect(progress).toHaveLength(1)
    expect(progress[0].emoji).toBe('📈')
    expect(progress[0].priority).toBe(3)
    expect(progress[0].title).toContain('60%')
  })

  it('generates for exactly 50% boundary', () => {
    const result = computeNotifications([], [], TODAY, {
      goalStats: [{ goalId: 'g1', goalName: 'Boundary', done: 1, total: 2 }],
    })

    const progress = result.filter((n) => n.type === 'goal_progress')
    expect(progress).toHaveLength(1)
    expect(progress[0].title).toContain('50%')
    expect(progress[0].priority).toBe(3)
  })

  it('does NOT generate for < 50% completion', () => {
    const result = computeNotifications([], [], TODAY, {
      goalStats: [{ goalId: 'g1', goalName: 'Running', done: 1, total: 5 }],
    })

    expect(result.filter((n) => n.type === 'goal_progress')).toHaveLength(0)
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
        message: 'msg',
        emoji: '📢',
        priority: 5,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('counts autoResolve with priority >= 3', () => {
    const notifications: AppNotification[] = [
      {
        id: 'n1',
        type: 'streak_at_risk',
        title: 'Risk',
        message: 'msg',
        emoji: '⚠️',
        priority: 4,
        autoResolve: true,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(1)
  })

  it('does NOT count autoResolve true with priority < 3', () => {
    const notifications: AppNotification[] = [
      {
        id: 'n1',
        type: 'all_complete',
        title: 'Done',
        message: 'msg',
        emoji: '🎉',
        priority: 2,
        autoResolve: true,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(0)
  })

  it('does NOT count non-announcement with autoResolve false', () => {
    const notifications: AppNotification[] = [
      {
        id: 'n1',
        type: 'goal_deadline',
        title: 'Deadline',
        message: 'msg',
        emoji: '📅',
        priority: 5,
        autoResolve: false,
      },
    ]
    expect(countActionableNotifications(notifications)).toBe(0)
  })
})

// ─── computeNotifications (integration) ──────────────────────

describe('computeNotifications integration', () => {
  it('returns notifications sorted by priority descending', () => {
    const goals = [{ id: 'g1', name: 'Goal', target_date: DATE_STR }] // priority 5
    const tasks = [
      createMockTask({
        id: 't1',
        streak_count: 5,
        todayCheckIn: null, // streak_at_risk priority 4
      }),
    ]
    const result = computeNotifications(tasks, goals, TODAY)

    expect(result.length).toBeGreaterThanOrEqual(2)
    // Verify sorted by priority desc
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i + 1].priority)
    }
  })

  it('returns empty array for empty inputs', () => {
    const result = computeNotifications([], [], TODAY)
    expect(result).toEqual([])
  })

  it('generates 100% goal progress with 🎯 emoji', () => {
    const result = computeNotifications([], [], TODAY, {
      goalStats: [{ goalId: 'g1', goalName: 'Perfect', done: 5, total: 5 }],
    })

    const progress = result.filter((n) => n.type === 'goal_progress')
    expect(progress).toHaveLength(1)
    expect(progress[0].emoji).toBe('🎯')
    expect(progress[0].title).toContain('100%')
  })
})
