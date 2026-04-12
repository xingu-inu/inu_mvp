// Task Repository

import { generateKeyBetween } from 'fractional-indexing'
import type { TypedSupabaseClient } from './base.repository'
import {
  handleSupabaseError,
  isNotFoundError,
  isValidFractionalKey,
  now,
  batchReorder,
} from './base.repository'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types/entities'

export const taskRepository = {
  /**
   * 사용자의 모든 Task 조회
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        goal:goals(id, name, area_id)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Task[]
  },

  /**
   * 오늘의 Task 조회 (RPC 사용)
   * - Phase 3에서 정의된 get_today_tasks 호출
   */
  async getToday(supabase: TypedSupabaseClient, userId: string, date?: string): Promise<Task[]> {
    const targetDate = date ?? new Date().toISOString().split('T')[0]

    const { data, error } = await supabase.rpc('get_today_tasks', {
      p_date: targetDate,
    })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Task[]
  },

  /**
   * Goal별 Task 조회
   */
  async getByGoal(supabase: TypedSupabaseClient, goalId: string, userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Task[]
  },

  /**
   * Group별 Task 조회
   */
  async getByGroup(
    supabase: TypedSupabaseClient,
    groupId: string,
    userId: string
  ): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Task[]
  },

  /**
   * ID로 Task 조회
   */
  async getById(supabase: TypedSupabaseClient, id: string, userId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        goal:goals(id, name, area_id)
      `
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as Task
  },

  /**
   * Task 생성
   * 같은 goal/group 스코프 내 마지막 sort_order 뒤에 이어붙여 충돌 없이 생성한다.
   * 스코프: goal_id + (group_id OR group_id IS NULL).
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateTaskInput
  ): Promise<Task> {
    // 마지막 sort_order 조회 (같은 goal + group 스코프)
    let lastQuery = supabase
      .from('tasks')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)

    if (input.goal_id) {
      lastQuery = lastQuery.eq('goal_id', input.goal_id)
    } else {
      lastQuery = lastQuery.is('goal_id', null)
    }

    if (input.group_id) {
      lastQuery = lastQuery.eq('group_id', input.group_id)
    } else {
      lastQuery = lastQuery.is('group_id', null)
    }

    const { data: lastTask } = await lastQuery.maybeSingle()

    const lastKey =
      lastTask?.sort_order && isValidFractionalKey(lastTask.sort_order) ? lastTask.sort_order : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        goal_id: input.goal_id ?? null,
        group_id: input.group_id ?? null,
        area_id: input.area_id ?? null,
        name: input.name,
        why: input.why ?? null,
        repeat_type: input.repeat_type ?? 'daily',
        repeat_days: input.repeat_days ?? null,
        duration_minutes: input.duration_minutes ?? 30,
        time_slot: input.time_slot ?? 'anytime',
        specific_time: input.specific_time ?? null,
        streak_count: 0,
        best_streak: 0,
        is_active: true,
        sort_order: newSortOrder,
        related_area_ids: input.related_area_ids ?? [],
        scheduled_date: input.scheduled_date ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
      })
      .select(
        `
        *,
        goal:goals(id, name, area_id)
      `
      )
      .single()

    if (error) handleSupabaseError(error)
    return data as Task
  },

  /**
   * Task 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateTaskInput
  ): Promise<Task> {
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: now(),
    }
    // Auto-set timestamps based on status
    if (input.status === 'completed') {
      updateData.completed_at = now()
    }
    if (input.status === 'paused') {
      updateData.paused_at = now()
    }
    if (input.status === 'active') {
      updateData.paused_at = null
      updateData.completed_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(
        `
        *,
        goal:goals(id, name, area_id)
      `
      )
      .single()

    if (error) handleSupabaseError(error)
    return data as Task
  },

  /**
   * Task 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * Task 순서 변경
   */
  async reorder(
    supabase: TypedSupabaseClient,
    userId: string,
    goalId: string,
    orderedIds: string[]
  ): Promise<void> {
    await batchReorder(supabase, 'tasks', orderedIds)
  },
}
