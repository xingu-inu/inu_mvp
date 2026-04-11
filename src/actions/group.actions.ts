'use server'

import { authAction, validate } from '@/lib/security'
import { groupRepository, activityLogRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createGroupSchema, updateGroupSchema } from '@/lib/validations'

import type { Group, CreateGroupInput, UpdateGroupInput, ApiResponse, ApiListResult } from '@/types'
import type { NotificationGroup } from '@/repositories/group.repository'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '그룹을 찾을 수 없습니다.' },
} as const

/**
 * 최근 완료된 Group 조회 (Milestone 알림용)
 */
export const getRecentlyCompletedGroups = authAction(
  'getRecentlyCompletedGroups',
  async ({ supabase, user }): Promise<ApiListResult<NotificationGroup>> => {
    const groups = await groupRepository.getRecentlyCompleted(supabase, user.id)
    return listResponse(groups)
  }
)

/**
 * Goal의 모든 Group 조회
 */
export const getGroupsByGoal = authAction(
  'getGroupsByGoal',
  async ({ supabase }, goalId: string): Promise<ApiListResult<Group>> => {
    const groups = await groupRepository.getByGoal(supabase, goalId)
    return listResponse(groups)
  }
)

/**
 * Group 생성
 */
export const createGroup = authAction(
  'createGroup',
  async ({ supabase, user }, input: CreateGroupInput): Promise<ApiResponse<Group>> => {
    const v = validate(createGroupSchema, input)
    if (!v.success) return v.response

    const group = await groupRepository.create(supabase, v.data)

    await activityLogRepository.log(supabase, user.id, {
      entityType: 'group',
      entityId: group.id,
      action: 'created',
      entityName: group.name,
      goalId: group.goal_id,
    })

    return successResponse(group)
  }
)

/**
 * Group 수정
 */
export const updateGroup = authAction(
  'updateGroup',
  async ({ supabase, user }, id: string, input: UpdateGroupInput): Promise<ApiResponse<Group>> => {
    const v = validate(updateGroupSchema, input)
    if (!v.success) return v.response

    // name/why 변경 diff용 before
    const wantsIdentityDiff = v.data.name !== undefined || v.data.why !== undefined
    const before = wantsIdentityDiff ? await groupRepository.getById(supabase, id) : null

    const group = await groupRepository.update(supabase, id, v.data)

    if (before) {
      const nameChanged = v.data.name !== undefined && v.data.name !== before.name
      const whyChanged = v.data.why !== undefined && (v.data.why ?? '') !== (before.why ?? '')

      if (nameChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'group',
          entityId: group.id,
          action: 'renamed',
          entityName: group.name,
          goalId: group.goal_id,
          metadata: { from: before.name, to: group.name },
        })
      }

      if (whyChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'group',
          entityId: group.id,
          action: 'why_updated',
          entityName: group.name,
          goalId: group.goal_id,
          metadata: { from: before.why ?? null, to: group.why ?? null },
        })
      }
    }

    return successResponse(group)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Group 완료 상태 설정
 */
export const toggleGroupComplete = authAction(
  'toggleGroupComplete',
  async ({ supabase }, id: string, isCompleted: boolean): Promise<ApiResponse<Group>> => {
    const group = await groupRepository.setComplete(supabase, id, isCompleted)
    return successResponse(group)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Group 삭제
 */
export const deleteGroup = authAction(
  'deleteGroup',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    const before = await groupRepository.getById(supabase, id)

    await groupRepository.delete(supabase, id)

    if (before) {
      await activityLogRepository.log(supabase, user.id, {
        entityType: 'group',
        entityId: id,
        action: 'deleted',
        entityName: before.name,
        goalId: before.goal_id,
      })
    }

    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * 그룹 관리 활성화: 첫 번째 Group 생성 + 직접 할 일 이동
 */
export const enableGoalGroups = authAction(
  'enableGoalGroups',
  async ({ supabase }, goalId: string, groupName?: string): Promise<ApiResponse<Group>> => {
    const group = await groupRepository.enableGroups(supabase, goalId, groupName)
    return successResponse(group)
  }
)

/**
 * 그룹 관리 해제: 모든 할 일 직접 연결 + Group 삭제
 */
export const disableGoalGroups = authAction(
  'disableGoalGroups',
  async ({ supabase }, goalId: string): Promise<ApiResponse<void>> => {
    await groupRepository.disableGroups(supabase, goalId)
    return successResponse(undefined)
  }
)

/**
 * Group 순서 변경
 */
export const reorderGroups = authAction(
  'reorderGroups',
  async ({ supabase }, goalId: string, orderedIds: string[]): Promise<ApiResponse<void>> => {
    await groupRepository.reorder(supabase, goalId, orderedIds)
    return successResponse(undefined)
  }
)
