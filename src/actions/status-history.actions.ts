'use server'

import { authAction } from '@/lib/security'
import { statusHistoryRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import type { ApiResponse, ApiListResult } from '@/types'
import type {
  GoalStatusHistoryRow,
  TaskStatusHistoryRow,
  ReasonCount,
} from '@/repositories/status-history.repository'

/**
 * 특정 Goal의 상태 변경 히스토리 조회
 */
export const getGoalStatusHistory = authAction(
  'getGoalStatusHistory',
  async ({ supabase, user }, goalId: string): Promise<ApiListResult<GoalStatusHistoryRow>> => {
    const history = await statusHistoryRepository.getGoalHistory(supabase, user.id, goalId)
    return listResponse(history)
  }
)

/**
 * 특정 Task의 상태 변경 히스토리 조회
 */
export const getTaskStatusHistory = authAction(
  'getTaskStatusHistory',
  async ({ supabase, user }, taskId: string): Promise<ApiListResult<TaskStatusHistoryRow>> => {
    const history = await statusHistoryRepository.getTaskHistory(supabase, user.id, taskId)
    return listResponse(history)
  }
)

/**
 * 기간별 막힘 분석 (Goal + Task 히스토리 + reason 집계)
 */
export const getObstacleAnalysis = authAction(
  'getObstacleAnalysis',
  async (
    { supabase, user },
    startDate: string,
    endDate: string
  ): Promise<
    ApiResponse<{
      goalHistory: GoalStatusHistoryRow[]
      taskHistory: TaskStatusHistoryRow[]
      reasonCounts: ReasonCount[]
    }>
  > => {
    const [goalHistory, taskHistory, reasonCounts] = await Promise.all([
      statusHistoryRepository.getAllGoalHistory(supabase, user.id, startDate, endDate),
      statusHistoryRepository.getAllTaskHistory(supabase, user.id, startDate, endDate),
      statusHistoryRepository.getReasonCounts(supabase, user.id, startDate, endDate),
    ])
    return successResponse({ goalHistory, taskHistory, reasonCounts })
  }
)
