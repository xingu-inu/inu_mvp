import { tool } from 'ai'
import { z } from 'zod'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import * as chatContext from './chat-context'

const MAX_TOOL_RESULT_LENGTH = 4000

function sanitizeToolResult(data: unknown): string {
  const json = JSON.stringify(data)
  if (json.length <= MAX_TOOL_RESULT_LENGTH) return json

  // For objects with array fields (most tool results), truncate arrays at item boundaries
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const clone: Record<string, unknown> = { ...obj }
    for (const key of Object.keys(clone)) {
      if (Array.isArray(clone[key])) {
        const arr = clone[key] as unknown[]
        // Find how many items fit within the limit
        for (let count = arr.length; count > 0; count--) {
          clone[key] = arr.slice(0, count)
          const attempt = JSON.stringify(clone)
          if (attempt.length <= MAX_TOOL_RESULT_LENGTH) return attempt
        }
      }
    }
  }

  // For plain arrays, truncate at item boundaries
  if (Array.isArray(data)) {
    for (let count = data.length; count > 0; count--) {
      const attempt = JSON.stringify(data.slice(0, count))
      if (attempt.length <= MAX_TOOL_RESULT_LENGTH) return attempt
    }
  }

  // Fallback: raw slice (should rarely hit)
  return json.slice(0, MAX_TOOL_RESULT_LENGTH) + '...'
}

export function createChatTools(supabase: TypedSupabaseClient, userId: string) {
  return {
    get_user_overview: tool({
      description: '사용자의 기본 정보, 방향(Direction), 영역(Area) 목록을 조회합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getUserOverview(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    get_active_goals: tool({
      description:
        '사용자의 활성(Active) 목표 목록을 조회합니다. 각 목표의 이름, 이유, 영역, 진행 상황을 포함합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getActiveGoals(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    get_today_tasks: tool({
      description:
        '오늘 해야 할 Task 목록과 완료 상태를 조회합니다. 각 Task의 이름, 상태, 스트릭, 소요시간, 시간대를 포함합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getTodayTasks(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    get_goal_detail: tool({
      description:
        '특정 목표의 상세 정보를 조회합니다. 목표의 그룹, Task 목록, 진행 상황을 포함합니다.',
      inputSchema: z.object({
        goal_id: z.string().describe('조회할 목표의 ID'),
      }),
      execute: async ({ goal_id }) => {
        const result = await chatContext.getGoalDetail(supabase, userId, goal_id)
        return sanitizeToolResult(result)
      },
    }),

    get_weekly_stats: tool({
      description: '이번 주 실천 통계를 조회합니다. 완료율, 영역별 현황, 일별 현황을 포함합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getWeeklyStats(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    get_recent_reflections: tool({
      description: '최근 기분 기록과 회고를 조회합니다. 기분 추이와 한줄 회고를 포함합니다.',
      inputSchema: z.object({
        days: z.number().min(1).max(30).describe('조회할 일수 (1~30)'),
      }),
      execute: async ({ days }) => {
        const result = await chatContext.getRecentReflections(supabase, userId, days)
        return sanitizeToolResult(result)
      },
    }),

    get_task_streaks: tool({
      description: '활성 Task들의 스트릭(연속 완료) 현황을 조회합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getTaskStreaks(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    propose_structure: tool({
      description:
        '쏟아내기 모드에서 사용자의 아이디어를 Area/Goal/Task 구조로 제안합니다. 사용자가 충분히 이야기한 후에 호출하세요. 사용자는 이 제안을 미리보고 "반영하기"로 실제 생성할 수 있습니다.',
      inputSchema: z.object({
        summary: z.string().describe('정리된 내용의 한 줄 요약'),
        areas: z.array(
          z.object({
            name: z.string().describe('영역 이름'),
            emoji: z.string().describe('대표 이모지'),
            color: z.string().describe('영역 색상 (hex)'),
            type: z
              .enum([
                'health',
                'career',
                'finance',
                'relationships',
                'hobbies',
                'mental',
                'learning',
                'daily',
                'custom',
              ])
              .describe('영역 타입'),
            isExisting: z.boolean().describe('기존 영역인지 여부'),
            existingAreaId: z.string().optional().describe('기존 영역 ID (isExisting=true일 때)'),
            goals: z.array(
              z.object({
                name: z.string().describe('목표 이름'),
                why: z.string().optional().describe('이 목표를 하는 이유'),
                tasks: z.array(
                  z.object({
                    name: z.string().describe('할 일 이름'),
                    why: z.string().optional().describe('이 할 일을 하는 이유'),
                    repeat_type: z
                      .enum(['once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom'])
                      .describe('반복 타입'),
                    duration_minutes: z.number().describe('소요 시간(분)'),
                    time_slot: z
                      .enum(['morning', 'afternoon', 'evening', 'anytime'])
                      .describe('시간대'),
                  })
                ),
              })
            ),
          })
        ),
      }),
      execute: async ({ summary, areas }) => {
        // This tool doesn't execute server-side changes — it returns the structure
        // for the client to render as a preview card with "apply" button
        return sanitizeToolResult({ type: 'propose_structure', summary, areas })
      },
    }),
  }
}
