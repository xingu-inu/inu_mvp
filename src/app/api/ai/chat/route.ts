import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { z } from 'zod'
import { authRoute } from '@/lib/security'
import { getModel, DEFAULT_MODEL, type AiModelId } from '@/lib/ai/provider'
import { createChatTools } from '@/lib/ai/tools'
import { CORE_PRINCIPLES, SECURITY_PRINCIPLES } from '@/lib/ai/constants'
import { profileRepository } from '@/repositories/profile.repository'
import { profileTraitRepository } from '@/repositories/profile-trait.repository'
import { sanitizeUserText, getInjectionSeverity, validateAiOutput } from '@/lib/ai/sanitize'
import type { ProfileTrait } from '@/types/entities'

/**
 * Create a transform stream that monitors AI output for sensitive data leakage.
 * If critical patterns are detected mid-stream, it replaces the output with an error.
 */
function createSecureOutputTransform(): TransformStream<Uint8Array, Uint8Array> {
  const textDecoder = new TextDecoder()
  const textEncoder = new TextEncoder()
  let accumulatedText = ''
  let streamBlocked = false
  // Sliding window: keep last 8KB to detect cross-chunk API key patterns
  // without unbounded memory growth or O(n^2) regex cost
  const MAX_BUFFER = 8192

  return new TransformStream({
    transform(chunk, controller) {
      if (streamBlocked) {
        // Stream already blocked, drop remaining chunks
        return
      }

      // Decode and accumulate text from this chunk (sliding window)
      const chunkText = textDecoder.decode(chunk, { stream: true })
      accumulatedText += chunkText
      if (accumulatedText.length > MAX_BUFFER) {
        accumulatedText = accumulatedText.slice(-MAX_BUFFER)
      }

      // Validate accumulated text for critical patterns
      const validation = validateAiOutput(accumulatedText)
      if (!validation.safe) {
        // Critical leak detected — block stream and send error
        streamBlocked = true
        const errorMessage = '죄송합니다. 응답을 생성하지 못했어요. 다시 시도해주세요.'
        controller.enqueue(textEncoder.encode(errorMessage))
        controller.terminate()
        return
      }

      // Safe — pass through the original chunk
      controller.enqueue(chunk)
    },
  })
}

function buildProfileTraitsBlock(traits: ProfileTrait[]): string {
  if (traits.length === 0) {
    return `[사용자 프로필]
- 아직 저장된 프로필 정보가 없습니다. 대화를 통해 천천히 알아가세요.

[프로필 활용 원칙]
- suggest_profile_traits 도구로 프로필 항목을 제안할 수 있습니다:
  · 대화를 통해 사용자에 대해 알게 되면 1-2개만 가볍게.
  · "나에 대해 정리해줘" 요청 시 대화 내용을 분석해 3-7개.
  · 확실하지 않은 정보는 제안하지 않기.
- 프로필 정보가 부족해도 성급히 규정하지 말고, 한 번에 한 가지 질문만 던져서 천천히 알아가세요.`
  }

  const CATEGORY_LABELS: Record<string, string> = {
    identity: '성격 유형',
    stats: '능력/강점',
    interests: '관심사',
    description: '자기 소개',
    habits: '습관/루틴',
    general: '기타 정보',
  }

  const grouped = new Map<string, typeof traits>()
  for (const t of traits.slice(0, 30)) {
    const cat = t.category ?? 'general'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(t)
  }

  const sections = [...grouped.entries()]
    .map(([cat, items]) => {
      const label = CATEGORY_LABELS[cat] ?? cat
      const lines = items
        .map((t) => `  - [id:${t.id}] ${sanitizeUserText(t.label)}: ${sanitizeUserText(t.value)}`)
        .join('\n')
      return `[${label}]\n${lines}`
    })
    .join('\n\n')

  return `[사용자 프로필]
${sections}

[프로필 활용 원칙]
- 인생 방향, 관계, 일, 균형, 불안, 선택처럼 큰 질문이 나오면 이 프로필을 먼저 기준으로 삼으세요.
- 사용자의 삶을 대신 결정하지 말고, 가치와 방향을 더 잘 보도록 돕는 역할을 하세요.
- 너무 많은 해법을 한꺼번에 주지 말고, 다음 한 걸음이나 이번 주의 초점으로 좁혀주세요.
- suggest_profile_traits 도구로 프로필 항목을 제안할 수 있습니다:
  · 대화 중 사용자에 대해 새로운 사실을 자연스럽게 알게 되면 1-2개만 가볍게.
  · "나에 대해 정리해줘" 요청 시 대화 내용을 분석해 3-7개.
  · 이미 있는 프로필 항목과 같은 내용이면 existing_trait_id를 포함해 업데이트 제안.
  · 확실하지 않은 정보는 제안하지 않기. 너무 자주 제안하지 않기.`
}

function buildSystemPrompt(traits: ProfileTrait[], userName: string, todayDate: string): string {
  return `당신은 inu(이누) 앱의 AI 동행자 '이누'입니다.

[성격]
- 따뜻하지만 현실적인 친구 같은 톤. 코치가 아니라 동행자.
- 반말은 안 쓰지만 딱딱하지 않은 "~요" 체.
- 데이터에 기반한 구체적 관찰을 먼저, 그 다음에 제안.
- 빈말 금지. "잘하고 계시네요!"보다 "러닝 7일 연속이면 습관이 잡혀가고 있는 거예요" 같이 구체적으로.
- 한 번에 여러 조언 나열보다, 하나의 핵심 관찰 + 후속 질문이 효과적입니다.
- 사용자의 인생 방향을 대신 정하는 코치가 아니라, 사용자가 자기 삶을 더 선명하게 보도록 돕는 동행자입니다.

${CORE_PRINCIPLES}

[대화 원칙]
- 상황에 맞게 길이를 조절하세요:
  · 인사/가벼운 질문: 1-2문장
  · 데이터 기반 분석: 핵심만 3-5문장
  · 전략 상담: 필요한 만큼 (단, 한 번에 하나의 핵심 포인트)
- 이전 대화 맥락이 있으면 자연스럽게 연결하세요 ("아까 얘기했던 ~", "지난번에 ~").
- 필요 시 이모지를 적절히 사용합니다.
- 질문으로 사용자의 생각을 이끌어냅니다.
- 사용자가 삶의 방향이나 선택을 묻는다면:
  · 먼저 지금 무엇이 중요한지, 무엇이 충돌하는지 정리하세요.
  · 사용자의 가치/시즌/방향에 맞는 선택지를 1-3개만 제시하세요.
  · 마지막에는 "이번 주에 같이 붙잡을 한 가지" 수준으로 좁혀주세요.

[좋은 답변 예시]
사용자: "오늘 러닝 스킵했어"
이누: "오늘은 쉬어가는 날이네요. 12일 스트릭이 끊기긴 했지만, 누적 러닝은 사라지지 않아요. 내일 짧게라도 뛰면 새 스트릭 시작이에요 💪 혹시 특별한 이유가 있었어요?"

사용자: "뭐부터 해야 할지 모르겠어"
이누: "지금 Active 목표가 4개인데, 오늘 할 일 중 아직 안 한 게 3개예요. 건강 영역 러닝이 스트릭 12일째라 이걸 먼저 유지하는 게 어때요? 15분이면 충분하니까요."

사용자: "요즘 다 귀찮아"
이누: "그런 날 있죠. 최근 기분 기록을 보면 이번 주 neutral이 많았네요. 전부 하려고 하기보다, 오늘은 가장 짧은 할 일 하나만 해보는 건 어때요? 작은 완료 하나가 기분을 바꿔주기도 해요."

[나쁜 답변 — 이렇게 하지 마세요]
- "괜찮아요! 쉬는 것도 중요합니다. 무리하지 마세요. 다음에 하면 돼요. 화이팅!" ← 빈말 나열
- "목표를 정리해보는 건 어떨까요? 우선순위를 세워보세요." ← 사용자 데이터 활용 없는 범용 조언
- "잘하고 있어요! 계속 힘내세요!" ← 근거 없는 칭찬

앱 구조: Direction(방향) → Area(영역) → Goal(목표) → Group(그룹) → Task(실천)
핵심 루프: 온보딩 → 로드맵 → 매일 체크인 → 스트릭 → 리뷰

오늘 날짜: ${todayDate}
사용자 이름: ${userName}

${buildProfileTraitsBlock(traits)}

데이터 활용 원칙:
- 사용자의 실제 데이터를 참고해서 개인화된 답변을 합니다.
- 일반적인 질문이나 인사에는 도구를 호출하지 않습니다.
- 사용자의 목표, 진행 상황, 기분 등에 대해 구체적으로 이야기할 때만 필요한 도구를 호출합니다.
- 여러 도구가 필요한 경우 한 번에 여러 개를 호출할 수 있습니다.
- 도구에서 받은 데이터를 그대로 나열하지 말고, 인사이트와 조언으로 가공해서 전달합니다.

${SECURITY_PRINCIPLES}`
}

const entityContextSchema = z.object({
  type: z.enum(['goal', 'task']),
  goalId: z.string(),
  goalName: z.string(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  areaName: z.string().optional(),
})

const brainDumpContextSchema = z.object({
  type: z.literal('brain-dump'),
})

const observationContextSchema = z.object({
  type: z.literal('observation'),
  message: z.string().max(500),
  nodeId: z.string(),
  relatedGoalId: z.string().optional(),
})

const contextSchema = z.discriminatedUnion('type', [
  entityContextSchema,
  brainDumpContextSchema,
  observationContextSchema,
])

const chatSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).max(50),
  context: contextSchema.optional(),
})

export const POST = authRoute(
  'ai.chat',
  async (ctx): Promise<NextResponse> => {
    const body = await ctx.request.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.' } },
        { status: 400 }
      )
    }

    const [profile, traits] = await Promise.all([
      profileRepository.get(ctx.supabase, ctx.user.id),
      profileTraitRepository.getByUser(ctx.supabase, ctx.user.id),
    ])
    const userName = profile?.name ?? '사용자'
    const todayDate = new Date().toISOString().split('T')[0]
    const modelId = (profile?.ai_model as AiModelId) ?? DEFAULT_MODEL

    // Build system prompt with optional context hint
    let systemPrompt = buildSystemPrompt(traits, userName, todayDate)
    const { context } = parsed.data
    if (context) {
      if (context.type === 'brain-dump') {
        systemPrompt += `\n\n[대화 맥락 — 쏟아내기 모드]
사용자가 "쏟아내기" 모드로 대화를 시작했습니다.

역할: 사용자가 하고 싶은 것들, 목표, 아이디어를 자유롭게 이야기하면 이를 체계적으로 정리해주세요.

진행 방식:
1. 사용자의 이야기를 충분히 들으세요. "더 있어요?" "다른 영역은요?" 등으로 더 끌어내세요.
2. 충분히 모이면 get_user_overview 도구로 기존 구조를 확인하세요.
3. 기존 Area에 맞는 것은 기존 Area에, 새로운 영역은 새 Area로 propose_structure 도구를 호출하세요.
4. 사용자가 수정을 요청하면 반영해서 다시 propose_structure를 호출하세요.

중요:
- 처음부터 구조화하지 마세요. 먼저 자유롭게 이야기하게 하세요.
- 한 번에 너무 많이 만들지 마세요. 핵심부터 시작.
- 기존 Area/Goal과 중복되지 않게 확인하세요.`
      } else if (context.type === 'observation') {
        systemPrompt += `\n\n[대화 맥락 — 타임라인 관찰에서 시작]
사용자가 타임라인에서 이누의 다음 관찰을 보고 대화를 시작했습니다:
"${sanitizeUserText(context.message)}"

이 관찰에 대해 자연스럽게 대화를 이어가세요.
- 관찰 내용을 반복하지 말고, 사용자가 이 주제에 대해 더 이야기하고 싶어한다고 가정하세요.
- 필요하면 get_user_overview, get_active_goals 등의 도구로 관련 데이터를 확인하세요.${context.relatedGoalId ? `\n- 관련 목표가 있습니다. get_goal_detail 도구를 goal_id="${context.relatedGoalId}"로 호출할 수 있습니다.` : ''}`
      } else {
        const entity =
          context.type === 'goal'
            ? `"${context.goalName}" 목표`
            : `"${context.taskName}" 할 일 (목표: "${context.goalName}")`
        const areaHint = context.areaName ? ` (영역: ${context.areaName})` : ''
        systemPrompt += `\n\n[대화 맥락]\n사용자가 ${entity}${areaHint} 화면에서 이 대화를 시작했습니다.\n이 주제에 대해 이야기하려는 것이니, 필요하면 get_goal_detail 도구를 goal_id="${context.goalId}"로 호출하세요.`
      }
    }

    // V-02 FIX: Check ALL user messages for injection, not just the last one
    const uiMessages = parsed.data.messages as unknown as UIMessage[]
    for (const msg of uiMessages) {
      const msgText = msg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')
      if (msgText) {
        const severity = getInjectionSeverity(msgText)
        if (severity === 'critical') {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INJECTION_BLOCKED', message: '해당 요청은 처리할 수 없어요.' },
            },
            { status: 400 }
          )
        }
        if (severity === 'suspicious') {
          console.warn('[ai-security] Suspicious pattern detected in /chat request')
        }
      }
    }

    // Convert messages and sanitize user input
    const modelMessages = await convertToModelMessages(uiMessages)
    const sanitizedMessages = modelMessages.map((msg) => {
      if (msg.role === 'user') {
        return {
          ...msg,
          content:
            typeof msg.content === 'string'
              ? `<user_input>\n${sanitizeUserText(msg.content)}\n</user_input>`
              : msg.content,
        }
      }
      return msg
    })

    const model = getModel(modelId)
    const tools = createChatTools(ctx.supabase, ctx.user.id)

    const result = streamText({
      model,
      system: systemPrompt,
      messages: sanitizedMessages,
      tools,
      stopWhen: stepCountIs(3),
      maxOutputTokens: 2048,
      temperature: 0.7,
      onFinish: ({ text }) => {
        // Validate output for sensitive data leakage (server-side logging)
        if (text) {
          const outputCheck = validateAiOutput(text)
          if (outputCheck.warnings.length > 0) {
            console.warn('[ai-security] Output warnings:', outputCheck.warnings)
          }
        }
      },
    })

    // V-01 FIX: Apply streaming output validation transform
    const response = result.toUIMessageStreamResponse() as unknown as Response

    // Create a secure transform that monitors the stream for critical leaks
    const secureTransform = createSecureOutputTransform()

    // Pipe the response body through the security transform
    const secureBody = response.body?.pipeThrough(secureTransform)

    return new NextResponse(secureBody, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  },
  { csrf: true, rateLimit: { limit: 10 } }
)
