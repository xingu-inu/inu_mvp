'use server'

import { authAction } from '@/lib/security'
import { roadmapVersionRepository } from '@/repositories'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'

import type {
  CreateRoadmapVersionInput,
  RoadmapVersionResult,
  DeleteArchivedRoadmapResult,
  DirectionHistoryItem,
  ArchivedRoadmapData,
  ApiResponse,
} from '@/types'

/**
 * 새 로드맵 버전 생성 (재정비)
 */
export const createNewRoadmapVersion = authAction(
  'createNewRoadmapVersion',
  async (
    { supabase, user },
    input: CreateRoadmapVersionInput
  ): Promise<ApiResponse<RoadmapVersionResult>> => {
    if (!input.statement?.trim()) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Direction statement은 필수입니다.')
    }

    const result = await roadmapVersionRepository.createNewVersion(supabase, user.id, input)
    return successResponse(result)
  }
)

/**
 * 로드맵 히스토리 조회
 */
export const getDirectionHistory = authAction(
  'getDirectionHistory',
  async ({ supabase, user }): Promise<ApiResponse<DirectionHistoryItem[]>> => {
    const history = await roadmapVersionRepository.getHistory(supabase, user.id)
    return successResponse(history)
  }
)

/**
 * 아카이브된 로드맵 상세 조회
 */
export const getArchivedRoadmap = authAction(
  'getArchivedRoadmap',
  async ({ supabase, user }, directionId: string): Promise<ApiResponse<ArchivedRoadmapData>> => {
    const roadmap = await roadmapVersionRepository.getArchivedRoadmap(
      supabase,
      user.id,
      directionId
    )
    return successResponse(roadmap)
  }
)

/**
 * 아카이브된 로드맵 삭제
 */
export const deleteArchivedRoadmap = authAction(
  'deleteArchivedRoadmap',
  async (
    { supabase, user },
    directionId: string
  ): Promise<ApiResponse<DeleteArchivedRoadmapResult>> => {
    const result = await roadmapVersionRepository.deleteArchivedRoadmap(
      supabase,
      user.id,
      directionId
    )
    return successResponse(result)
  }
)
