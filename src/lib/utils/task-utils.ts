import type { TimeSlot, RepeatType, TaskStatus, HomeTask as EntityHomeTask } from '@/types/entities'
import type { HomeTaskDto as ActionHomeTask } from '@/actions/home.actions'
import { TIME_SLOT_CONFIG, TIME_SLOT_ORDER } from '@/lib/constants/time-slots'

/**
 * Format duration in minutes to a compact string.
 * e.g. 30 → "30m", 60 → "1h", 90 → "1.5h", 120 → "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  if (Number.isInteger(hours)) return `${hours}h`
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

/**
 * Format repeat type to a compact Korean label for calendar display.
 */
export function formatRepeatType(type: RepeatType): string | null {
  switch (type) {
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'weekends':
      return '주말'
    case 'weekly':
      return '매주'
    case 'custom':
      return '반복'
    case 'once':
    default:
      return null
  }
}

// Re-export a unified HomeTask type
export type HomeTask = EntityHomeTask

/**
 * Maps the camelCase API response to snake_case entity format
 */
export function mapApiTaskToEntity(task: ActionHomeTask): EntityHomeTask {
  return {
    id: task.id,
    user_id: '', // Not returned by API
    goal_id: task.goalId,
    group_id: task.groupId,
    area_id: task.areaId,
    name: task.name,
    why: task.why,
    repeat_type: (task.repeatType as RepeatType) ?? 'daily',
    repeat_days: task.repeatDays ?? null,
    duration_minutes: task.durationMinutes,
    time_slot: task.timeSlot as TimeSlot,
    specific_time: task.specificTime,
    streak_count: task.streakCount,
    best_streak: task.bestStreak,
    last_check_in_date: null,
    is_active: true,
    sort_order: task.sortOrder,
    related_area_ids: task.relatedAreaIds ?? [],
    related_goal_ids: task.relatedGoalIds ?? [],
    cross_link_group_map: {},
    google_event_id: null,
    total_completed: task.totalCompleted ?? 0,
    created_at: '',
    updated_at: '',
    todayCheckIn: task.todayCheckIn
      ? {
          id: task.todayCheckIn.id,
          status: task.todayCheckIn.status,
          note: task.todayCheckIn.note,
          createdAt: task.todayCheckIn.createdAt,
        }
      : null,
    directArea: task.directArea
      ? {
          id: task.directArea.id,
          name: task.directArea.name,
          emoji: task.directArea.emoji,
          color: task.directArea.color,
          why: task.directArea.why ?? null,
          sort_order: task.directArea.sortOrder ?? '',
        }
      : null,
    relatedAreas: task.relatedAreas ?? null,
    relatedGoals: task.relatedGoals ?? null,
    goal: task.goal
      ? {
          id: task.goal.id,
          name: task.goal.name,
          why: task.goal.why ?? null,
          areaId: task.goal.areaId,
          area: {
            id: task.goal.area.id,
            name: task.goal.area.name,
            emoji: task.goal.area.emoji,
            color: task.goal.area.color,
            why: task.goal.area.why ?? null,
            sort_order: task.goal.area.sortOrder ?? '',
          },
        }
      : null,
    group: task.group
      ? {
          id: task.group.id,
          name: task.group.name,
          why: task.group.why ?? null,
        }
      : null,
    status: (task.taskStatus as TaskStatus) ?? 'active',
    scheduled_date: task.scheduledDate ?? null,
    start_date: task.startDate ?? null,
    end_date: task.endDate ?? null,
    completed_at: null,
    paused_at: null,
    status_change_reason: null,
    status_change_note: null,
    scheduledDate: task.scheduledDate ?? null,
    taskStatus: (task.taskStatus as TaskStatus) ?? 'active',
    directionVersion: task.directionVersion ?? null,
  }
}

/**
 * Maps array of API tasks to entity format
 */
export function mapApiTasksToEntities(tasks: ActionHomeTask[]): EntityHomeTask[] {
  return tasks.map(mapApiTaskToEntity)
}

/**
 * Calculates a Why Chain completeness score for a task.
 * Higher score = more connected to the user's Why Chain.
 */
export function getWhyChainScore(task: HomeTask): number {
  let score = 0
  if (task.why) score += 2
  if (task.goal?.why) score += 1
  if (task.goal?.area?.why) score += 1
  if (task.related_area_ids?.length) score += 1
  return score // max 5
}

/**
 * Sorts tasks by priority:
 * 1. Unchecked tasks first
 * 2. Then by Why Chain score (higher first)
 * 3. Then by streak count (higher first)
 * 4. Then by sort_order
 */
export function sortTasksByPriority(tasks: HomeTask[]): HomeTask[] {
  return [...tasks].sort((a, b) => {
    // Unchecked tasks first
    const aChecked = a.todayCheckIn?.status
    const bChecked = b.todayCheckIn?.status

    if (aChecked && !bChecked) return 1
    if (!aChecked && bChecked) return -1

    // Then by Why Chain score (higher first)
    const aScore = getWhyChainScore(a)
    const bScore = getWhyChainScore(b)
    if (aScore !== bScore) {
      return bScore - aScore
    }

    // Then by streak (higher first)
    if (a.streak_count !== b.streak_count) {
      return b.streak_count - a.streak_count
    }

    // Then by sort_order (byte-order for fractional indexing — NOT localeCompare)
    if (a.sort_order < b.sort_order) return -1
    if (a.sort_order > b.sort_order) return 1
    return 0
  })
}

/**
 * Gets the current time slot based on the hour of the day
 */
export function getTimeSlotForCurrentTime(): TimeSlot {
  const hour = new Date().getHours()

  for (const slot of TIME_SLOT_ORDER) {
    if (slot === 'anytime') continue

    const [start, end] = TIME_SLOT_CONFIG[slot].hours
    if (hour >= start && hour < end) {
      return slot
    }
  }

  return 'anytime'
}

/**
 * Gets greeting message based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour >= 0 && hour < 6) {
    return '좋은 새벽이에요'
  } else if (hour >= 6 && hour < 12) {
    return '좋은 아침이에요'
  } else if (hour >= 12 && hour < 18) {
    return '좋은 오후예요'
  } else {
    return '좋은 저녁이에요'
  }
}

/**
 * Gets contextual greeting that references task progress.
 * Returns a motivational message based on completion state + time of day.
 */
export function getContextualGreeting(tasks: HomeTask[]): string {
  const stats = calculateTaskStats(tasks)

  if (stats.total === 0) return getGreeting()

  if (stats.isAllDone) {
    return `오늘 ${stats.total}개 전부 완료! 대단해요`
  }

  const rate = stats.completionRate

  if (rate === 0) {
    return `${getGreeting()} 오늘 ${stats.total}개가 기다리고 있어요`
  }

  if (rate < 50) {
    return `${stats.completed}개 해냈어요! 좋은 출발이에요`
  }

  if (stats.remaining <= 3) {
    return `거의 다 왔어요! ${stats.remaining}개만 더`
  }

  return `${stats.completed}개 해냈어요! 절반을 넘겼어요`
}

/**
 * Gets the next pending task based on current time slot priority.
 * Returns the first pending task in the current time slot, or any pending task.
 */
export function getNextTask(tasks: HomeTask[]): HomeTask | null {
  const pendingTasks = tasks.filter((t) => !t.todayCheckIn?.status)
  if (pendingTasks.length === 0) return null

  const currentSlot = getTimeSlotForCurrentTime()

  // Prefer tasks in current time slot
  if (currentSlot !== 'anytime') {
    const slotTask = pendingTasks.find((t) => t.time_slot === currentSlot)
    if (slotTask) return slotTask
  }

  // Fallback: first pending task by priority
  return sortTasksByPriority(pendingTasks)[0] ?? null
}

/**
 * Progress tier for emotional progress display.
 */
export type ProgressTier = 'empty' | 'start' | 'going' | 'halfway' | 'almost' | 'done'

export interface ProgressTierInfo {
  tier: ProgressTier
  message: string
  emoji: string
}

/**
 * Gets progress tier info for emotional progress display.
 */
export function getProgressTier(tasks: HomeTask[]): ProgressTierInfo {
  const stats = calculateTaskStats(tasks)

  if (stats.total === 0) {
    return { tier: 'empty', message: '오늘 할 일이 없어요', emoji: '🌴' }
  }

  if (stats.isAllDone) {
    return { tier: 'done', message: `${stats.total}개 모두 완료!`, emoji: '🎉' }
  }

  const rate = stats.completionRate

  if (rate === 0) {
    return { tier: 'start', message: `시작이 반! 오늘 ${stats.total}개`, emoji: '💪' }
  }

  if (rate <= 30) {
    return { tier: 'going', message: `좋은 출발이에요!`, emoji: '🚀' }
  }

  if (rate <= 60) {
    return { tier: 'halfway', message: `절반을 넘겼어요!`, emoji: '⭐' }
  }

  return { tier: 'almost', message: `거의 다 왔어요! ${stats.remaining}개만 더`, emoji: '🔥' }
}

// ============================================
// Area-based Grouping
// ============================================

export interface AreaGroup {
  area: {
    id: string
    name: string
    emoji: string
    color: string
    sort_order: string
  }
  goals: Array<{ id: string; name: string }>
  tasks: HomeTask[]
  stats: { total: number; completed: number }
}

export interface GroupedByAreaResult {
  areaGroups: AreaGroup[]
  dailyTasks: HomeTask[]
}

/**
 * Groups tasks by their Area.
 * Tasks without a goal are placed in dailyTasks.
 * When allAreas is provided, empty area groups are created for areas with no tasks.
 */
export function groupTasksByArea(
  tasks: HomeTask[],
  allAreas?: Array<{ id: string; name: string; emoji: string; color: string; sort_order: string }>,
  allGoals?: Array<{ id: string; name: string; area_id: string; status: string }>
): GroupedByAreaResult {
  const areaMap = new Map<string, AreaGroup>()
  const dailyTasks: HomeTask[] = []

  for (const task of tasks) {
    // Goalless task — check if it has a direct area link
    if (!task.goal_id || !task.goal) {
      if (task.directArea) {
        // Has area_id → group under that area
        const area = task.directArea
        let group = areaMap.get(area.id)
        if (!group) {
          group = {
            area: {
              id: area.id,
              name: area.name,
              emoji: area.emoji,
              color: area.color,
              sort_order: area.sort_order ?? '',
            },
            goals: [],
            tasks: [],
            stats: { total: 0, completed: 0 },
          }
          areaMap.set(area.id, group)
        }
        group.tasks.push(task)
        group.stats.total++
        if (task.todayCheckIn?.status === 'done') {
          group.stats.completed++
        }
        continue
      }
      dailyTasks.push(task)
      continue
    }

    const area = task.goal.area
    let group = areaMap.get(area.id)
    if (!group) {
      group = {
        area: {
          id: area.id,
          name: area.name,
          emoji: area.emoji,
          color: area.color,
          sort_order: area.sort_order ?? '',
        },
        goals: [],
        tasks: [],
        stats: { total: 0, completed: 0 },
      }
      areaMap.set(area.id, group)
    }

    group.tasks.push(task)
    group.stats.total++
    if (task.todayCheckIn?.status === 'done') {
      group.stats.completed++
    }

    // Collect unique goals
    if (!group.goals.some((g) => g.id === task.goal!.id)) {
      group.goals.push({ id: task.goal.id, name: task.goal.name })
    }
  }

  // Ensure all areas use authoritative sort_order from allAreas,
  // and add empty groups for areas that have no tasks yet.
  // Task-embedded area.sort_order can be missing (e.g. get_today_tasks RPC),
  // so allAreas is the single source of truth for ordering.
  if (allAreas) {
    for (const area of allAreas) {
      const existing = areaMap.get(area.id)
      if (existing) {
        existing.area.sort_order = area.sort_order
      } else {
        areaMap.set(area.id, {
          area: {
            id: area.id,
            name: area.name,
            emoji: area.emoji,
            color: area.color,
            sort_order: area.sort_order,
          },
          goals: [],
          tasks: [],
          stats: { total: 0, completed: 0 },
        })
      }
    }
  }

  // Merge actual goals from DB so areas have correct goal lists for DnD cross-move
  if (allGoals) {
    for (const goal of allGoals) {
      if (goal.status !== 'active' && goal.status !== 'maintenance') continue
      const group = areaMap.get(goal.area_id)
      if (group && !group.goals.some((g) => g.id === goal.id)) {
        group.goals.push({ id: goal.id, name: goal.name })
      }
    }
  }

  // Sort tasks within each area by sort_order only (no check-in status reordering)
  // Then sort areas by area sort_order
  // Stable tiebreaker by id to prevent order flickering when sort_orders are identical
  // IMPORTANT: Use byte-order comparison (</>), NOT localeCompare.
  // fractional-indexing keys use uppercase (Z=negative) before lowercase (a=positive),
  // but localeCompare treats 'Z' > 'a' in most locales, breaking key ordering.
  const safeCompare = (x: string | null | undefined, y: string | null | undefined) => {
    const a = x ?? ''
    const b = y ?? ''
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  const stableTaskCompare = (a: HomeTask, b: HomeTask) => {
    const cmp = safeCompare(a.sort_order, b.sort_order)
    return cmp !== 0 ? cmp : a.id.localeCompare(b.id)
  }

  const areaGroups = Array.from(areaMap.values())
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort(stableTaskCompare),
    }))
    .sort((a, b) => safeCompare(a.area.sort_order, b.area.sort_order))

  return {
    areaGroups,
    dailyTasks: dailyTasks.sort(stableTaskCompare),
  }
}

/**
 * Computes all field updates needed when unlinking a cross-linked task from a goal.
 * Cleans up related_goal_ids, cross_link_group_map, AND related_area_ids.
 */
export function computeUnlinkUpdates(opts: {
  relatedGoalIds: string[]
  relatedAreaIds: string[]
  crossLinkGroupMap: Record<string, string | null>
  unlinkGoalId: string
  unlinkGoalAreaId: string
  allGoals: Array<{ id: string; area_id: string }>
}): {
  related_goal_ids: string[]
  related_area_ids: string[]
  cross_link_group_map: Record<string, string | null>
} {
  const newRelatedGoalIds = opts.relatedGoalIds.filter((id) => id !== opts.unlinkGoalId)

  const newGroupMap = { ...opts.crossLinkGroupMap }
  delete newGroupMap[opts.unlinkGoalId]

  // Remove the area if no remaining related goals belong to it
  const areaStillNeeded = newRelatedGoalIds.some((gId) => {
    const g = opts.allGoals.find((gg) => gg.id === gId)
    return g?.area_id === opts.unlinkGoalAreaId
  })
  const newRelatedAreaIds = areaStillNeeded
    ? opts.relatedAreaIds
    : opts.relatedAreaIds.filter((id) => id !== opts.unlinkGoalAreaId)

  return {
    related_goal_ids: newRelatedGoalIds,
    related_area_ids: newRelatedAreaIds,
    cross_link_group_map: newGroupMap,
  }
}

/**
 * Calculate task stats from a list of tasks
 */
export function calculateTaskStats(tasks: HomeTask[]) {
  const total = tasks.length
  const completed = tasks.filter((t) => t.todayCheckIn?.status === 'done').length
  const skipped = tasks.filter((t) => t.todayCheckIn?.status === 'skip').length
  const remaining = total - completed - skipped

  return {
    total,
    completed,
    skipped,
    remaining,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    isAllDone: total > 0 && remaining === 0,
  }
}
