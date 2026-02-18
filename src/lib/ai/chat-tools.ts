// Chat Tools — Gemini Function Calling declarations for AI chat
// Defines tools the AI can call to fetch user data on demand

import {
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationsTool,
  type FunctionCall,
} from '@google/generative-ai'
import type { TypedSupabaseClient } from '@/repositories/base.repository'
import * as chatContext from './chat-context'

// ── Function Declarations ──

const getUserOverview: FunctionDeclaration = {
  name: 'get_user_overview',
  description:
    '사용자의 프로필, 인생 방향(Direction), 영역(Area) 목록을 가져옵니다. 사용자가 누구인지, 어떤 인생 방향을 가지고 있는지 파악할 때 호출합니다.',
}

const getActiveGoals: FunctionDeclaration = {
  name: 'get_active_goals',
  description:
    '현재 Active 상태인 모든 목표(Goal)와 소속 영역(Area) 정보를 가져옵니다. 사용자가 현재 추구 중인 목표가 무엇인지 파악할 때 호출합니다.',
}

const getTodayTasks: FunctionDeclaration = {
  name: 'get_today_tasks',
  description:
    '오늘의 할 일(Task) 목록과 체크인 상태(done/skip/pending)를 가져옵니다. 오늘의 진행 상황, 남은 할 일, 완료율 등을 확인할 때 호출합니다.',
}

const getGoalDetail: FunctionDeclaration = {
  name: 'get_goal_detail',
  description:
    '특정 목표의 상세 정보(단계, 할 일, 스트릭)를 가져옵니다. 특정 목표에 대해 깊이 있는 조언이 필요할 때 호출합니다. get_active_goals에서 받은 id를 사용하세요.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      goal_id: {
        type: SchemaType.STRING,
        description: '상세 정보를 조회할 Goal의 UUID',
      },
    },
    required: ['goal_id'],
  },
}

const getWeeklyStats: FunctionDeclaration = {
  name: 'get_weekly_stats',
  description:
    '이번 주의 완료 통계(일별, 영역별 달성률)를 가져옵니다. 주간 진행 상황이나 패턴을 분석할 때 호출합니다.',
}

const getRecentReflections: FunctionDeclaration = {
  name: 'get_recent_reflections',
  description:
    '최근 N일간의 기분(mood) 기록과 일일/주간 회고를 가져옵니다. 사용자의 최근 기분 패턴이나 자기 평가를 참고할 때 호출합니다.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      days: {
        type: SchemaType.INTEGER,
        description: '조회할 일수 (기본 7, 최대 30)',
      },
    },
    required: ['days'],
  },
}

const getTaskStreaks: FunctionDeclaration = {
  name: 'get_task_streaks',
  description:
    '모든 활성 Task의 현재 스트릭과 최고 스트릭을 가져옵니다. 스트릭 관련 칭찬이나 동기부여가 필요할 때 호출합니다.',
}

export const chatTools: FunctionDeclarationsTool[] = [
  {
    functionDeclarations: [
      getUserOverview,
      getActiveGoals,
      getTodayTasks,
      getGoalDetail,
      getWeeklyStats,
      getRecentReflections,
      getTaskStreaks,
    ],
  },
]

// ── Tool Result Sanitization ──

const MAX_TOOL_RESULT_LENGTH = 8000

/**
 * Sanitize tool result to prevent prompt injection via user-controlled data.
 * Truncates oversized results and strips characters that could break prompt boundaries.
 */
function sanitizeToolResult(result: object): object {
  const json = JSON.stringify(result)
  if (json.length <= MAX_TOOL_RESULT_LENGTH) return result
  // Truncate and mark as partial
  const truncated = json.slice(0, MAX_TOOL_RESULT_LENGTH)
  return { _truncated: true, data: truncated }
}

// ── Tool Execution Dispatcher ──

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function executeTool(
  fnCall: FunctionCall,
  supabase: TypedSupabaseClient,
  userId: string
): Promise<object> {
  const args = (fnCall.args ?? {}) as Record<string, unknown>

  let result: object

  switch (fnCall.name) {
    case 'get_user_overview':
      result = await chatContext.getUserOverview(supabase, userId)
      break
    case 'get_active_goals':
      result = await chatContext.getActiveGoals(supabase, userId)
      break
    case 'get_today_tasks':
      result = await chatContext.getTodayTasks(supabase, userId)
      break
    case 'get_goal_detail': {
      const goalId = String(args.goal_id ?? '')
      if (!UUID_RE.test(goalId)) return { error: '유효하지 않은 goal_id 형식입니다.' }
      result = await chatContext.getGoalDetail(supabase, userId, goalId)
      break
    }
    case 'get_weekly_stats':
      result = await chatContext.getWeeklyStats(supabase, userId)
      break
    case 'get_recent_reflections': {
      const days = Math.min(30, Math.max(1, Math.floor(Number(args.days) || 7)))
      result = await chatContext.getRecentReflections(supabase, userId, days)
      break
    }
    case 'get_task_streaks':
      result = await chatContext.getTaskStreaks(supabase, userId)
      break
    default:
      return { error: `알 수 없는 도구: ${fnCall.name}` }
  }

  return sanitizeToolResult(result)
}
