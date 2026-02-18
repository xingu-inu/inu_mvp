'use server'

import { authAction, validate, validateImageFile } from '@/lib/security'
import { profileRepository } from '@/repositories'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { updateProfileSchema } from '@/lib/validations'

import type { Profile, UpdateProfileInput, ApiResponse } from '@/types'

/**
 * 현재 사용자 프로필 조회
 */
export const getProfile = authAction(
  'getProfile',
  async ({ supabase, user }): Promise<ApiResponse<Profile | null>> => {
    const profile = await profileRepository.get(supabase, user.id)
    return successResponse(profile)
  }
)

/**
 * 프로필 수정
 */
export const updateProfile = authAction(
  'updateProfile',
  async ({ supabase, user }, input: UpdateProfileInput): Promise<ApiResponse<Profile>> => {
    const v = validate(updateProfileSchema, input)
    if (!v.success) return v.response

    const profile = await profileRepository.update(supabase, user.id, v.data)
    return successResponse(profile)
  },
  { errorMap: { NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '프로필을 찾을 수 없습니다.' } } }
)

/**
 * 아바타 업데이트
 * - FormData로 파일을 받아 Storage에 업로드 후 URL 저장
 */
export const updateAvatar = authAction(
  'updateAvatar',
  async ({ supabase, user }, formData: FormData): Promise<ApiResponse<Profile>> => {
    const file = formData.get('avatar') as File | null
    if (!file) {
      return errorResponse(ErrorCode.VALIDATION_REQUIRED, '파일을 선택해주세요.')
    }

    // Magic byte 기반 파일 검증
    const validation = await validateImageFile(file)
    if (!validation.valid) {
      return errorResponse(ErrorCode.VALIDATION_FORMAT, validation.error)
    }

    // 감지된 MIME으로 확장자 결정
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    const fileExt = mimeToExt[validation.detectedMime!] ?? 'png'

    // Storage에 업로드
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      return errorResponse(ErrorCode.INTERNAL_ERROR, '파일 업로드에 실패했습니다.')
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from('profiles').getPublicUrl(filePath)

    // 프로필 업데이트
    const profile = await profileRepository.updateAvatar(supabase, user.id, publicUrl)

    return successResponse(profile)
  }
)

/**
 * 온보딩 완료 여부 확인
 */
export const isOnboardingCompleted = authAction(
  'isOnboardingCompleted',
  async ({ supabase, user }): Promise<ApiResponse<boolean>> => {
    const completed = await profileRepository.isOnboardingCompleted(supabase, user.id)
    return successResponse(completed)
  }
)
