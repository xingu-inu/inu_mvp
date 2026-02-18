// Goal Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import {
  handleSupabaseError,
  isNotFoundError,
  now,
  getActiveDirectionId,
  batchReorder,
  isValidFractionalKey,
} from './base.repository'
import { generateKeyBetween } from 'fractional-indexing'
import type { Goal, GoalStatus, CreateGoalInput, UpdateGoalInput } from '@/types/entities'

export const goalRepository = {
  /**
   * 사용자의 모든 Goal 조회 (Area 포함)
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Goal[]> {
    const directionId = await getActiveDirectionId(supabase, userId)

    if (directionId) {
      // Use inner join to filter by direction
      const { data, error } = await supabase
        .from('goals')
        .select(
          `*, area:areas!inner(id, name, emoji, color, type, direction_id), groups:groups(*), tasks:tasks(*)`
        )
        .eq('user_id', userId)
        .eq('area.direction_id', directionId)
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
      .order('created_at', { ascending: false })
      .order('sort_order', { ascending: true, referencedTable: 'groups' })
      .order('sort_order', { ascending: true, referencedTable: 'tasks' })
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Goal[]
  },

  /**
   * 상태별 Goal 조회
   */
  async getByStatus(
    supabase: TypedSupabaseClient,
    userId: string,
    status: GoalStatus
  ): Promise<Goal[]> {
    const directionId = await getActiveDirectionId(supabase, userId)

    if (directionId) {
      // Use inner join to filter by direction
      const { data, error } = await supabase
        .from('goals')
        .select(
          `*, area:areas!inner(id, name, emoji, color, type, direction_id), groups:groups(*), tasks:tasks(*)`
        )
        .eq('user_id', userId)
        .eq('status', status)
        .eq('area.direction_id', directionId)
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
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateGoalInput
  ): Promise<Goal> {
    // 해당 Area의 마지막 sort_order 조회
    const { data: lastGoal } = await supabase
      .from('goals')
      .select('sort_order')
      .eq('area_id', input.area_id)
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const lastKey =
      lastGoal?.sort_order && isValidFractionalKey(lastGoal.sort_order) ? lastGoal.sort_order : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        area_id: input.area_id,
        name: input.name,
        why: input.why ?? null,
        status: input.status ?? 'backlog',
        target_date: input.target_date ?? null,
        sort_order: newSortOrder,
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
