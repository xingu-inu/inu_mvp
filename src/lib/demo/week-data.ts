/**
 * Demo Week Data — Dynamic HomeTask generator for demo mode
 * Generates HomeTask[] matching the exact shape returned by getHomeTasks server action
 * (camelCase fields from home.actions.ts HomeTask type)
 */

import { format, startOfWeek, addDays, isBefore, isAfter, startOfDay } from 'date-fns'
import { type HomeTask } from '@/actions/home.actions'
import { DEMO_TASKS, DEMO_AREA_MAP, DEMO_GOAL_MAP, DEMO_GROUP_MAP } from './data'
import type { Task } from '@/types/entities'

// ============================================
// Helpers
// ============================================

/** Returns true if a task should appear on the given date based on its repeat rules */
function taskOccursOnDay(task: Task, date: Date): boolean {
  const dow = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const taskStart = task.start_date ? new Date(task.start_date + 'T00:00:00') : null
  const taskEnd = task.end_date ? new Date(task.end_date + 'T00:00:00') : null

  if (taskStart && isBefore(startOfDay(date), taskStart)) return false
  if (taskEnd && isAfter(startOfDay(date), taskEnd)) return false

  switch (task.repeat_type) {
    case 'daily':
      return true
    case 'weekdays':
      return dow >= 1 && dow <= 5
    case 'weekends':
      return dow === 0 || dow === 6
    case 'weekly':
      return (task.repeat_days ?? []).includes(dow)
    case 'custom':
      return (task.repeat_days ?? []).includes(dow)
    case 'once':
      return task.scheduled_date === format(date, 'yyyy-MM-dd')
    default:
      return false
  }
}

/** Seeded deterministic pseudo-random: consistent per (taskId, dateStr) */
function seededRandom(taskId: string, dateStr: string): number {
  let h = 2166136261
  const s = taskId + dateStr
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return (h >>> 0) / 4294967295
}

type CheckInStatusDemo = 'done' | 'skip' | 'miss'

function getCheckInStatus(
  task: Task,
  dateStr: string,
  isToday: boolean,
  isFuture: boolean
): CheckInStatusDemo | null {
  if (isFuture) return null
  if (isToday) {
    const r = seededRandom(task.id, dateStr + '-today')
    if (task.streak_count >= 10) return r < 0.7 ? 'done' : null
    if (task.streak_count >= 5) return r < 0.5 ? 'done' : null
    return r < 0.3 ? 'done' : null
  }
  // Past day — weighted by streak
  const r = seededRandom(task.id, dateStr)
  if (task.streak_count >= 20) {
    return r < 0.88 ? 'done' : r < 0.96 ? 'skip' : 'miss'
  }
  if (task.streak_count >= 10) {
    return r < 0.78 ? 'done' : r < 0.9 ? 'skip' : 'miss'
  }
  if (task.streak_count >= 5) {
    return r < 0.68 ? 'done' : r < 0.84 ? 'skip' : 'miss'
  }
  return r < 0.55 ? 'done' : r < 0.78 ? 'skip' : 'miss'
}

// ============================================
// Build one HomeTask from a Task + check-in status
// ============================================
function buildHomeTask(
  task: Task,
  dateStr: string,
  checkInStatus: CheckInStatusDemo | null
): HomeTask {
  const goal = task.goal_id ? (DEMO_GOAL_MAP[task.goal_id] ?? null) : null
  const group = task.group_id ? (DEMO_GROUP_MAP[task.group_id] ?? null) : null
  const directArea = !task.goal_id && task.area_id ? (DEMO_AREA_MAP[task.area_id] ?? null) : null
  const goalArea = goal ? (DEMO_AREA_MAP[goal.area_id] ?? null) : null

  return {
    id: task.id,
    name: task.name,
    why: task.why,
    goalId: task.goal_id,
    groupId: task.group_id,
    areaId: task.area_id,
    timeSlot: task.time_slot,
    specificTime: task.specific_time,
    durationMinutes: task.duration_minutes,
    streakCount: task.streak_count,
    bestStreak: task.best_streak,
    sortOrder: task.sort_order,
    totalCompleted: task.streak_count * 2,
    repeatType: task.repeat_type,
    repeatDays: task.repeat_days,
    scheduledDate: task.scheduled_date,
    startDate: task.start_date,
    endDate: task.end_date,
    taskStatus: task.status,
    directionVersion: 1,
    goal:
      goal && goalArea
        ? {
            id: goal.id,
            name: goal.name,
            why: goal.why,
            areaId: goal.area_id,
            area: {
              id: goalArea.id,
              name: goalArea.name,
              emoji: goalArea.emoji,
              color: goalArea.color,
              why: goalArea.why,
              sortOrder: goalArea.sort_order,
            },
          }
        : null,
    group: group
      ? {
          id: group.id,
          name: group.name,
          why: group.why,
        }
      : null,
    directArea: directArea
      ? {
          id: directArea.id,
          name: directArea.name,
          emoji: directArea.emoji,
          color: directArea.color,
          why: directArea.why,
          sortOrder: directArea.sort_order,
        }
      : null,
    relatedAreaIds: null,
    relatedAreas: null,
    relatedGoalIds: null,
    relatedGoals: null,
    todayCheckIn: checkInStatus
      ? {
          id: `demo-checkin-${task.id}-${dateStr}`,
          status: checkInStatus,
          note: null,
          createdAt: `${dateStr}T10:00:00.000Z`,
        }
      : null,
  }
}

// ============================================
// Generate HomeTask[] for a single date
// ============================================
export function generateDemoHomeTasks(date: Date): HomeTask[] {
  const dateStr = format(date, 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isToday = dateStr === todayStr
  const isFuture = dateStr > todayStr

  const result: HomeTask[] = []

  for (const task of DEMO_TASKS) {
    if (!task.is_active) continue
    if (!taskOccursOnDay(task, date)) continue

    const checkInStatus = getCheckInStatus(task, dateStr, isToday, isFuture)
    result.push(buildHomeTask(task, dateStr, checkInStatus))
  }

  // Sort by time_slot priority, then sort_order
  const slotOrder: Record<string, number> = {
    dawn: 0,
    morning: 1,
    afternoon: 2,
    evening: 3,
    anytime: 4,
  }
  result.sort((a, b) => {
    const slotDiff = (slotOrder[a.timeSlot] ?? 4) - (slotOrder[b.timeSlot] ?? 4)
    if (slotDiff !== 0) return slotDiff
    return a.sortOrder.localeCompare(b.sortOrder)
  })

  return result
}

// ============================================
// Generate week tasks map: Record<dateStr, HomeTask[]>
// Matches the shape stored by queryKeys.tasks.homeWeek
// ============================================
export function generateDemoWeekTasks(baseDate: Date): Record<string, HomeTask[]> {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 }) // Sunday
  const result: Record<string, HomeTask[]> = {}

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dateStr = format(day, 'yyyy-MM-dd')
    result[dateStr] = generateDemoHomeTasks(day)
  }

  return result
}

export type { HomeTask }
