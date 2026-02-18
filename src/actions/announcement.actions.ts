'use server'

import { authAction, adminAction } from '@/lib/security'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { announcementRepository } from '@/repositories'
import type { Announcement, UpdateAnnouncementInput } from '@/repositories/announcement.repository'
import type { ApiResponse, ApiListResult } from '@/types/api'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '공지사항을 찾을 수 없습니다.' },
} as const

/**
 * 활성 공지사항 조회 (인증된 사용자용)
 */
export const getActiveAnnouncements = authAction(
  'getActiveAnnouncements',
  async ({ supabase }): Promise<ApiResponse<Announcement[]>> => {
    const announcements = await announcementRepository.getActive(supabase)
    return successResponse(announcements)
  }
)

/**
 * 전체 공지사항 목록 조회 (관리자용)
 */
export const getAdminAnnouncements = adminAction(
  'getAdminAnnouncements',
  async ({ supabase }, params?: { isActive?: boolean }): Promise<ApiListResult<Announcement>> => {
    const announcements = await announcementRepository.list(supabase, params ?? {})
    return listResponse(announcements)
  }
)

/**
 * 공지사항 생성 (관리자용)
 */
export const createAnnouncement = adminAction(
  'createAnnouncement',
  async (
    { supabase, user },
    input: {
      title: string
      content: string
      type: 'info' | 'update' | 'event'
      expires_at?: string | null
    }
  ): Promise<ApiResponse<Announcement>> => {
    const announcement = await announcementRepository.create(supabase, {
      ...input,
      created_by: user.id,
    })
    return successResponse(announcement)
  }
)

/**
 * 공지사항 수정 (관리자용)
 */
export const updateAnnouncement = adminAction(
  'updateAnnouncement',
  async (
    { supabase },
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<ApiResponse<Announcement>> => {
    const announcement = await announcementRepository.update(supabase, id, input)
    return successResponse(announcement)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * 공지사항 삭제 (관리자용)
 */
export const deleteAnnouncement = adminAction(
  'deleteAnnouncement',
  async ({ supabase }, id: string): Promise<ApiResponse<void>> => {
    await announcementRepository.remove(supabase, id)
    return successResponse(undefined)
  }
)
