// Goal Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import {
  handleSupabaseError,
  isNotFoundError,
  now,
  getActiveDirectionId,
  batchReorder,
} from './base.repository'
import { generateKeyBetween } from 'fractional-indexing'
import type { Goal, GoalStatus, CreateGoalInput, UpdateGoalInput } from '@/types/entities'

/**
 * Lightweight goal shape for notifications — no groups/tasks join.
 * area_id intentionally omitted; callers needing it should use getAll().
 */
export interface MinimalGoal {
  id: string
  name: string
  status: GoalStatus
  target_date: string | null
}

/** Extended goal shape for the redesigned notification system */
export interface NotificationGoal {
  id: string
  name: string
  status: GoalStatus
  target_date: string | null
  updated_at: string | null
  completed_at: string | null
  task_count: number
}

export const goalRepository = {
  /**
   * Active Goal을 경량 쿼리로 조회 (notifications 전용)
   * groups/tasks join 없이 id, name, status, target_date만 반환
   */
  async getActiveMinimal(supabase: TypedSupabaseClient, userId: string): Promise<MinimalGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, status, target_date')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) handleSupabaseError(error)
    return (data ?? []) as MinimalGoal[]
  },

  /**
   * Active Goal을 알림 시스템용으로 조회 (확장된 필드)
   * updated_at, completed_at, task count 포함
   */
  async getForNotifications(
    supabase: TypedSupabaseClient,
    userId: string
  ): Promise<NotificationGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, status, target_date, updated_at, completed_at, tasks(id)')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) handleSupabaseError(error)

    return (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status as GoalStatus,
      target_date: g.target_date,
      updated_at: g.updated_at,
      completed_at: g.completed_at,
      task_count: Array.isArray(g.tasks) ? g.tasks.length : 0,
    }))
  },

  /**
   * 최근 완료된 Goal 조회 (Milestone 알림용)
   * completed 상태 & completed_at 최근 N일 이내
   */
  async getRecentlyCompleted(
    supabase: TypedSupabaseClient,
    userId: string,
    withinDays: number = 7
  ): Promise<NotificationGoal[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - withinDays)

    const { data, error } = await supabase
      .from('goals')
      .select('id, name, status, target_date, updated_at, completed_at, tasks(id)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', cutoff.toISOString())

    if (error) handleSupabaseError(error)

    return (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status as GoalStatus,
      target_date: g.target_date,
      updated_at: g.updated_at,
      completed_at: g.completed_at,
      task_count: Array.isArray(g.tasks) ? g.tasks.length : 0,
    }))
  },

  /**
   * 사용자의 모든 Goal 조회 (Area 포함)
   * @param directionId - 제공 시 내부 getActiveDirectionId 호출 스킵
   */
  async getAll(
    supabase: TypedSupabaseClient,
    userId: string,
    directionId?: string | null
  ): Promise<Goal[]> {
    const resolvedDirectionId =
      directionId !== undefined ? directionId : await getActiveDirectionId(supabase, userId)

    if (resolvedDirectionId) {
      // Use inner join to filter by direction
      const { data, error } = await supabase
        .from('goals')
        .select(
          `*, area:areas!inner(id, name, emoji, color, type, direction_id), groups:groups(*), tasks:tasks(*)`
        )
        .eq('user_id', userId)
        .eq('area.direction_id', resolvedDirectionId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .order('sort_order', { ascending: true, referencedTable: 'groups' })
        .order('sort_order', { ascending: true, referencedTable: 'tasks' })
      if (error) handleSupabaseError(error)
      return (data ?? []) as unknown as Goal[]
    }

    // No active direction — return all goals
    const { data, error } = await supabase
      .from('goals')
      .select(`*, area:areas(id, name, emoji, color, type), groups:groups(*), tasks:tasks(*)`)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .order('sort_order', { ascending: true, referencedTable: 'groups' })
      .order('sort_order', { ascending: true, referencedTable: 'tasks' })
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Goal[]
  },

  /**
   * 상태별 Goal 조회
   * @param directionId - 제공 시 내부 getActiveDirectionId 호출 스킵
   */
  async getByStatus(
    supabase: TypedSupabaseClient,
    userId: string,
    status: GoalStatus,
    directionId?: string | null
  ): Promise<Goal[]> {
    const resolvedDirectionId =
      directionId !== undefined ? directionId : await getActiveDirectionId(supabase, userId)

    if (resolvedDirectionId) {
      // Use inner join to filter by direction
      const { data, error } = await supabase
        .from('goals')
        .select(
          `*, area:areas!inner(id, name, emoji, color, type, direction_id), groups:groups(*), tasks:tasks(*)`
        )
        .eq('user_id', userId)
        .eq('status', status)
        .eq('area.direction_id', resolvedDirectionId)
        .order('sort_order', { ascending: true })
        .order('sort_order', { ascending: true, referencedTable: 'groups' })
        .order('sort_order', { ascending: true, referencedTable: 'tasks' })
      if (error) handleSupabaseError(error)
      return (data ?? []) as unknown as Goal[]
    }

    // No active direction — return all goals
    const { data, error } = await supabase
      .from('goals')
      .select(`*, area:areas(id, name, emoji, color, type), groups:groups(*), tasks:tasks(*)`)
      .eq('user_id', userId)
      .eq('status', status)
      .order('sort_order', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'groups' })
      .order('sort_order', { ascending: true, referencedTable: 'tasks' })
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Goal[]
  },

  /**
   * Area별 Goal 조회
   */
  async getByArea(supabase: TypedSupabaseClient, areaId: string, userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('area_id', areaId)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Goal[]
  },

  /**
   * ID로 Goal 상세 조회 (Area, Groups 포함)
   */
  async getById(supabase: TypedSupabaseClient, id: string, userId: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select(
        `
        *,
        area:areas(id, name, emoji, color, type),
        groups:groups(*)
      `
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as unknown as Goal
  },

  /**
   * Goal 생성
   * sort_order collision on rapid concurrent creates is intentional
   * — self-heals via batchReorder RPC on next explicit sort
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateGoalInput
  ): Promise<Goal> {
    const newSortOrder = generateKeyBetween(null, null)

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        area_id: input.area_id,
        name: input.name,
        why: input.why ?? null,
        status: input.status ?? 'backlog',
        start_date: input.start_date ?? null,
        target_date: input.target_date ?? null,
        sort_order: newSortOrder,
        impact_area_ids: input.impact_area_ids ?? [],
      })
      .select(
        `
        *,
        area:areas(id, name, emoji, color, type)
      `
      )
      .single()

    if (error) handleSupabaseError(error)
    return data as Goal
  },

  /**
   * Goal 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateGoalInput
  ): Promise<Goal> {
    // completed_at 자동 설정
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: now(),
    }

    if (input.status === 'completed' && !('completed_at' in input)) {
      updateData.completed_at = now()
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(
        `
        *,
        area:areas(id, name, emoji, color, type)
      `
      )
      .single()

    if (error) handleSupabaseError(error)
    return data as Goal
  },

  /**
   * Goal 상태 변경
   */
  async updateStatus(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    status: GoalStatus
  ): Promise<Goal> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now(),
    }

    if (status === 'completed') {
      updateData.completed_at = now()
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Goal
  },

  /**
   * Goal 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * Goal 순서 변경
   */
  async reorder(
    supabase: TypedSupabaseClient,
    userId: string,
    areaId: string,
    orderedIds: string[]
  ): Promise<void> {
    await batchReorder(supabase, 'goals', orderedIds)
  },
}
