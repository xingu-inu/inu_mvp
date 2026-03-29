'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import { useReviewDirection } from './use-review-direction'
import { calculateCheckInRate, RECENT_CHECKINS_LIMIT } from '../utils/review-utils'
import type { GoalStatus, CheckInStatus, TimeSlot } from '@/types/entities'

// ============================================
// Types
// ============================================

export interface TaskReviewSummary {
  taskId: string
  taskName: string
  why: string | null
  groupId: string | null
  timeSlot: TimeSlot | null
  streakCount: number
  bestStreak: number
  isActive: boolean
  completionRate: number
  totalDone: number
  totalScheduled: number
  recentCheckIns: Array<{ date: string; status: CheckInStatus }>
  isCrossLinked?: boolean
  sourceGoal?: { id: string; name: string }
  relatedGoalIds?: string[]
}

export interface GoalReviewData {
  goal: {
    id: string
    name: string
    status: GoalStatus
    why: string | null
    createdAt: string
  }
  groups: Array<{
    id: string
    name: string
    is_completed: boolean
    sortOrder: string
  }>
  tasks: TaskReviewSummary[]
  periodCompletionRate: number
}

export interface AreaReviewData {
  area: {
    id: string
    name: string
    emoji: string
    color: string
    why: string | null
  }
  goals: GoalReviewData[]
  periodCompletionRate: number
}

// ============================================
// Fetch
// ============================================

const VISIBLE_STATUSES: GoalStatus[] = ['active', 'backlog', 'paused', 'completed', 'maintenance']

async function fetchReviewRoadmapData(
  start: string,
  end: string,
  directionId?: string
): Promise<AreaReviewData[]> {
  const supabase = createClient()

  let query = supabase.from('areas').select(
    `
      id, name, emoji, color, why,
      goals (
        id, name, status, why, created_at,
        groups (id, name, is_completed, sort_order),
        tasks (
          id, name, why, group_id, time_slot, streak_count, best_streak, is_active, related_goal_ids
        )
      )
    `
  )

  if (directionId) {
    query = query.eq('direction_id', directionId)
  }

  const { data: areas, error } = await query.order('sort_order', { ascending: true })

  if (error) throw error
  if (!areas) return []

  // Collect all task IDs
  const allTaskIds: string[] = []
  for (const area of areas) {
    for (const goal of area.goals ?? []) {
      for (const task of goal.tasks ?? []) {
        allTaskIds.push(task.id)
      }
    }
  }

  // Fetch check_ins with date filter (batch in chunks of 100 for Supabase .in() limit)
  const checkInsByTask = new Map<string, Array<{ date: string; status: string }>>()

  if (allTaskIds.length > 0) {
    const CHUNK_SIZE = 100
    for (let i = 0; i < allTaskIds.length; i += CHUNK_SIZE) {
      const chunk = allTaskIds.slice(i, i + CHUNK_SIZE)
      const { data: checkIns, error: ciError } = await supabase
        .from('check_ins')
        .select('task_id, date, status')
        .in('task_id', chunk)
        .gte('date', start)
        .lte('date', end)

      if (ciError) throw ciError
      for (const ci of checkIns ?? []) {
        const existing = checkInsByTask.get(ci.task_id) ?? []
        existing.push({ date: ci.date, status: ci.status })
        checkInsByTask.set(ci.task_id, existing)
      }
    }
  }

  const result: AreaReviewData[] = areas
    .map((area) => {
      // g.status is typed as string by Supabase; cast to GoalStatus at the boundary
      const visibleGoals = (area.goals ?? []).filter((g) =>
        VISIBLE_STATUSES.includes(g.status as GoalStatus)
      )

      const goalDataList: GoalReviewData[] = visibleGoals.map((goal) => {
        const groups = (goal.groups ?? [])
          .sort((a, b) => (a.sort_order ?? '').localeCompare(b.sort_order ?? ''))
          .map((g) => ({
            id: g.id,
            name: g.name,
            is_completed: !!g.is_completed,
            sortOrder: g.sort_order ?? '',
          }))

        const tasks: TaskReviewSummary[] = (goal.tasks ?? []).map((task) => {
          const periodCheckIns = checkInsByTask.get(task.id) ?? []
          const totalScheduled = periodCheckIns.length
          const totalDone = periodCheckIns.filter((c) => c.status === 'done').length

          const recentCheckIns = [...periodCheckIns]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, RECENT_CHECKINS_LIMIT)
            .reverse()
            // c.status is typed as string by Supabase; cast to CheckInStatus at the boundary
            .map((c) => ({ date: c.date, status: c.status as CheckInStatus }))

          return {
            taskId: task.id,
            taskName: task.name,
            why: task.why,
            groupId: task.group_id,
            timeSlot: (task.time_slot as TimeSlot | null) ?? null,
            streakCount: task.streak_count ?? 0,
            bestStreak: task.best_streak ?? 0,
            isActive: task.is_active ?? true,
            completionRate: calculateCheckInRate(totalDone, totalScheduled),
            totalDone,
            totalScheduled,
            recentCheckIns,
            relatedGoalIds: (task.related_goal_ids as string[] | null) ?? [],
          }
        })

        const activeTasks = tasks.filter((t) => t.isActive)
        const totalDone = activeTasks.reduce((s, t) => s + t.totalDone, 0)
        const totalScheduled = activeTasks.reduce((s, t) => s + t.totalScheduled, 0)

        return {
          goal: {
            id: goal.id,
            name: goal.name,
            status: goal.status as GoalStatus, // Supabase returns string; cast at boundary
            why: goal.why,
            createdAt: goal.created_at ?? '',
          },
          groups,
          tasks,
          periodCompletionRate: calculateCheckInRate(totalDone, totalScheduled),
        }
      })

      const areaTotalDone = goalDataList.reduce(
        (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalDone, 0),
        0
      )
      const areaTotalScheduled = goalDataList.reduce(
        (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalScheduled, 0),
        0
      )

      return {
        area: {
          id: area.id,
          name: area.name,
          emoji: area.emoji,
          color: area.color,
          why: area.why ?? null,
        },
        goals: goalDataList,
        periodCompletionRate: calculateCheckInRate(areaTotalDone, areaTotalScheduled),
      }
    })
    .filter((a) => a.goals.length > 0)

  // ============================================
  // Cross-link injection pass
  // ============================================
  const allTasksWithContext: Array<{
    task: TaskReviewSummary
    goalId: string
    goalName: string
    relatedGoalIds: string[]
  }> = []

  for (const areaData of result) {
    for (const goalData of areaData.goals) {
      for (const task of goalData.tasks) {
        if (task.relatedGoalIds && task.relatedGoalIds.length > 0) {
          allTasksWithContext.push({
            task,
            goalId: goalData.goal.id,
            goalName: goalData.goal.name,
            relatedGoalIds: task.relatedGoalIds,
          })
        }
      }
    }
  }

  for (const { task, goalId, goalName, relatedGoalIds } of allTasksWithContext) {
    for (const targetGoalId of relatedGoalIds) {
      for (const areaData of result) {
        for (const goalData of areaData.goals) {
          if (goalData.goal.id === targetGoalId) {
            goalData.tasks.push({
              ...task,
              isCrossLinked: true,
              sourceGoal: { id: goalId, name: goalName },
            })
          }
        }
      }
    }
  }

  // Recalculate goal and area completion rates after cross-link injection
  for (const areaData of result) {
    for (const goalData of areaData.goals) {
      const activeTasks = goalData.tasks.filter((t) => t.isActive)
      const goalTotalDone = activeTasks.reduce((s, t) => s + t.totalDone, 0)
      const goalTotalScheduled = activeTasks.reduce((s, t) => s + t.totalScheduled, 0)
      goalData.periodCompletionRate = calculateCheckInRate(goalTotalDone, goalTotalScheduled)
    }

    const areaTotalDone = areaData.goals.reduce(
      (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalDone, 0),
      0
    )
    const areaTotalScheduled = areaData.goals.reduce(
      (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalScheduled, 0),
      0
    )
    areaData.periodCompletionRate = calculateCheckInRate(areaTotalDone, areaTotalScheduled)
  }

  return result
}

// ============================================
// Hook
// ============================================

export function useReviewRoadmapData() {
  const { startDate, endDate } = useReviewPeriod()
  const { directionId } = useReviewDirection()

  return useQuery({
    queryKey: queryKeys.review.roadmapProgress(startDate, endDate, directionId),
    queryFn: () => fetchReviewRoadmapData(startDate, endDate, directionId),
    staleTime: STALE_TIMES.REVIEW,
    enabled: !!directionId,
  })
}
