'use server'

import { authAction, validate } from '@/lib/security'
import { profileTraitRepository } from '@/repositories'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createProfileTraitSchema, updateProfileTraitSchema } from '@/lib/validations'

import type {
  ProfileTrait,
  CreateProfileTraitInput,
  UpdateProfileTraitInput,
  ApiResponse,
} from '@/types'

const MAX_PROFILE_TRAITS = 30

/**
 * 프로필 항목 전체 조회
 */
export const getProfileTraits = authAction(
  'getProfileTraits',
  async ({ supabase, user }): Promise<ApiResponse<ProfileTrait[]>> => {
    const traits = await profileTraitRepository.getByUser(supabase, user.id)
    return successResponse(traits)
  }
)

/**
 * 프로필 항목 생성
 */
export const createProfileTrait = authAction(
  'createProfileTrait',
  async (
    { supabase, user },
    input: CreateProfileTraitInput
  ): Promise<ApiResponse<ProfileTrait>> => {
    const v = validate(createProfileTraitSchema, input)
    if (!v.success) return v.response

    const existing = await profileTraitRepository.getByUser(supabase, user.id)
    if (existing.length >= MAX_PROFILE_TRAITS) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        `최대 ${MAX_PROFILE_TRAITS}개까지 추가할 수 있습니다.`
      )
    }

    const trait = await profileTraitRepository.create(supabase, user.id, v.data)
    return successResponse(trait)
  }
)

/**
 * 프로필 항목 수정
 */
export const updateProfileTrait = authAction(
  'updateProfileTrait',
  async (
    { supabase },
    id: string,
    input: UpdateProfileTraitInput
  ): Promise<ApiResponse<ProfileTrait>> => {
    const v = validate(updateProfileTraitSchema, input)
    if (!v.success) return v.response

    const trait = await profileTraitRepository.update(supabase, id, v.data)
    return successResponse(trait)
  },
  { errorMap: { NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '항목을 찾을 수 없습니다.' } } }
)

/**
 * 프로필 항목 삭제
 */
export const deleteProfileTrait = authAction(
  'deleteProfileTrait',
  async ({ supabase }, id: string): Promise<ApiResponse<void>> => {
    await profileTraitRepository.delete(supabase, id)
    return successResponse(undefined)
  },
  { errorMap: { NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '항목을 찾을 수 없습니다.' } } }
)

/**
 * 프로필 항목 순서 변경
 */
export const reorderProfileTraits = authAction(
  'reorderProfileTraits',
  async ({ supabase }, orderedIds: string[]): Promise<ApiResponse<void>> => {
    await profileTraitRepository.reorder(supabase, orderedIds)
    return successResponse(undefined)
  }
)
