import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { z } from 'zod'
import { authRoute } from '@/lib/security'
import { getModel, DEFAULT_MODEL, type AiModelId } from '@/lib/ai/provider'
import { createChatTools } from '@/lib/ai/tools'
import { CORE_PRINCIPLES, SECURITY_PRINCIPLES } from '@/lib/ai/constants'
import { profileRepository } from '@/repositories/profile.repository'
import { sanitizeUserText, detectInjectionPatterns, validateAiOutput } from '@/lib/ai/sanitize'

function buildSystemPrompt(userName: string, todayDate: string): string {
  return `당신은 inu(이누) 앱의 AI 동행자 '이누'입니다.

[성격]
- 따뜻하지만 현실적인 친구 같은 톤. 코치가 아니라 동행자.
- 반말은 안 쓰지만 딱딱하지 않은 "~요" 체.
- 데이터에 기반한 구체적 관찰을 먼저, 그 다음에 제안.
- 빈말 금지. "잘하고 계시네요!"보다 "러닝 7일 연속이면 습관이 잡혀가고 있는 거예요" 같이 구체적으로.
- 한 번에 여러 조언 나열보다, 하나의 핵심 관찰 + 후속 질문이 효과적입니다.

${CORE_PRINCIPLES}

[대화 원칙]
- 상황에 맞게 길이를 조절하세요:
  · 인사/가벼운 질문: 1-2문장
  · 데이터 기반 분석: 핵심만 3-5문장
  · 전략 상담: 필요한 만큼 (단, 한 번에 하나의 핵심 포인트)
- 이전 대화 맥락이 있으면 자연스럽게 연결하세요 ("아까 얘기했던 ~", "지난번에 ~").
- 필요 시 이모지를 적절히 사용합니다.
- 질문으로 사용자의 생각을 이끌어냅니다.

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

데이터 활용 원칙:
- 사용자의 실제 데이터를 참고해서 개인화된 답변을 합니다.
- 일반적인 질문이나 인사에는 도구를 호출하지 않습니다.
- 사용자의 목표, 진행 상황, 기분 등에 대해 구체적으로 이야기할 때만 필요한 도구를 호출합니다.
- 여러 도구가 필요한 경우 한 번에 여러 개를 호출할 수 있습니다.
- 도구에서 받은 데이터를 그대로 나열하지 말고, 인사이트와 조언으로 가공해서 전달합니다.

${SECURITY_PRINCIPLES}`
}

const contextSchema = z.object({
  type: z.enum(['goal', 'task']),
  goalId: z.string(),
  goalName: z.string(),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  areaName: z.string().optional(),
})

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

    const profile = await profileRepository.get(ctx.supabase, ctx.user.id)
    const userName = profile?.name ?? '사용자'
    const todayDate = new Date().toISOString().split('T')[0]
    const modelId = (profile?.ai_model as AiModelId) ?? DEFAULT_MODEL

    // Build system prompt with optional context hint
    let systemPrompt = buildSystemPrompt(userName, todayDate)
    const { context } = parsed.data
    if (context) {
      const entity =
        context.type === 'goal'
          ? `"${context.goalName}" 목표`
          : `"${context.taskName}" 할 일 (목표: "${context.goalName}")`
      const areaHint = context.areaName ? ` (영역: ${context.areaName})` : ''
      systemPrompt += `\n\n[대화 맥락]\n사용자가 ${entity}${areaHint} 화면에서 이 대화를 시작했습니다.\n이 주제에 대해 이야기하려는 것이니, 필요하면 get_goal_detail 도구를 goal_id="${context.goalId}"로 호출하세요.`
    }

    // Sanitize user messages for injection detection
    const uiMessages = parsed.data.messages as UIMessage[]
    const lastMessage = uiMessages[uiMessages.length - 1]
    if (lastMessage) {
      const lastText = lastMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')
      if (lastText && detectInjectionPatterns(lastText)) {
        console.warn('[ai-security] Injection pattern detected in /chat request')
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

    return result.toUIMessageStreamResponse() as unknown as NextResponse
  },
  { csrf: true, rateLimit: { limit: 10 } }
)
