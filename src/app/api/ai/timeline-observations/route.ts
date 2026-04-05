import { createHash } from 'crypto'
import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { authRoute } from '@/lib/security'
import { generateContent } from '@/lib/ai/generate-client'
import { profileRepository } from '@/repositories/profile.repository'
import { profileTraitRepository } from '@/repositories/profile-trait.repository'
import { timelineNoteRepository } from '@/repositories/timeline-note.repository'
import { aiObservationRepository } from '@/repositories/ai-observation.repository'
import { hiddenTimelineRepository } from '@/repositories/hidden-timeline.repository'
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
import type { TypedSupabaseClient } from '@/repositories/base.repository'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// JSON parsing (resilient, 5 strategies)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data hash — lightweight fingerprint for change detection
// Intentionally excludes weeklyStats and timeline (volatile, change frequently)
// to avoid unnecessary AI regeneration on minor stat fluctuations.
// Includes overview, goals, streaks, trait count, and note count — these
// represent structural changes that warrant new observations.
// ---------------------------------------------------------------------------

function computeDataHash(
  overview: unknown,
  goals: unknown,
  streaks: unknown,
  traitCount: number,
  noteCount: number
): string {
  const payload = JSON.stringify({ overview, goals, streaks, traitCount, noteCount })
  return createHash('md5').update(payload).digest('hex').slice(0, 12)
}

// ---------------------------------------------------------------------------
// Core generation logic (extracted for reuse)
// ---------------------------------------------------------------------------

interface GenerationContext {
  supabase: TypedSupabaseClient
  userId: string
  overview: Awaited<ReturnType<typeof getUserOverview>>
  goals: Awaited<ReturnType<typeof getActiveGoals>>
  weeklyStats: Awaited<ReturnType<typeof getWeeklyStats>>
  streaks: Awaited<ReturnType<typeof getTaskStreaks>>
  timeline: Awaited<ReturnType<typeof getTimelineSummary>>
  traits: Awaited<ReturnType<typeof profileTraitRepository.getByUser>>
  existingNotes: Awaited<ReturnType<typeof timelineNoteRepository.getByUser>>
  modelId: AiModelId
  dataHash: string
  accountAgeDays: number
}

async function generateAndPersist(ctx: GenerationContext): Promise<ObservationNode[]> {
  const {
    supabase,
    userId,
    overview,
    goals,
    weeklyStats,
    streaks,
    timeline,
    traits,
    existingNotes,
    modelId,
    dataHash,
    accountAgeDays,
  } = ctx

  // --- Build system prompt (with P1 improvements) ---

  // 1-D: Account age style guidance
  let styleHint: string
  if (accountAgeDays < 7) {
    styleHint =
      '사용자가 앱을 시작한 지 얼마 안 됐습니다. 사실 위주로, 탐색적인 톤으로 관찰해주세요. 패턴 분석보다는 현재 설정한 것들을 알아차려주세요.'
  } else if (accountAgeDays < 30) {
    styleHint =
      '사용자가 2~4주 정도 사용했습니다. 초기 패턴이 보이기 시작하는 시점입니다. 관찰에 조심스러운 패턴 언급을 섞어주세요.'
  } else if (accountAgeDays < 90) {
    styleHint =
      '사용자가 한 달 이상 사용했습니다. 패턴 기반 관찰을 중심으로, 변화의 흐름을 짚어주세요.'
  } else {
    styleHint =
      '사용자가 3개월 이상 함께했습니다. 서사적인 톤으로, 과거와 현재를 연결하는 관찰을 해주세요. 여정의 맥락을 활용합니다.'
  }

  const systemPrompt = `당신은 inu(이누) 앱의 AI 동행자 '이누'입니다.
사용자의 타임라인 데이터를 분석하여 타임라인에 자연스럽게 섞이는 관찰과 질문을 생성합니다.

${CORE_PRINCIPLES}
${SECURITY_PRINCIPLES}

[이누의 성격]
- 사용자 곁을 걷는 동행자입니다. 코치나 분석가가 아닙니다.
- 가끔 이누 자신의 시점을 표현해도 됩니다. (예: "이누도 이 부분이 궁금했어요", "같이 지켜보고 있었는데")
- 상태 변경의 감정적 맥락을 고려하세요. 일시정지는 실패가 아니라 자기 이해일 수 있고, 완료는 단순 체크가 아니라 여정의 한 구간 마무리입니다.
- 데이터에서 읽히는 흐름뿐 아니라, 그 뒤에 있을 사용자의 감정과 맥락도 헤아려주세요.

[사용자 맥락]
- 앱 사용 기간: ${accountAgeDays}일
- ${styleHint}

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

  // --- Build user prompt with sanitized data ---
  const safeOverview = sanitizeContext(overview)
  const safeGoals = sanitizeContext(goals)
  const safeWeeklyStats = sanitizeContext(weeklyStats)
  const safeStreaks = sanitizeContext(streaks)
  const safeTimeline = sanitizeContext(timeline)

  const traitSummary =
    traits.length > 0
      ? traits.map((t) => `- ${sanitizeUserText(t.label)}: ${sanitizeUserText(t.value)}`).join('\n')
      : '(프로필 항목 없음)'

  // 1-A: Include note CONTENT, not just keys
  const notesSummary =
    existingNotes.length > 0
      ? existingNotes
          .map((n) => {
            const key = sanitizeUserText(n.observation_key)
            const content = sanitizeUserText(n.content)
            return `- ${key}: "${content}"`
          })
          .join('\n')
      : '(없음)'

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

[사용자가 이전 관찰/질문에 남긴 응답]
${notesSummary}
</user_data>

위 데이터를 분석하여 타임라인에 삽입할 관찰/질문 노드 3~5개를 JSON으로 반환해주세요.
사용자가 이전에 남긴 응답이 있다면, 그 내용을 자연스럽게 이어가거나 참조해주세요.`

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

  // Persist to DB
  await aiObservationRepository.upsert(supabase, userId, enrichedNodes, dataHash)

  return enrichedNodes
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function enrichCachedNodes(
  cachedNodes: ObservationNode[],
  existingNotes: Awaited<ReturnType<typeof timelineNoteRepository.getByUser>>
): ObservationNode[] {
  const noteMap = new Map(existingNotes.map((n) => [n.observation_key, n]))
  return cachedNodes.map((node) => {
    const note = noteMap.get(node.id)
    return {
      ...node,
      userResponse: note?.content ?? null,
      respondedAt: note?.created_at ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// Background refresh — extracted to avoid duplication (I1 fix)
// Uses after() from next/server for serverless safety (C1 fix)
// ---------------------------------------------------------------------------

interface BackgroundRefreshParams {
  supabase: TypedSupabaseClient
  userId: string
  cachedHash: string | null
  existingNotes: Awaited<ReturnType<typeof timelineNoteRepository.getByUser>>
  accountAgeDays: number
  profile: Awaited<ReturnType<typeof profileRepository.get>>
}

async function backgroundRefresh(params: BackgroundRefreshParams): Promise<void> {
  const { supabase, userId, cachedHash, existingNotes, accountAgeDays, profile } = params

  // Fetch core data for hash comparison
  const [overview, goals, streaks, traits] = await Promise.all([
    getUserOverview(supabase, userId),
    getActiveGoals(supabase, userId),
    getTaskStreaks(supabase, userId),
    profileTraitRepository.getByUser(supabase, userId),
  ])

  const currentHash = computeDataHash(overview, goals, streaks, traits.length, existingNotes.length)

  // Skip regeneration if data hasn't changed
  if (cachedHash && currentHash === cachedHash) return

  // Data changed — fetch remaining context and regenerate
  const [weeklyStats, timeline] = await Promise.all([
    getWeeklyStats(supabase, userId),
    getTimelineSummary(supabase, userId),
  ])

  const modelId = (profile?.ai_model as AiModelId) ?? DEFAULT_MODEL
  await generateAndPersist({
    supabase,
    userId,
    overview,
    goals,
    weeklyStats,
    streaks,
    timeline,
    traits,
    existingNotes,
    modelId,
    dataHash: currentHash,
    accountAgeDays,
  })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = authRoute(
  'ai.timeline-observations',
  async (ctx): Promise<NextResponse> => {
    try {
      // Fetch cached observations + notes + profile + hidden set in parallel
      const [cached, existingNotes, profile, hiddenSet] = await Promise.all([
        aiObservationRepository.getByUser(ctx.supabase, ctx.user.id),
        timelineNoteRepository.getByUser(ctx.supabase, ctx.user.id),
        profileRepository.get(ctx.supabase, ctx.user.id),
        hiddenTimelineRepository.getByUser(ctx.supabase, ctx.user.id),
      ])

      const accountAgeDays = profile?.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // --- Fast path: return cached observations immediately ---
      if (cached) {
        const cachedNodes = cached.nodes as ObservationNode[]

        // Always re-enrich with latest note responses (user may have responded since cache)
        const enrichedNodes = enrichCachedNodes(cachedNodes, existingNotes).filter(
          (node) => !hiddenSet.has(`ai-${node.id}`)
        )

        // Schedule background refresh via after() — keeps serverless runtime alive (C1 fix)
        after(async () => {
          try {
            await backgroundRefresh({
              supabase: ctx.supabase,
              userId: ctx.user.id,
              cachedHash: cached.data_hash,
              existingNotes,
              accountAgeDays,
              profile,
            })
          } catch (err) {
            console.error('[ai-timeline-observations] background refresh failed:', err)
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            nodes: enrichedNodes,
            generated_at: cached.generated_at,
          },
        })
      }

      // --- Cold start: no cache, generate synchronously ---
      const [overview, goals, weeklyStats, streaks, timeline, traits] = await Promise.all([
        getUserOverview(ctx.supabase, ctx.user.id),
        getActiveGoals(ctx.supabase, ctx.user.id),
        getWeeklyStats(ctx.supabase, ctx.user.id),
        getTaskStreaks(ctx.supabase, ctx.user.id),
        getTimelineSummary(ctx.supabase, ctx.user.id),
        profileTraitRepository.getByUser(ctx.supabase, ctx.user.id),
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
      const dataHash = computeDataHash(
        overview,
        goals,
        streaks,
        traits.length,
        existingNotes.length
      )

      const enrichedNodes = await generateAndPersist({
        supabase: ctx.supabase,
        userId: ctx.user.id,
        overview,
        goals,
        weeklyStats,
        streaks,
        timeline,
        traits,
        existingNotes,
        modelId,
        dataHash,
        accountAgeDays,
      })

      const visibleNodes = enrichedNodes.filter((node) => !hiddenSet.has(`ai-${node.id}`))

      return NextResponse.json({
        success: true,
        data: {
          nodes: visibleNodes,
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
