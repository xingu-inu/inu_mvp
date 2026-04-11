'use server'

import { authAction, validate } from '@/lib/security'
import { taskRepository, statusHistoryRepository, activityLogRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createTaskSchema, updateTaskSchema } from '@/lib/validations'
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from '@/lib/google-calendar/service'
import { buildGoogleEventFromTask } from '@/lib/google-calendar/event-builder'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import type { Task, CreateTaskInput, UpdateTaskInput, ApiResponse, ApiListResult } from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '할 일을 찾을 수 없습니다.' },
} as const

async function isGoogleSyncEnabled(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('google_calendar_connections')
    .select('sync_enabled, auto_sync')
    .eq('user_id', userId)
    .single()
  return !!data?.sync_enabled && !!data?.auto_sync
}

async function syncTaskToGoogleCreate(
  supabase: TypedSupabaseClient,
  userId: string,
  task: Task
): Promise<void> {
  try {
    if (!(await isGoogleSyncEnabled(supabase, userId))) return

    const event = buildGoogleEventFromTask(task)
    const eventId = await createGoogleEvent(supabase, userId, event)

    if (eventId) {
      await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', task.id)
    }
  } catch {
    // Google sync is best-effort
  }
}

async function syncTaskToGoogleUpdate(
  supabase: TypedSupabaseClient,
  userId: string,
  task: Task
): Promise<void> {
  try {
    if (!(await isGoogleSyncEnabled(supabase, userId))) return

    // Task no longer active → delete Google event
    if (task.status !== 'active' && task.google_event_id) {
      await deleteGoogleEvent(supabase, userId, task.google_event_id)
      await supabase.from('tasks').update({ google_event_id: null }).eq('id', task.id)
      return
    }

    const event = buildGoogleEventFromTask(task)

    if (task.google_event_id) {
      // Update existing event with new schedule/recurrence
      await updateGoogleEvent(supabase, userId, task.google_event_id, event)
    } else if (task.status === 'active') {
      // No existing event — create one
      const eventId = await createGoogleEvent(supabase, userId, event)
      if (eventId) {
        await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', task.id)
      }
    }
  } catch {
    // Google sync is best-effort
  }
}

/**
 * 사용자의 모든 Task 조회
 */
export const getTasks = authAction(
  'getTasks',
  async ({ supabase, user }): Promise<ApiListResult<Task>> => {
    const tasks = await taskRepository.getAll(supabase, user.id)
    return listResponse(tasks)
  }
)

/**
 * 오늘의 Task 조회
 */
export const getTodayTasks = authAction(
  'getTodayTasks',
  async ({ supabase, user }, date?: string): Promise<ApiListResult<Task>> => {
    const tasks = await taskRepository.getToday(supabase, user.id, date)
    return listResponse(tasks)
  }
)

/**
 * Goal별 Task 조회
 */
export const getTasksByGoal = authAction(
  'getTasksByGoal',
  async ({ supabase, user }, goalId: string): Promise<ApiListResult<Task>> => {
    const tasks = await taskRepository.getByGoal(supabase, goalId, user.id)
    return listResponse(tasks)
  }
)

/**
 * Task 생성
 */
export const createTask = authAction(
  'createTask',
  async ({ supabase, user }, input: CreateTaskInput): Promise<ApiResponse<Task>> => {
    const v = validate(createTaskSchema, input)
    if (!v.success) return v.response

    const task = await taskRepository.create(supabase, user.id, v.data)

    await activityLogRepository.log(supabase, user.id, {
      entityType: 'task',
      entityId: task.id,
      action: 'created',
      entityName: task.name,
      areaId: task.area_id ?? task.goal?.area_id ?? null,
      goalId: task.goal_id ?? null,
    })

    // Google Calendar sync (fire-and-forget)
    syncTaskToGoogleCreate(supabase, user.id, task).catch(() => {})

    return successResponse(task)
  }
)

/**
 * Task 수정
 */
export const updateTask = authAction(
  'updateTask',
  async ({ supabase, user }, id: string, input: UpdateTaskInput): Promise<ApiResponse<Task>> => {
    const v = validate(updateTaskSchema, input)
    if (!v.success) return v.response

    // 상태 변경 / 이름 / why diff을 위해 before 조회 (해당 중 하나라도 필요한 경우에만)
    const wantsIdentityDiff = v.data.name !== undefined || v.data.why !== undefined
    const needsStatusHistory = !!v.data.status
    const before =
      wantsIdentityDiff || needsStatusHistory
        ? await taskRepository.getById(supabase, id, user.id)
        : null

    // 상태 변경 시 히스토리 기록 (기존 로직 유지)
    if (before && v.data.status && before.status !== v.data.status) {
      await statusHistoryRepository.insertTaskHistory(
        supabase,
        user.id,
        id,
        before.status,
        v.data.status,
        v.data.status_change_reason,
        v.data.status_change_note
      )
    }

    const task = await taskRepository.update(supabase, id, user.id, v.data)

    if (before) {
      const nameChanged = v.data.name !== undefined && v.data.name !== before.name
      const whyChanged = v.data.why !== undefined && (v.data.why ?? '') !== (before.why ?? '')

      if (nameChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'task',
          entityId: task.id,
          action: 'renamed',
          entityName: task.name,
          areaId: task.area_id ?? task.goal?.area_id ?? null,
          goalId: task.goal_id ?? null,
          metadata: { from: before.name, to: task.name },
        })
      }

      if (whyChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'task',
          entityId: task.id,
          action: 'why_updated',
          entityName: task.name,
          areaId: task.area_id ?? task.goal?.area_id ?? null,
          goalId: task.goal_id ?? null,
          metadata: { from: before.why ?? null, to: task.why ?? null },
        })
      }
    }

    // Google Calendar sync (fire-and-forget)
    syncTaskToGoogleUpdate(supabase, user.id, task).catch(() => {})

    return successResponse(task)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Task 순서 변경
 */
export const reorderTasks = authAction(
  'reorderTasks',
  async ({ supabase, user }, goalId: string, orderedIds: string[]): Promise<ApiResponse<void>> => {
    await taskRepository.reorder(supabase, user.id, goalId, orderedIds)
    return successResponse(undefined)
  }
)

/**
 * Task 삭제
 */
export const deleteTask = authAction(
  'deleteTask',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    // 삭제 전에 스냅샷을 받아 활동 로그 + Google Calendar 정리에 재사용
    const before = await taskRepository.getById(supabase, id, user.id)

    // Delete Google Calendar event before removing task
    if (before?.google_event_id) {
      try {
        await deleteGoogleEvent(supabase, user.id, before.google_event_id)
      } catch {
        // Google sync is best-effort
      }
    }

    await taskRepository.delete(supabase, id, user.id)

    if (before) {
      await activityLogRepository.log(supabase, user.id, {
        entityType: 'task',
        entityId: id,
        action: 'deleted',
        entityName: before.name,
        areaId: before.area_id ?? before.goal?.area_id ?? null,
        goalId: before.goal_id ?? null,
      })
    }

    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
