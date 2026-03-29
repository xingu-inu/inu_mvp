// Status History Repository
// Goal/Task 상태 변경 히스토리 관리

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { GoalStatus, TaskStatus } from '@/types/entities'

// ============================================
// Types
// ============================================

export interface GoalStatusHistoryRow {
  id: string
  goal_id: string
  user_id: string
  from_status: GoalStatus
  to_status: GoalStatus
  reason: string | null
  note: string | null
  created_at: string
}

export interface TaskStatusHistoryRow {
  id: string
  task_id: string
  user_id: string
  from_status: TaskStatus
  to_status: TaskStatus
  reason: string | null
  note: string | null
  created_at: string
}

export interface ReasonCount {
  reason: string
  count: number
  entity_type: 'goal' | 'task'
}

// ============================================
// Repository
// ============================================

export const statusHistoryRepository = {
  /**
   * Goal 상태 변경 히스토리 삽입
   */
  async insertGoalHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    goalId: string,
    fromStatus: GoalStatus,
    toStatus: GoalStatus,
    reason?: string | null,
    note?: string | null
  ): Promise<GoalStatusHistoryRow> {
    const { data, error } = await supabase
      .from('goal_status_history')
      .insert({
        goal_id: goalId,
        user_id: userId,
        from_status: fromStatus,
        to_status: toStatus,
        reason: reason ?? null,
        note: note ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as GoalStatusHistoryRow
  },

  /**
   * 특정 Goal의 상태 변경 히스토리 조회 (타임라인용)
   */
  async getGoalHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    goalId: string
  ): Promise<GoalStatusHistoryRow[]> {
    const { data, error } = await supabase
      .from('goal_status_history')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as GoalStatusHistoryRow[]
  },

  /**
   * 기간별 전체 Goal 히스토리 조회 (막힘 분석용)
   */
  async getAllGoalHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<GoalStatusHistoryRow[]> {
    let query = supabase
      .from('goal_status_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error } = await query
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as GoalStatusHistoryRow[]
  },

  /**
   * Task 상태 변경 히스토리 삽입
   */
  async insertTaskHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    taskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    reason?: string | null,
    note?: string | null
  ): Promise<TaskStatusHistoryRow> {
    const { data, error } = await supabase
      .from('task_status_history')
      .insert({
        task_id: taskId,
        user_id: userId,
        from_status: fromStatus,
        to_status: toStatus,
        reason: reason ?? null,
        note: note ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as TaskStatusHistoryRow
  },

  /**
   * 특정 Task의 상태 변경 히스토리 조회
   */
  async getTaskHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    taskId: string
  ): Promise<TaskStatusHistoryRow[]> {
    const { data, error } = await supabase
      .from('task_status_history')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as TaskStatusHistoryRow[]
  },

  /**
   * 기간별 전체 Task 히스토리 조회 (막힘 분석용)
   */
  async getAllTaskHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TaskStatusHistoryRow[]> {
    let query = supabase
      .from('task_status_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error } = await query
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as TaskStatusHistoryRow[]
  },

  /**
   * 기간별 상태 변경 사유 집계 (막힘 분석용)
   * RPC 우선 → 미배포 시 레거시 2-쿼리 폴백
   */
  async getReasonCounts(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ReasonCount[]> {
    // Try RPC first (single query with SQL GROUP BY)
    try {
      const { data, error } = await supabase.rpc('get_reason_counts', {
        p_start_date: startDate,
        p_end_date: endDate,
      })

      if (!error && data) {
        return data
          .map((row) => ({
            reason: row.reason,
            count: Number(row.entity_count),
            entity_type: row.entity_type as 'goal' | 'task',
          }))
          .sort((a, b) => b.count - a.count)
      }
      // RPC not deployed yet — fall through to legacy path
    } catch {
      // RPC not available — fall through to legacy path
    }

    // Legacy fallback: 2 sequential queries + JS aggregation
    const results: ReasonCount[] = []

    const { data: goalData, error: goalError } = await supabase
      .from('goal_status_history')
      .select('reason')
      .eq('user_id', userId)
      .not('reason', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (goalError) handleSupabaseError(goalError)

    const { data: taskData, error: taskError } = await supabase
      .from('task_status_history')
      .select('reason')
      .eq('user_id', userId)
      .not('reason', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (taskError) handleSupabaseError(taskError)

    const countMap = new Map<string, { goal: number; task: number }>()

    for (const row of goalData ?? []) {
      if (!row.reason) continue
      const existing = countMap.get(row.reason) ?? { goal: 0, task: 0 }
      existing.goal++
      countMap.set(row.reason, existing)
    }

    for (const row of taskData ?? []) {
      if (!row.reason) continue
      const existing = countMap.get(row.reason) ?? { goal: 0, task: 0 }
      existing.task++
      countMap.set(row.reason, existing)
    }

    for (const [reason, counts] of countMap) {
      if (counts.goal > 0) {
        results.push({ reason, count: counts.goal, entity_type: 'goal' })
      }
      if (counts.task > 0) {
        results.push({ reason, count: counts.task, entity_type: 'task' })
      }
    }

    results.sort((a, b) => b.count - a.count)

    return results
  },
}
