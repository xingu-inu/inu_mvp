'use server'

import { authAction, validate } from '@/lib/security'
import { taskRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createTaskSchema, updateTaskSchema } from '@/lib/validations'
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from '@/lib/google-calendar/service'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import type { Task, CreateTaskInput, UpdateTaskInput, ApiResponse, ApiListResult } from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '할 일을 찾을 수 없습니다.' },
} as const

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0) + minutes
  const endH = Math.floor(total / 60) % 24
  const endM = total % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

async function syncTaskToGoogleCreate(
  supabase: TypedSupabaseClient,
  userId: string,
  task: Task
): Promise<void> {
  if (!task.specific_time) return
  try {
    const date = task.scheduled_date || new Date().toISOString().slice(0, 10)
    const duration = task.duration_minutes || 60
    const endTime = addMinutesToTime(task.specific_time, duration)

    const eventId = await createGoogleEvent(supabase, userId, {
      summary: task.name,
      description: task.why || undefined,
      start: { dateTime: `${date}T${task.specific_time}:00` },
      end: { dateTime: `${date}T${endTime}:00` },
    })

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
    if (task.specific_time && task.google_event_id) {
      const date = task.scheduled_date || new Date().toISOString().slice(0, 10)
      const duration = task.duration_minutes || 60
      const endTime = addMinutesToTime(task.specific_time, duration)

      await updateGoogleEvent(supabase, userId, task.google_event_id, {
        summary: task.name,
        description: task.why || undefined,
        start: { dateTime: `${date}T${task.specific_time}:00` },
        end: { dateTime: `${date}T${endTime}:00` },
      })
    } else if (task.specific_time && !task.google_event_id) {
      await syncTaskToGoogleCreate(supabase, userId, task)
    } else if (!task.specific_time && task.google_event_id) {
      await deleteGoogleEvent(supabase, userId, task.google_event_id)
      await supabase.from('tasks').update({ google_event_id: null }).eq('id', task.id)
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

    const task = await taskRepository.update(supabase, id, user.id, v.data)

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
    // Delete Google Calendar event before removing task
    try {
      const task = await taskRepository.getById(supabase, id, user.id)
      if (task?.google_event_id) {
        await deleteGoogleEvent(supabase, user.id, task.google_event_id)
      }
    } catch {
      // Google sync is best-effort
    }

    await taskRepository.delete(supabase, id, user.id)
    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
