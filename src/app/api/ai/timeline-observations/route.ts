import { NextResponse } from 'next/server'
import { authRoute } from '@/lib/security'
import { generateContent } from '@/lib/ai/generate-client'
import { profileRepository } from '@/repositories/profile.repository'
import { profileTraitRepository } from '@/repositories/profile-trait.repository'
import { timelineNoteRepository } from '@/repositories/timeline-note.repository'
import { DEFAULT_MODEL, type AiModelId } from '@/lib/ai/provider'
import { CORE_PRINCIPLES, SECURITY_PRINCIPLES } from '@/lib/ai/constants'
import {
  getUserOverview,
  getActiveGoals,
  getWeeklyStats,
  getTaskStreaks,
  getTimelineSummary,
} from '@/lib/ai/chat-context'
import { sanitizeContext, sanitizeUserText } from '@/lib/ai/sanitize'

interface ObservationNode {
  id: string
  nodeType: 'observation' | 'question'
  message: string
  afterDate: string
  relatedAreaIds: string[]
  relatedEventIds: string[]
  chatContext: {
    type: 'goal' | 'task'
    entityId: string
    entityName: string
    goalId: string
  } | null
  userResponse: string | null
  respondedAt: string | null
}

interface ObservationsResponse {
  nodes: Array<{
    id: string
    nodeType: 'observation' | 'question'
    message: string
    afterDate: string
    relatedAreaIds: string[]
    relatedEventIds: string[]
    chatContext: {
      type: 'goal' | 'task'
      entityId: string
      entityName: string
      goalId: string
    } | null
  }>
}

function parseObservationsJson(raw: string): ObservationsResponse {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw)
  } catch {
    // Continue
  }

  const cleaned = raw.replace(/^\uFEFF/, '').trim()

  // Strategy 2: Cleaned
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue
  }

  // Strategy 3: Extract from markdown code block
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // Continue
    }
  }

  // Strategy 4: Find first { ... }
  const jsonObjectMatch = cleaned.match(/(\{[\s\S]*\})/)
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[1])
    } catch {
      // Continue
    }
  }

  // Strategy 5: Repair truncated JSON
  if (cleaned.startsWith('{')) {
    try {
      const repaired = repairTruncatedJson(cleaned)
      if (repaired) {
        return JSON.parse(repaired)
      }
    } catch {
      // Continue
    }
  }

  throw new Error('Failed to parse AI timeline observations response as JSON')
}

function repairTruncatedJson(text: string): string | null {
  let trimmed = text
  const lastCloseIdx = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  const lastCommaIdx = trimmed.lastIndexOf(',')
  const lastCompleteValue = Math.max(trimmed.lastIndexOf('"'), lastCloseIdx)

  if (lastCompleteValue < 0) return null

  if (lastCommaIdx > lastCloseIdx && lastCommaIdx > lastCompleteValue) {
    trimmed = trimmed.slice(0, lastCommaIdx)
  } else if (lastCloseIdx >= 0) {
    trimmed = trimmed.slice(0, lastCloseIdx + 1)
  } else {
    trimmed = trimmed.slice(0, lastCompleteValue + 1)
  }

  const stack: string[] = []
  let inString = false
  let escape = false
  for (const ch of trimmed) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    if (ch === '}' || ch === ']') stack.pop()
  }

  const closers = stack
    .reverse()
    .map((ch) => (ch === '{' ? '}' : ']'))
    .join('')

  return trimmed + closers
}

export const POST = authRoute(
  'ai.timeline-observations',
  async (ctx): Promise<NextResponse> => {
    try {
      // Fetch all data in parallel
      const [overview, goals, weeklyStats, streaks, timeline, traits, profile, existingNotes] =
        await Promise.all([
          getUserOverview(ctx.supabase, ctx.user.id),
          getActiveGoals(ctx.supabase, ctx.user.id),
          getWeeklyStats(ctx.supabase, ctx.user.id),
          getTaskStreaks(ctx.supabase, ctx.user.id),
          getTimelineSummary(ctx.supabase, ctx.user.id),
          profileTraitRepository.getByUser(ctx.supabase, ctx.user.id),
          profileRepository.get(ctx.supabase, ctx.user.id),
          timelineNoteRepository.getByUser(ctx.supabase, ctx.user.id),
        ])

      // Check if there's enough data
      const hasAreas = overview.areas.length > 0
      const hasGoals = goals.goals.length > 0
      const hasTraits = traits.length > 0

      if (!hasAreas && !hasGoals && !hasTraits) {
        return NextResponse.json({
          success: true,
          data: { nodes: [], generated_at: new Date().toISOString() },
        })
      }

      const modelId = (profile?.ai_model as AiModelId) ?? DEFAULT_MODEL

      // Build system prompt
      const systemPrompt = `당신은 inu(이누) 앱의 AI 동행자 '이누'입니다.
사용자의 타임라인 데이터를 분석하여 타임라인에 자연스럽게 섞이는 관찰과 질문을 생성합니다.

${CORE_PRINCIPLES}
${SECURITY_PRINCIPLES}

[노드 생성 규칙]
- 3~5개의 노드를 생성합니다. 대부분 observation, 0~1개만 question.
- 각 노드의 id는 "obs-{날짜}-{주제슬러그}" 형태로 결정론적으로 생성합니다. (예: "obs-2026-03-28-health-goal-completed")
- afterDate는 해당 관찰이 들어갈 위치의 날짜입니다. 반드시 타임라인에 실제 존재하는 날짜를 사용하세요.
- relatedAreaIds는 해당 관찰과 관련된 영역 ID 배열입니다.
- relatedEventIds는 관련 타임라인 이벤트 ID 배열입니다.
- observation: 패턴, 성장 포인트, 흐름을 짚어줍니다. 데이터에 근거해야 합니다.
- question: 중요한 순간에 가볍게 물어봅니다. 답하지 않아도 괜찮은 톤이어야 합니다.
- 빈말, 과한 칭찬, 뻔한 조언은 절대 하지 않습니다.
- "~하세요" 대신 "~네요", "~해볼 수 있어요" 같은 부드러운 표현을 사용합니다.
- chatContext는 선택사항입니다. 특정 목표나 태스크에 대해 더 대화할 수 있을 때만 포함합니다.
- 이미 답변된 질문의 observation_key는 재생성하지 않습니다.

[응답 형식]
JSON: { "nodes": [{ "id": "obs-...", "nodeType": "observation|question", "message": "한국어 텍스트", "afterDate": "YYYY-MM-DD", "relatedAreaIds": ["uuid", ...], "relatedEventIds": ["goal-uuid", ...], "chatContext": { "type": "goal|task", "entityId": "uuid", "entityName": "이름", "goalId": "uuid" } | null }] }`

      // Build user prompt with sanitized data
      const safeOverview = sanitizeContext(overview)
      const safeGoals = sanitizeContext(goals)
      const safeWeeklyStats = sanitizeContext(weeklyStats)
      const safeStreaks = sanitizeContext(streaks)
      const safeTimeline = sanitizeContext(timeline)

      const traitSummary =
        traits.length > 0
          ? traits
              .map((t) => `- ${sanitizeUserText(t.label)}: ${sanitizeUserText(t.value)}`)
              .join('\n')
          : '(프로필 항목 없음)'

      const safeNoteKeys =
        existingNotes.map((n) => sanitizeUserText(n.observation_key)).join(', ') || '(없음)'

      const userPrompt = `<user_data>
[사용자 개요]
${JSON.stringify(safeOverview, null, 2)}

[활성 목표]
${JSON.stringify(safeGoals, null, 2)}

[주간 통계]
${JSON.stringify(safeWeeklyStats, null, 2)}

[태스크 스트릭]
${JSON.stringify(safeStreaks, null, 2)}

[타임라인 요약 (최근 변경)]
${JSON.stringify(safeTimeline, null, 2)}

[프로필 특성]
${traitSummary}

[이미 답변된 질문 키]
${safeNoteKeys}
</user_data>

위 데이터를 분석하여 타임라인에 삽입할 관찰/질문 노드 3~5개를 JSON으로 반환해주세요.`

      const rawResponse = await generateContent(systemPrompt, userPrompt, modelId, { json: true })
      const parsed = parseObservationsJson(rawResponse)

      // Enrich nodes with existing user responses
      const noteMap = new Map(existingNotes.map((n) => [n.observation_key, n]))
      const enrichedNodes: ObservationNode[] = parsed.nodes
        .map((node) => {
          const note = noteMap.get(node.id)
          return {
            ...node,
            userResponse: note?.content ?? null,
            respondedAt: note?.created_at ?? null,
          }
        })
        .slice(0, 5) // Safety cap

      return NextResponse.json({
        success: true,
        data: {
          nodes: enrichedNodes,
          generated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error(
        '[ai-timeline-observations]',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_GENERATION_FAILED',
            message: 'AI 관찰을 생성하지 못했어요. 잠시 후 다시 시도해주세요.',
          },
        },
        { status: 500 }
      )
    }
  },
  { csrf: true, rateLimit: { limit: 5 } }
)
