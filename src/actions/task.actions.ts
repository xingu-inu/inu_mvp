'use server'

import { authAction, validate } from '@/lib/security'
import { taskRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createTaskSchema, updateTaskSchema } from '@/lib/validations'

import type { Task, CreateTaskInput, UpdateTaskInput, ApiResponse, ApiListResult } from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '할 일을 찾을 수 없습니다.' },
} as const

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
    await taskRepository.delete(supabase, id, user.id)
    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
