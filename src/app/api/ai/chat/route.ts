import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { z } from 'zod'
import { authRoute } from '@/lib/security'
import { getModel, DEFAULT_MODEL, type AiModelId } from '@/lib/ai/provider'
import { createChatTools } from '@/lib/ai/tools'
import { CORE_PRINCIPLES, SECURITY_PRINCIPLES } from '@/lib/ai/constants'
import { profileRepository } from '@/repositories/profile.repository'
import { profileTraitRepository } from '@/repositories/profile-trait.repository'
import { directionRepository } from '@/repositories/direction.repository'
import { areaRepository } from '@/repositories/area.repository'
import { sanitizeUserText, getInjectionSeverity, validateAiOutput } from '@/lib/ai/sanitize'
import type { ProfileTrait, Area, Direction } from '@/types/entities'

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

/** Area가 너무 많아 프롬프트가 부풀어오르는 것을 막는 안전 캡. */
const MAX_ROADMAP_AREAS = 20
const MAX_ROADMAP_WHY_LEN = 80

/** 유저가 입력한 why/statement를 프롬프트에 넣기 전에 길이 제한 + 태그 이스케이프. */
function clipForPrompt(text: string | null | undefined, max: number): string | null {
  if (!text) return null
  const sanitized = sanitizeUserText(text).replace(/\s+/g, ' ').trim()
  if (!sanitized) return null
  return sanitized.length > max ? `${sanitized.slice(0, max)}…` : sanitized
}

/**
 * 현재 유저의 Direction + Area 목록을 시스템 프롬프트에 주입 가능한 형태로 포맷.
 * propose_structure에서 isExisting/existingAreaId를 정확히 채우려면 Area ID가 필수.
 * 로드맵 컨텍스트를 선주입해 별도 조회 도구 round-trip을 제거하는 것이 목적.
 * 유저 입력 필드(statement/why/name/emoji)는 모두 sanitizeUserText로 이스케이프.
 */
function buildRoadmapBlock(direction: Direction | null, areas: Area[]): string {
  const statement = clipForPrompt(direction?.statement, 120)
  const directionWhy = clipForPrompt(direction?.why, MAX_ROADMAP_WHY_LEN)
  const directionLine = statement
    ? `방향: ${statement}${directionWhy ? ` (${directionWhy})` : ''}`
    : '방향: (아직 설정 안 됨)'

  const activeAreas = areas.filter((a) => a.is_active).slice(0, MAX_ROADMAP_AREAS)
  const areaLines =
    activeAreas.length === 0
      ? '영역: (아직 없음 — 새 구조 제안 시 isExisting는 항상 false)'
      : `영역 (id는 propose_structure의 existingAreaId로 그대로 사용):\n${activeAreas
          .map((a) => {
            const emoji = clipForPrompt(a.emoji, 8) ?? ''
            const name = clipForPrompt(a.name, 40) ?? '(이름 없음)'
            const why = clipForPrompt(a.why, MAX_ROADMAP_WHY_LEN)
            const parts = [`- ${emoji} ${name}`.trim(), `id=${a.id}`, `type=${a.type}`]
            if (why) parts.push(`why=${why}`)
            return parts.join(' · ')
          })
          .join('\n')}`

  return `[현재 로드맵]\n${directionLine}\n${areaLines}`
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
  source: z.literal('onboarding').optional(),
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

    // Direction은 먼저 받아서 areaRepository.getAll에 넘겨야 내부 getActiveDirectionId() 중복 쿼리가 사라짐.
    const [profile, traits, direction] = await Promise.all([
      profileRepository.get(ctx.supabase, ctx.user.id),
      profileTraitRepository.getByUser(ctx.supabase, ctx.user.id),
      directionRepository.get(ctx.supabase, ctx.user.id),
    ])
    const areas = await areaRepository.getAll(ctx.supabase, ctx.user.id, direction?.id ?? null)
    const userName = profile?.name ?? '사용자'
    const todayDate = new Date().toISOString().split('T')[0]
    const modelId = (profile?.ai_model as AiModelId) ?? DEFAULT_MODEL

    // Build system prompt with optional context hint
    let systemPrompt = buildSystemPrompt(traits, userName, todayDate)

    // 로드맵 스냅샷 선주입 — 모델이 propose_structure 호출 시 바로 existingAreaId를 쓸 수 있음.
    systemPrompt += `\n\n${buildRoadmapBlock(direction, areas)}`

    const { context } = parsed.data

    // 구조 제안 기능 — goal/task 컨텍스트(특정 엔티티 범위)에서는 제외.
    // goal 화면에서 기존 목표를 얘기하는데 새 구조를 제안하면 안 되니까.
    const allowStructureProposal =
      !context || context.type === 'brain-dump' || context.type === 'observation'
    if (allowStructureProposal) {
      systemPrompt += `\n\n[구조 제안 기능]
사용자가 "하고 싶은 것들이 많아", "정리가 필요해", "새로운 목표를 세우고 싶어",
"요즘 이것저것 해보고 싶은 게 많은데" 등 구조 정리가 필요한 의도를 보이면:
1. 위 [현재 로드맵]에서 기존 Area를 확인하세요 (도구 호출 불필요)
2. propose_structure 도구로 바로 구조를 제안하세요
3. 완벽하지 않아도 괜찮아요 — 대화의 출발점으로 먼저 보여주세요
4. 기존 Area에 맞는 목표는 반드시 isExisting: true와 existingAreaId를 설정하세요 (위 id 사용)
5. 카드 내용을 텍스트로 반복하지 마세요 — 짧은 안내 한 문장만 ("이런 느낌은 어때요?")
명시적 쏟아내기 모드가 아니어도 자연스럽게 사용 가능합니다.`
    }

    if (context) {
      if (context.type === 'brain-dump') {
        systemPrompt += `\n\n[대화 맥락 — 쏟아내기 모드]
사용자가 "쏟아내기" 모드로 대화를 시작했습니다. 목표는 **최대한 빨리 초안을 카드로 보여주는 것**.

## 규칙 1 (최우선): 첫 턴에 즉시 propose_structure 호출
사용자가 하고 싶은 것/관심사를 조금이라도 언급하면 **바로 propose_structure**를 호출하세요.
- 긴 서론, 공감 문구, 확인 질문 금지.
- "운동하고 싶어" → 즉시 운동 Area/Goal/Task 제안
- "운동이랑 자기계발" → 즉시 두 영역 동시에 제안 (follow-up 질문 없이)
- "요즘 뭐 해볼까" → 즉시 프로필 trait 기반으로 2-3개 후보 제안
- 완벽하지 않아도 됨. 대화의 출발점이니까요. 사용자가 수정하면서 다듬습니다.
- 예외: 주제가 전혀 없는 인사만 했을 때(예: "안녕") — 그때만 가벼운 한 문장 물어보기.

## 규칙 2 (절대 금지): 카드 내용을 텍스트로 반복하지 말 것
propose_structure가 호출되면 카드가 Area/Goal/Task를 전부 보여줍니다.
텍스트는 **딱 한 문장**, 카드를 소개하는 용도로만 쓰세요.

좋은 예 (카드 옆에 붙이는 텍스트):
- "이런 느낌은 어때요?"
- "우선 초안이에요, 바꾸고 싶은 거 있으면 말해줘요."
- "이걸로 시작해볼까요?"

나쁜 예 (절대 이렇게 하지 말 것):
\`\`\`
사용자님을 위한 로드맵 초안을 만들어 봤어요! '건강'과 '성장'이라는 두 가지 영역으로 나누어 보았답니다.

💪 건강 영역
• 목표: 규칙적인 운동 습관 만들기
  • 이유: 체력 증진과 활력 유지를 위해
  • 할 일: 주 3회 30분 유산소 운동
\`\`\`
↑ 이렇게 카드 내용을 텍스트로 풀어서 적으면 사용자가 **같은 내용을 두 번 읽게 됩니다.** 카드만으로 충분해요. 텍스트는 한 문장.

## 규칙 3: 기존 Area 재사용
${
  areas.filter((a) => a.is_active).length > 0
    ? `위 [현재 로드맵]의 영역 목록을 확인하고, 사용자의 주제에 매칭되는 Area가 있으면 반드시:
- isExisting: true
- existingAreaId: 위 id를 그대로 복사
새 Area를 만들지 말고 기존 Area에 Goal/Task를 추가하세요.`
    : `아직 활성 Area가 없으므로 모든 Area는 isExisting: false로 새로 제안하세요.`
}

## 규칙 4: 수정 요청 시
"여기서 X 빼줘", "Y 추가해줘" 같은 요청이 오면 propose_structure를 **다시 호출**해 반영된 버전을 보여주세요. 이때도 카드 내용을 텍스트로 반복 금지. 한 문장 안내만.

## 도구 사용
- 로드맵 조회 도구는 없습니다. 위 [현재 로드맵]이 이미 전부 담고 있어요.
- 첫 턴에서 호출해야 하는 도구는 propose_structure 하나뿐. 다른 도구 부르지 말 것.`

        if (context.source === 'onboarding') {
          systemPrompt += `\n\n## 특별 지시: 온보딩 직후
사용자가 방금 Direction과 첫 Area를 만들고 바로 이 채팅에 진입했습니다. 위 [현재 로드맵]의 맨 아래에 방금 생성된 Area가 있습니다.
- 사용자가 어떤 주제든 언급하는 즉시 propose_structure를 호출하세요. 추가 질문 금지.
- **반드시 기존 Area 재사용**: 방금 만든 Area(위 [현재 로드맵]에 있음)에 Goal/Task 2-3개를 제안하세요. isExisting: true, existingAreaId는 위 id를 그대로 복사. 새 Area를 만들지 말 것.
- 인삿말은 한 문장만 ("방향 잡혔네요, 여기에 이런 것부터 시작해볼까요?" 류). 카드가 구조를 보여주므로 텍스트로 내용 반복 금지.`
        }
      } else if (context.type === 'observation') {
        systemPrompt += `\n\n[대화 맥락 — 타임라인 관찰에서 시작]
사용자가 타임라인에서 이누의 다음 관찰을 보고 대화를 시작했습니다:
"${sanitizeUserText(context.message)}"

이 관찰에 대해 자연스럽게 대화를 이어가세요.
- 관찰 내용을 반복하지 말고, 사용자가 이 주제에 대해 더 이야기하고 싶어한다고 가정하세요.
- 필요하면 get_active_goals 등의 도구로 관련 데이터를 확인하세요 (로드맵/영역 정보는 위 [현재 로드맵] 참조).${context.relatedGoalId ? `\n- 관련 목표가 있습니다. get_goal_detail 도구를 goal_id="${context.relatedGoalId}"로 호출할 수 있습니다.` : ''}`
      } else {
        const entity =
          context.type === 'goal'
            ? `"${context.goalName}" 목표`
            : `"${context.taskName}" 할 일 (목표: "${context.goalName}")`
        const areaHint = context.areaName ? ` (영역: ${context.areaName})` : ''
        systemPrompt += `\n\n[대화 맥락]\n사용자가 ${entity}${areaHint} 화면에서 이 대화를 시작했습니다.\n이 주제에 대해 이야기하려는 것이니, 필요하면 get_goal_detail 도구를 goal_id="${context.goalId}"로 호출하세요.`
      }
    }

    // 응답 칩 가이드 — 모든 컨텍스트 뒤에 배치 (최신성 편향 활용)
    systemPrompt += `\n\n[필수 — 응답 칩]
매 응답 끝에 반드시 suggest_responses 도구 호출.

multi 필드:
- 사용자가 여러 주제를 동시에 꺼낼 법할 때 (상황 나열, 감정 복합): multi: true
- 결정(반영/저장)·전환(다른 주제) 같은 단일 선택 칩: multi: false 기본

칩 축 (4축 중 서로 다른 축을 섞을 것):
- 탐색: 더 말하기 → "내 상황 더 말할게", "다른 각도로"
- 전개: 실험/샘플 → "비슷한 사례", "1주일 실험"
- 결정: 반영/저장 → "이대로 반영", "Goal로 만들기"
- 전환: 다른 주제 → "다른 영역으로", "지금은 패스"

모두 수정형("더 가볍게", "다른 종류로")으로만 채우지 말 것.
대화를 계속/확장할 수 있는 칩이 최소 1개는 있어야 함.`

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
      stopWhen: stepCountIs(4),
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
