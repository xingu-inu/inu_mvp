// Group Repository
// Renamed from Phase → Group

import { generateKeyBetween } from 'fractional-indexing'
import type { TypedSupabaseClient } from './base.repository'
import {
  handleSupabaseError,
  isNotFoundError,
  now,
  isValidFractionalKey,
  batchReorder,
} from './base.repository'
import type { Group, CreateGroupInput, UpdateGroupInput } from '@/types/entities'

/** Lightweight group shape for milestone notifications */
export interface NotificationGroup {
  id: string
  name: string
  goal_id: string
  goal_name: string
  completed_at: string | null
}

export const groupRepository = {
  /**
   * 최근 완료된 Group 조회 (Milestone 알림용)
   * goal name을 join하여 알림 메시지 생성에 활용
   */
  async getRecentlyCompleted(
    supabase: TypedSupabaseClient,
    userId: string,
    withinDays: number = 3
  ): Promise<NotificationGroup[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - withinDays)

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, goal_id, completed_at, goal:goals!inner(name, user_id)')
      .eq('is_completed', true)
      .gte('completed_at', cutoff.toISOString())
      .eq('goal.user_id', userId)

    if (error) handleSupabaseError(error)

    return (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      goal_id: g.goal_id,
      goal_name: (g.goal as unknown as { name: string }).name,
      completed_at: g.completed_at,
    }))
  },

  /**
   * Goal의 모든 Group 조회
   */
  async getByGoal(supabase: TypedSupabaseClient, goalId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('goal_id', goalId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Group[]
  },

  /**
   * ID로 Group 조회
   */
  async getById(supabase: TypedSupabaseClient, id: string): Promise<Group | null> {
    const { data, error } = await supabase.from('groups').select('*').eq('id', id).single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as Group
  },

  /**
   * Group 생성
   */
  async create(supabase: TypedSupabaseClient, input: CreateGroupInput): Promise<Group> {
    // 마지막 sort_order 조회
    const { data: lastGroup } = await supabase
      .from('groups')
      .select('sort_order')
      .eq('goal_id', input.goal_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastKey =
      lastGroup?.sort_order && isValidFractionalKey(lastGroup.sort_order)
        ? lastGroup.sort_order
        : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await supabase
      .from('groups')
      .insert({
        goal_id: input.goal_id,
        name: input.name,
        why: input.why ?? null,
        description: input.description ?? null,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Group
  },

  /**
   * Group 수정
   */
  async update(supabase: TypedSupabaseClient, id: string, input: UpdateGroupInput): Promise<Group> {
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: now(),
    }

    // is_completed가 true로 변경되면 completed_at 설정
    if (input.is_completed === true) {
      updateData.completed_at = now()
    } else if (input.is_completed === false) {
      updateData.completed_at = null
    }

    const { data, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Group
  },

  /**
   * Group 완료 상태 설정 (SELECT 없이 단일 UPDATE)
   */
  async setComplete(
    supabase: TypedSupabaseClient,
    id: string,
    isCompleted: boolean
  ): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? now() : null,
        updated_at: now(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) handleSupabaseError(error)
    return data as Group
  },

  /**
   * Group 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },

  /**
   * 그룹 관리 활성화: 첫 번째 Group 생성 + 직접 할 일을 해당 Group으로 이동
   */
  async enableGroups(
    supabase: TypedSupabaseClient,
    goalId: string,
    groupName: string = '그룹 1'
  ): Promise<Group> {
    // 마지막 sort_order 조회 (같은 goal 스코프) — create()와 동일 패턴
    const { data: lastGroup } = await supabase
      .from('groups')
      .select('sort_order')
      .eq('goal_id', goalId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastKey =
      lastGroup?.sort_order && isValidFractionalKey(lastGroup.sort_order)
        ? lastGroup.sort_order
        : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    // 1. Group 생성
    const { data: group, error: createError } = await supabase
      .from('groups')
      .insert({
        goal_id: goalId,
        name: groupName,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError)

    // 2. 직접 할 일(group_id IS NULL) → 새 Group으로 이동
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ group_id: (group as Group).id, updated_at: now() })
      .eq('goal_id', goalId)
      .is('group_id', null)

    if (updateError) handleSupabaseError(updateError)

    return group as Group
  },

  /**
   * 그룹 관리 해제: 모든 할 일의 group_id를 null로 + 모든 Group 삭제
   */
  async disableGroups(supabase: TypedSupabaseClient, goalId: string): Promise<void> {
    // 1. 모든 할 일의 group_id를 null로
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ group_id: null, updated_at: now() })
      .eq('goal_id', goalId)
      .not('group_id', 'is', null)

    if (updateError) handleSupabaseError(updateError)

    // 2. 모든 Group 삭제
    const { error: deleteError } = await supabase.from('groups').delete().eq('goal_id', goalId)

    if (deleteError) handleSupabaseError(deleteError)
  },

  /**
   * Group 순서 변경
   */
  async reorder(
    supabase: TypedSupabaseClient,
    goalId: string,
    orderedIds: string[]
  ): Promise<void> {
    await batchReorder(supabase, 'groups', orderedIds)
  },
}
