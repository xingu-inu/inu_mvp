import { tool } from 'ai'
import { z } from 'zod'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import { aiInsightRepository } from '@/repositories'
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

    get_task_streaks: tool({
      description: '활성 Task들의 스트릭(연속 완료) 현황을 조회합니다.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await chatContext.getTaskStreaks(supabase, userId)
        return sanitizeToolResult(result)
      },
    }),

    suggest_profile_traits: tool({
      description:
        '대화 중 사용자에 대해 알게 된 정보를 프로필 항목으로 제안합니다. ' +
        '자연스러운 대화 중에는 1-2개, "나에 대해 정리해줘" 요청 시 여러 개 제안.',
      inputSchema: z.object({
        traits: z
          .array(
            z.object({
              label: z.string().max(50).describe('항목 이름 (예: MBTI, 강점, 현재 고민)'),
              value: z.string().max(500).describe('항목 내용'),
              reason: z.string().max(200).describe('이 항목을 제안하는 이유 (1문장)'),
              category: z
                .enum(['identity', 'stats', 'interests', 'description', 'habits', 'general'])
                .default('general')
                .describe(
                  '항목 카테고리: identity(성격유형), stats(능력/강점), interests(관심사), description(자기소개), habits(습관/루틴), general(기타)'
                ),
              existing_trait_id: z
                .string()
                .optional()
                .describe('기존 프로필 항목 ID (업데이트 시)'),
            })
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ traits }) => {
        return sanitizeToolResult({ type: 'suggest_profile_traits', traits })
      },
    }),

    suggest_responses: tool({
      description:
        '대화의 다음 단계로 사용자가 선택할 수 있는 응답 옵션을 제안합니다. 모든 응답 끝에 호출하세요.',
      inputSchema: z.object({
        chips: z
          .array(
            z.object({
              label: z.string().max(20).describe('칩에 표시할 짧은 텍스트'),
              message: z.string().max(200).describe('칩 클릭 시 전송될 메시지'),
            })
          )
          .min(2)
          .max(4),
      }),
      execute: async ({ chips }) => {
        return sanitizeToolResult({ type: 'suggest_responses', chips })
      },
    }),

    save_ai_insight: tool({
      description:
        '대화 중 발견한 사용자에 대한 인사이트를 저장합니다. ' +
        '사용자의 패턴, 성향, 성장 포인트 등 의미 있는 발견을 기록할 때 사용합니다.',
      inputSchema: z.object({
        title: z.string().max(100).describe('인사이트 제목 (예: 완벽주의 성향, 아침형 인간)'),
        description: z.string().max(1000).describe('인사이트 상세 설명'),
      }),
      execute: async ({ title, description }) => {
        const insight = await aiInsightRepository.create(supabase, userId, {
          title,
          description,
        })
        return sanitizeToolResult({
          type: 'save_ai_insight',
          insight: { id: insight.id, title: insight.title, description: insight.description },
        })
      },
    }),

    propose_structure: tool({
      description:
        '사용자의 아이디어나 계획을 Area/Goal/Task 구조로 정리해서 제안합니다. 쏟아내기 모드뿐 아니라 일반 대화에서도 구조 정리가 필요할 때 사용할 수 있습니다. 사용자가 충분히 이야기한 후에 호출하세요. 사용자는 이 제안을 미리보고 "반영하기"로 실제 생성할 수 있습니다.',
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
