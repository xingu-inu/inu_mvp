'use server'

import { authAction, validate } from '@/lib/security'
import { groupRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createGroupSchema, updateGroupSchema } from '@/lib/validations'

import type { Group, CreateGroupInput, UpdateGroupInput, ApiResponse, ApiListResult } from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '그룹을 찾을 수 없습니다.' },
} as const

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
  async ({ supabase }, input: CreateGroupInput): Promise<ApiResponse<Group>> => {
    const v = validate(createGroupSchema, input)
    if (!v.success) return v.response

    const group = await groupRepository.create(supabase, v.data)
    return successResponse(group)
  }
)

/**
 * Group 수정
 */
export const updateGroup = authAction(
  'updateGroup',
  async ({ supabase }, id: string, input: UpdateGroupInput): Promise<ApiResponse<Group>> => {
    const v = validate(updateGroupSchema, input)
    if (!v.success) return v.response

    const group = await groupRepository.update(supabase, id, v.data)
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
  async ({ supabase }, id: string): Promise<ApiResponse<void>> => {
    await groupRepository.delete(supabase, id)
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
