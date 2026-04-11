'use server'

import { authAction, validate } from '@/lib/security'
import { areaRepository, directionRepository, activityLogRepository } from '@/repositories'
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

    await activityLogRepository.log(supabase, user.id, {
      entityType: 'area',
      entityId: area.id,
      action: 'created',
      entityName: area.name,
      areaId: area.id,
    })

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

    // 이름/emoji/why가 실제로 바뀔 때만 활동 로그를 남기기 위해 before 조회
    // sort_order, is_active 등만 바뀌는 케이스는 로깅하지 않음
    const wantsIdentityDiff =
      v.data.name !== undefined || v.data.emoji !== undefined || v.data.why !== undefined
    const before = wantsIdentityDiff ? await areaRepository.getById(supabase, id, user.id) : null

    const area = await areaRepository.update(supabase, id, user.id, v.data)

    if (before) {
      const nameChanged = v.data.name !== undefined && v.data.name !== before.name
      const emojiChanged = v.data.emoji !== undefined && v.data.emoji !== before.emoji
      const whyChanged = v.data.why !== undefined && (v.data.why ?? '') !== (before.why ?? '')

      if (nameChanged || emojiChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'area',
          entityId: area.id,
          action: 'renamed',
          entityName: area.name,
          areaId: area.id,
          metadata: {
            from: { name: before.name, emoji: before.emoji },
            to: { name: area.name, emoji: area.emoji },
          },
        })
      }

      if (whyChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'area',
          entityId: area.id,
          action: 'why_updated',
          entityName: area.name,
          areaId: area.id,
          metadata: { from: before.why ?? null, to: area.why ?? null },
        })
      }
    }

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
    // 삭제 전 이름을 캡처해 타임라인에서 "(삭제된 영역)" 대신 실제 이름을 보여줄 수 있게 한다
    const before = await areaRepository.getById(supabase, id, user.id)

    await areaRepository.delete(supabase, id, user.id)

    if (before) {
      await activityLogRepository.log(supabase, user.id, {
        entityType: 'area',
        entityId: id,
        action: 'deleted',
        entityName: before.name,
        areaId: id,
        metadata: { emoji: before.emoji, cascade: true },
      })
    }

    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
