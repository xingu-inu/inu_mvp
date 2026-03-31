'use server'

import { authAction, validate } from '@/lib/security'
import { directionRepository, directionHistoryRepository } from '@/repositories'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createDirectionSchema, updateDirectionSchema } from '@/lib/validations'

import type { Direction, CreateDirectionInput, UpdateDirectionInput, ApiResponse } from '@/types'

/**
 * 사용자의 Direction 조회
 */
export const getDirection = authAction(
  'getDirection',
  async ({ supabase, user }): Promise<ApiResponse<Direction | null>> => {
    const direction = await directionRepository.get(supabase, user.id)
    return successResponse(direction)
  }
)

/**
 * Direction 생성
 */
export const createDirection = authAction(
  'createDirection',
  async ({ supabase, user }, input: CreateDirectionInput): Promise<ApiResponse<Direction>> => {
    const v = validate(createDirectionSchema, input)
    if (!v.success) return v.response

    // 이미 Direction이 있는지 확인
    const existing = await directionRepository.get(supabase, user.id)
    if (existing) {
      return errorResponse(ErrorCode.ALREADY_EXISTS, 'Direction이 이미 존재합니다.')
    }

    const direction = await directionRepository.create(supabase, user.id, v.data)
    return successResponse(direction)
  }
)

/**
 * Direction 수정
 */
export const updateDirection = authAction(
  'updateDirection',
  async (
    { supabase, user },
    id: string,
    input: UpdateDirectionInput
  ): Promise<ApiResponse<Direction>> => {
    const v = validate(updateDirectionSchema, input)
    if (!v.success) return v.response

    // 변경 전 상태 조회 (히스토리 기록용)
    const existing = await directionRepository.getById(supabase, id, user.id)

    const direction = await directionRepository.update(supabase, id, user.id, v.data)

    // 변경 히스토리 기록
    if (existing) {
      const changes: Array<{ field: string; old: string | null; new: string | null }> = []

      if (v.data.statement !== undefined && v.data.statement !== existing.statement) {
        changes.push({ field: 'statement', old: existing.statement, new: v.data.statement })
      }
      if (v.data.why !== undefined && v.data.why !== existing.why) {
        changes.push({ field: 'why', old: existing.why, new: v.data.why ?? null })
      }

      await Promise.all(
        changes.map((c) =>
          directionHistoryRepository.insert(supabase, user.id, id, 'updated', c.field, c.old, c.new)
        )
      )
    }

    return successResponse(direction)
  },
  {
    errorMap: {
      NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: 'Direction을 찾을 수 없습니다.' },
    },
  }
)
