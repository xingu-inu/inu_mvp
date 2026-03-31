// Chat Context — Data fetching functions for AI chat tool calling
// Reuses existing repositories to provide user data to Gemini

import type { TypedSupabaseClient } from '@/repositories/base.repository'
import { profileRepository } from '@/repositories/profile.repository'
import { directionRepository } from '@/repositories/direction.repository'
import { areaRepository } from '@/repositories/area.repository'
import { goalRepository } from '@/repositories/goal.repository'
import { taskRepository } from '@/repositories/task.repository'

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  return monday.toISOString().split('T')[0]
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export async function getUserOverview(supabase: TypedSupabaseClient, userId: string) {
  const [profile, direction, areas] = await Promise.all([
    profileRepository.get(supabase, userId),
    directionRepository.get(supabase, userId),
    areaRepository.getAll(supabase, userId),
  ])

  return {
    name: profile?.name ?? null,
    timezone: profile?.timezone ?? 'Asia/Seoul',
    direction: direction ? { statement: direction.statement, why: direction.why } : null,
    areas: areas.map((a) => ({
      name: a.name,
      emoji: a.emoji,
      type: a.type,
      why: a.why,
      is_active: a.is_active,
    })),
  }
}

export async function getActiveGoals(supabase: TypedSupabaseClient, userId: string) {
  const goals = await goalRepository.getByStatus(supabase, userId, 'active')

  if (goals.length === 0) {
    return { goals: [], message: '아직 활성 목표가 없습니다.' }
  }

  return {
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      why: g.why,
      target_date: g.target_date,
      area: g.area ? { name: g.area.name, emoji: g.area.emoji } : null,
      group_count: g.groups?.length ?? 0,
      completed_groups: g.groups?.filter((grp) => grp.is_completed).length ?? 0,
      task_count: g.tasks?.length ?? 0,
    })),
  }
}

/** Shape returned by the get_today_tasks RPC (camelCase — matches SQL function output) */
interface TodayTaskRpcRow {
  name: string
  todayCheckIn?: { status: string } | null
  streakCount?: number
  durationMinutes?: number
  timeSlot?: string
  goal?: { name?: string; area?: { name?: string } } | null
}

export async function getTodayTasks(supabase: TypedSupabaseClient, _userId: string) {
  const today = getToday()

  const { data, error } = await supabase.rpc('get_today_tasks', {
    p_date: today,
  })

  if (error) {
    return { error: '오늘의 할 일을 가져오지 못했습니다.' }
  }

  const tasks = (data ?? []) as unknown as TodayTaskRpcRow[]
  const done = tasks.filter((t) => t.todayCheckIn?.status === 'done').length
  const skip = tasks.filter((t) => t.todayCheckIn?.status === 'skip').length
  const pending = tasks.length - done - skip

  return {
    date: today,
    tasks: tasks.map((t) => ({
      name: t.name,
      status: t.todayCheckIn?.status ?? 'pending',
      streak: t.streakCount ?? 0,
      duration_minutes: t.durationMinutes ?? 0,
      time_slot: t.timeSlot ?? 'anytime',
      goal_name: t.goal?.name ?? null,
      area_name: t.goal?.area?.name ?? null,
    })),
    summary: { total: tasks.length, done, skip, pending },
  }
}

export async function getGoalDetail(supabase: TypedSupabaseClient, userId: string, goalId: string) {
  const [goal, tasks] = await Promise.all([
    goalRepository.getById(supabase, goalId, userId),
    taskRepository.getByGoal(supabase, goalId, userId),
  ])

  if (!goal) {
    return { error: '해당 목표를 찾을 수 없습니다.' }
  }

  return {
    name: goal.name,
    why: goal.why,
    status: goal.status,
    target_date: goal.target_date,
    area: goal.area ? { name: goal.area.name, emoji: goal.area.emoji } : null,
    groups: (goal.groups ?? []).map((g) => ({
      name: g.name,
      is_completed: g.is_completed,
      description: g.description,
    })),
    tasks: tasks.map((t) => ({
      name: t.name,
      why: t.why,
      streak_count: t.streak_count,
      best_streak: t.best_streak,
      repeat_type: t.repeat_type,
      duration_minutes: t.duration_minutes,
      is_active: t.is_active,
    })),
  }
}

/** Shape returned by the get_weekly_stats RPC */
interface WeeklyStatsRpcResult {
  totalTasks?: number
  completedCount?: number
  skippedCount?: number
  dailyBreakdown?: unknown[]
  areaBreakdown?: unknown[]
}

export async function getWeeklyStats(supabase: TypedSupabaseClient, _userId: string) {
  const weekStart = getWeekStart()

  const { data, error } = await supabase.rpc('get_weekly_stats', {
    p_week_start: weekStart,
  })

  if (error) {
    return { error: '주간 통계를 가져오지 못했습니다.' }
  }

  const stats = data as unknown as WeeklyStatsRpcResult | null
  const total = stats?.totalTasks ?? 0
  const completed = stats?.completedCount ?? 0
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    week_start: weekStart,
    total_tasks: total,
    completed,
    skipped: stats?.skippedCount ?? 0,
    completion_rate: `${rate}%`,
    daily_breakdown: stats?.dailyBreakdown ?? [],
    area_breakdown: stats?.areaBreakdown ?? [],
  }
}

export async function getTaskStreaks(supabase: TypedSupabaseClient, userId: string) {
  const tasks = await taskRepository.getAll(supabase, userId)
  const activeTasks = tasks.filter((t) => t.is_active)

  if (activeTasks.length === 0) {
    return { tasks: [], message: '아직 활성 Task가 없습니다.' }
  }

  return {
    tasks: activeTasks.map((t) => ({
      name: t.name,
      streak_count: t.streak_count,
      best_streak: t.best_streak,
      goal_name: t.goal?.name ?? null,
    })),
  }
}
