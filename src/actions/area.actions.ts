'use server'

import { authAction, validate } from '@/lib/security'
import { areaRepository, directionRepository } from '@/repositories'
import { getActiveDirectionId } from '@/repositories/base.repository'
import { successResponse, errorResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createAreaSchema, updateAreaSchema } from '@/lib/validations'

import type { Area, CreateAreaInput, UpdateAreaInput, ApiResponse, ApiListResult } from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: 'Area를 찾을 수 없습니다.' },
} as const

/**
 * 사용자의 모든 Area 조회
 */
export const getAreas = authAction(
  'getAreas',
  async ({ supabase, user }): Promise<ApiListResult<Area>> => {
    const directionId = await getActiveDirectionId(supabase, user.id)
    const areas = await areaRepository.getAll(supabase, user.id, directionId)
    return listResponse(areas)
  }
)

/**
 * 활성화된 Area만 조회
 */
export const getActiveAreas = authAction(
  'getActiveAreas',
  async ({ supabase, user }): Promise<ApiListResult<Area>> => {
    const directionId = await getActiveDirectionId(supabase, user.id)
    const areas = await areaRepository.getActive(supabase, user.id, directionId)
    return listResponse(areas)
  }
)

/**
 * Area 생성
 */
export const createArea = authAction(
  'createArea',
  async ({ supabase, user }, input: CreateAreaInput): Promise<ApiResponse<Area>> => {
    const v = validate(createAreaSchema, input)
    if (!v.success) return v.response

    // active direction 조회하여 direction_id 전달
    const direction = await directionRepository.get(supabase, user.id)
    if (!direction) {
      return errorResponse(ErrorCode.NOT_FOUND, '활성 로드맵이 없습니다.')
    }
    const area = await areaRepository.create(supabase, user.id, v.data, direction.id)

    return successResponse(area)
  }
)

/**
 * Area 수정
 */
export const updateArea = authAction(
  'updateArea',
  async ({ supabase, user }, id: string, input: UpdateAreaInput): Promise<ApiResponse<Area>> => {
    const v = validate(updateAreaSchema, input)
    if (!v.success) return v.response

    const area = await areaRepository.update(supabase, id, user.id, v.data)
    return successResponse(area)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Area 삭제
 */
export const deleteArea = authAction(
  'deleteArea',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    await areaRepository.delete(supabase, id, user.id)
    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Area 순서 변경
 */
export const reorderAreas = authAction(
  'reorderAreas',
  async ({ supabase, user }, orderedIds: string[]): Promise<ApiResponse<void>> => {
    await areaRepository.reorder(supabase, user.id, orderedIds)
    return successResponse(undefined)
  }
)
