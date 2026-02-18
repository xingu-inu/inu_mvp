import type {
  AiContext,
  AiBrainDumpRequest,
  AiRoadmapDiagnosisRequest,
  AiTaskSuggestRequest,
  AiPriorityRankRequest,
  AiReviewInsightRequest,
  AiGenerateRequest,
} from './types'
import { sanitizeUserText } from './sanitize'

function buildContextBlock(context: AiContext): string {
  const parts: string[] = []
  if (context.direction) parts.push(`나의 방향: "${sanitizeUserText(context.direction)}"`)
  if (context.areaName) parts.push(`영역: ${sanitizeUserText(context.areaName)}`)
  if (context.areaWhy) parts.push(`영역의 이유: ${sanitizeUserText(context.areaWhy)}`)
  if (context.goalName) parts.push(`목표: ${sanitizeUserText(context.goalName)}`)
  if (context.goalWhy) parts.push(`목표의 이유: ${sanitizeUserText(context.goalWhy)}`)
  if (context.groupName) parts.push(`현재 그룹: ${sanitizeUserText(context.groupName)}`)
  if (context.groupDescription) parts.push(`그룹 설명: ${sanitizeUserText(context.groupDescription)}`)
  if (context.existingGoals?.length) {
    parts.push(`이미 있는 목표: ${context.existingGoals.map(sanitizeUserText).join(', ')}`)
  }
  if (context.existingGroups?.length) {
    parts.push(`이미 있는 그룹: ${context.existingGroups.map(sanitizeUserText).join(', ')}`)
  }
  if (context.existingTasks?.length) {
    parts.push(`이미 있는 할 일: ${context.existingTasks.map(sanitizeUserText).join(', ')}`)
  }
  return `<user_data>\n${parts.join('\n')}\n</user_data>`
}

function buildBrainDumpPrompt(request: AiBrainDumpRequest): string {
  const existingAreasBlock = request.context.existingAreas
    .map((a) => `- ${a.emoji} ${a.name} (id: ${a.id}, type: ${a.type}, color: ${a.color})`)
    .join('\n')

  const existingGoalsBlock =
    request.context.existingGoals.length > 0
      ? `이미 있는 목표: ${request.context.existingGoals.join(', ')}`
      : '아직 목표가 없습니다.'

  return `사용자가 자유롭게 적은 생각과 아이디어를 분석하고, inu 앱의 구조(영역 → 목표 → 할 일)로 정리해주세요.

규칙:
1. 사용자 입력이 기존 영역에 해당하면 반드시 해당 영역에 배치하세요. isExisting: true, existingAreaId에 기존 id를 반드시 넣으세요. 기존 영역의 emoji와 color를 그대로 사용하세요.
2. 기존 영역에 맞지 않는 내용만 새 영역을 만드세요.
3. 이미 있는 목표와 겹치는 내용은 제외하세요.
4. 각 목표에는 구체적이고 반복 가능한 할 일(Task)을 1-3개 제안하세요.
5. 최대 5개 영역, 영역당 최대 3개 목표, 목표당 최대 3개 할 일로 제한하세요.
6. 할 일의 repeat_type은 "daily", "weekdays", "weekly" 중 하나.
7. duration_minutes는 5, 10, 15, 30, 45, 60 중 하나.
8. time_slot은 "dawn", "morning", "afternoon", "evening", "anytime" 중 하나.
9. 새 영역의 type은 "health", "career", "finance", "relationships", "hobbies", "mental", "learning", "daily", "custom" 중 하나.
10. summary에 정리 결과를 한 문장으로 요약해주세요.
11. why 필드는 한 문장(30자 이내)으로 간결하게 작성하세요.
12. 전체 응답을 간결하게 유지하세요.

<user_data>
${request.context.direction ? `나의 방향: "${request.context.direction}"` : ''}

기존 영역:
${existingAreasBlock || '없음'}

${existingGoalsBlock}
</user_data>

사용자 입력:
<user_input>
${sanitizeUserText(request.input)}
</user_input>

JSON 형식으로 반환:
{
  "type": "brain-dump",
  "summary": "3개 영역, 5개 목표로 정리했어요",
  "organizedItems": [
    {
      "name": "영역 이름",
      "emoji": "💪",
      "color": "#22c55e",
      "type": "health",
      "isExisting": true,
      "existingAreaId": "uuid-here",
      "goals": [
        {
          "name": "목표 이름",
          "why": "이 목표를 왜 달성하고 싶은가",
          "tasks": [
            {
              "name": "할 일 이름",
              "why": "이 행동이 효과적인 이유",
              "repeat_type": "daily",
              "duration_minutes": 30,
              "time_slot": "morning"
            }
          ]
        }
      ]
    }
  ]
}`
}

function buildDiagnosisContextBlock(request: AiRoadmapDiagnosisRequest): string {
  const { context } = request
  const parts: string[] = []

  if (context.direction) {
    parts.push(`나의 방향: "${sanitizeUserText(context.direction)}"`)
  }

  if (context.areas.length > 0) {
    parts.push(
      `영역 목록:\n${context.areas
        .map(
          (a) =>
            `- ${a.emoji} ${sanitizeUserText(a.name)} (id: ${a.id}, type: ${a.type}${a.why ? `, why: "${sanitizeUserText(a.why)}"` : ', why: 없음'})`
        )
        .join('\n')}`
    )
  }

  if (context.goals.length > 0) {
    parts.push(
      `목표 목록:\n${context.goals
        .map(
          (g) =>
            `- ${sanitizeUserText(g.name)} (id: ${g.id}, areaId: ${g.areaId}, status: ${g.status}${g.why ? `, why: "${sanitizeUserText(g.why)}"` : ', why: 없음'}${g.targetDate ? `, 기한: ${g.targetDate}` : ''}, 그룹: ${g.groupCount}개, 할일: ${g.taskCount}개)`
        )
        .join('\n')}`
    )
  }

  if (context.tasks.length > 0) {
    parts.push(
      `할 일 목록:\n${context.tasks
        .map(
          (t) =>
            `- ${sanitizeUserText(t.name)} (id: ${t.id}, goalId: ${t.goalId}, ${t.repeatType}, ${t.timeSlot}, ${t.durationMinutes}분${t.why ? `, why: "${sanitizeUserText(t.why)}"` : ', why: 없음'}, 스트릭: ${t.streakCount})`
        )
        .join('\n')}`
    )
  }

  const { stats } = context
  parts.push(
    `통계:
- 전체 영역: ${stats.totalAreas}개
- 전체 목표: ${stats.totalGoals}개 (Active: ${stats.activeGoals}, Backlog: ${stats.backlogGoals})
- 전체 할 일: ${stats.totalTasks}개
- Why 없는 영역: ${stats.areasWithoutWhy}개
- Why 없는 목표: ${stats.goalsWithoutWhy}개
- Why 없는 할 일: ${stats.tasksWithoutWhy}개
- 할 일 없는 목표: ${stats.goalsWithoutTasks}개
- 목표당 평균 할 일: ${stats.avgTasksPerGoal}개`
  )

  return `<user_data>\n${parts.join('\n\n')}\n</user_data>`
}

function buildRoadmapDiagnosisPrompt(request: AiRoadmapDiagnosisRequest): string {
  const contextBlock = buildDiagnosisContextBlock(request)

  const observationGuide: Record<string, string> = {
    full: `관찰 테마 (반드시 이 5개를 observations로 사용):
1. id: "area-balance", title: "영역 균형", emoji: "⚖️" — 영역이 골고루 구성되어 있는지, 어떤 영역에 에너지가 집중되어 있는지
2. id: "why-chain", title: "Why Chain", emoji: "🔗" — 각 레벨의 Why가 연결되어 있는지, 동기 부여 맥락이 잘 갖춰져 있는지
3. id: "goal-feasibility", title: "목표 현실성", emoji: "🎯" — Active 목표 수가 적절한지, 기한 설정이 되어 있는지
4. id: "task-design", title: "실천 설계", emoji: "📋" — Task가 구체적이고 반복 가능한지, 적절한 수인지
5. id: "momentum", title: "실천 동력", emoji: "🔥" — 스트릭, 실제 실천 상태, 꾸준함의 흐름`,

    area: `관찰 테마 (반드시 이 4개를 observations로 사용):
1. id: "goal-composition", title: "목표 구성", emoji: "🎯" — 이 영역의 목표가 잘 구성되어 있는지, Active/Backlog 균형
2. id: "why-completeness", title: "Why 완성도", emoji: "🔗" — 목표와 할 일의 Why가 채워져 있는지
3. id: "task-design", title: "실천 설계", emoji: "📋" — Task가 구체적이고 반복 가능한지
4. id: "momentum", title: "실천 동력", emoji: "🔥" — 스트릭, 실제 실천 상태`,

    goal: `관찰 테마 (반드시 이 4개를 observations로 사용):
1. id: "structure", title: "구조 살펴보기", emoji: "🏗️" — 그룹과 할 일이 잘 나뉘어 있는지
2. id: "why-completeness", title: "Why 완성도", emoji: "🔗" — 목표와 할 일의 Why가 채워져 있는지
3. id: "task-design", title: "실천 설계", emoji: "📋" — 각 Task가 잘 설계되어 있는지
4. id: "momentum", title: "실천 동력", emoji: "🔥" — 스트릭, 실천 현황`,
  }

  const scopeLabel: Record<string, string> = {
    full: '전체 로드맵',
    area: '특정 영역',
    goal: '특정 목표',
  }

  return `사용자의 ${scopeLabel[request.scope]}을 함께 살펴보고, 성장을 위한 관찰과 제안을 해주세요.

톤 & 철학:
- "함께 살펴보기" 동반자 톤: 평가하거나 채점하는 것이 아닙니다. 점수를 매기지 마세요.
- "죄책감 없음": 절대 비난하지 마세요. "아직 ~하지 않았어요", "~하면 더 좋을 것 같아요" 형태를 사용하세요.
- 성장 마인드셋: 잘하고 있는 점을 먼저 발견하고, 개선점은 부드럽고 건설적으로 전달하세요.

규칙:
1. summary: 반드시 긍정적 관찰로 시작하세요. emoji 기준:
   - 시작 단계이거나 데이터가 적을 때 → emoji: "🌱", label: "한 걸음씩 만들어가고 있어요"
   - 기본 구조가 갖춰져 있을 때 → emoji: "🌿", label: "기본이 잡혀가고 있어요"
   - 잘 구성되어 있을 때 → emoji: "🌳", label: "잘 구성되어 있어요"
   - 훌륭할 때 → emoji: "✨", label: "훌륭하게 만들어가고 있어요"
   description은 1-2문장으로, 긍정적 관찰로 시작하세요.
2. strengths: 최소 2개, 최대 4개. 데이터에 기반한 구체적 칭찬만 (빈 칭찬 금지). 각 항목에 적절한 이모지를 사용하세요.
3. observations: 각 테마별 description 1줄 + findings 2-4개. findings 텍스트는 부드럽고 건설적으로 작성하세요.
4. nextSteps: 1-3개, 가장 임팩트가 큰 것부터 순서대로. 구체적이고 바로 실행 가능한 제안.
5. action의 targetId, targetName은 반드시 아래 컨텍스트에 있는 실제 엔티티 ID와 이름을 사용하세요. 임의로 만들지 마세요.
6. action이 불필요한 곳에는 action 필드를 생략하세요.
7. action.type은 "add-why", "pause-goal", "activate-goal", "add-task", "set-deadline", "add-goal", "none" 중 하나.

${observationGuide[request.scope]}

${contextBlock}

JSON 형식으로 반환:
{
  "type": "roadmap-diagnosis",
  "scope": "${request.scope}",${request.targetId ? `\n  "targetName": "대상 이름",` : ''}
  "summary": {
    "emoji": "🌿",
    "label": "기본이 잡혀가고 있어요",
    "description": "긍정적 관찰로 시작하는 1-2문장 요약"
  },
  "strengths": [
    { "emoji": "💪", "text": "데이터 기반 구체적 칭찬" },
    { "emoji": "🔗", "text": "또 다른 구체적 칭찬" }
  ],
  "observations": [
    {
      "id": "테마 id",
      "title": "테마 제목",
      "emoji": "🔗",
      "description": "이 테마에 대한 1줄 요약",
      "findings": [
        {
          "text": "부드럽고 건설적인 발견 내용",
          "action": {
            "type": "add-why",
            "targetType": "goal",
            "targetId": "실제 엔티티 UUID",
            "targetName": "실제 엔티티 이름",
            "label": "버튼 레이블"
          }
        },
        {
          "text": "action이 불필요하면 action 필드 생략"
        }
      ]
    }
  ],
  "nextSteps": [
    {
      "text": "가장 임팩트 큰 다음 행동",
      "action": {
        "type": "add-task",
        "targetType": "goal",
        "targetId": "실제 엔티티 UUID",
        "targetName": "실제 엔티티 이름",
        "label": "버튼 레이블"
      }
    },
    {
      "text": "action 없는 다음 행동 제안"
    }
  ]
}`
}

function buildTaskSuggestPrompt(request: AiTaskSuggestRequest): string {
  const { context } = request
  const parts: string[] = []

  if (context.direction) {
    parts.push(`나의 방향: "${sanitizeUserText(context.direction)}"`)
  }

  if (context.areas.length > 0) {
    parts.push(
      `영역 목록:\n${context.areas
        .map(
          (a) =>
            `- ${a.emoji} ${sanitizeUserText(a.name)} (id: ${a.id}, type: ${a.type}${a.why ? `, why: "${sanitizeUserText(a.why)}"` : ''})`
        )
        .join('\n')}`
    )
  }

  if (context.goals.length > 0) {
    parts.push(
      `목표 목록:\n${context.goals
        .map(
          (g) =>
            `- ${g.areaEmoji} ${sanitizeUserText(g.name)} (id: ${g.id}, areaId: ${g.areaId}, status: ${g.status}${g.why ? `, why: "${sanitizeUserText(g.why)}"` : ''})`
        )
        .join('\n')}`
    )
  }

  if (context.existingTasks.length > 0) {
    parts.push(`이미 있는 할 일:\n${context.existingTasks.map((t) => `- ${sanitizeUserText(t.name)}`).join('\n')}`)
  }

  const contextBlock = `<user_data>\n${parts.join('\n\n')}\n</user_data>`

  return `사용자의 로드맵을 분석하고, 목표 달성에 도움이 될 새로운 할 일(Task)을 제안해주세요.

톤 & 철학:
- "함께 만들어가기" 동반자 톤. 강요하지 마세요.
- "죄책감 없음": 절대 비난하지 마세요.
- 성장 마인드셋: 긍정적이고 실현 가능한 제안만 하세요.

규칙:
1. 이미 있는 할 일과 절대 중복하지 마세요.
2. 각 제안 Task는 반드시 기존 목표(goalId) 중 하나에 매핑하세요.
3. 목표가 없는 일상 할일은 goalId를 null로, goalName을 "일상"으로 설정하세요.
4. 목표별로 1-3개씩, 총 3-8개의 할 일을 제안하세요.
5. duration_minutes는 5, 10, 15, 30, 45, 60 중 하나.
6. time_slot은 "dawn", "morning", "afternoon", "evening", "anytime" 중 하나.
7. why 필드는 한 문장(30자 이내)으로 간결하게.
8. summary에 제안 결과를 한 문장으로 요약해주세요.
9. goalId는 반드시 아래 목표 목록의 실제 UUID를 사용하세요. 임의로 만들지 마세요.

${contextBlock}

JSON 형식으로 반환:
{
  "type": "task-suggest",
  "summary": "3개 목표에 5개 할일을 제안합니다",
  "suggestions": [
    {
      "goalId": "실제 목표 UUID 또는 null",
      "goalName": "목표 이름",
      "areaEmoji": "💪",
      "areaId": "실제 영역 UUID",
      "tasks": [
        {
          "name": "할 일 이름",
          "why": "이 행동이 효과적인 이유",
          "duration_minutes": 30,
          "time_slot": "morning"
        }
      ]
    }
  ]
}`
}

function buildPriorityRankPrompt(request: AiPriorityRankRequest): string {
  const { context } = request
  const parts: string[] = []

  if (context.direction) {
    parts.push(`나의 방향: "${sanitizeUserText(context.direction)}"`)
  }

  if (context.areas.length > 0) {
    parts.push(
      `영역 목록:\n${context.areas
        .map((a) => `- ${a.emoji} ${sanitizeUserText(a.name)} (id: ${a.id}${a.why ? `, why: "${sanitizeUserText(a.why)}"` : ''})`)
        .join('\n')}`
    )
  }

  if (context.goals.length > 0) {
    parts.push(
      `목표 목록:\n${context.goals
        .map(
          (g) =>
            `- ${sanitizeUserText(g.name)} (id: ${g.id}, areaId: ${g.areaId}, status: ${g.status}${g.why ? `, why: "${sanitizeUserText(g.why)}"` : ''}${g.targetDate ? `, 기한: ${g.targetDate}` : ''}, 할일: ${g.taskCount}개)`
        )
        .join('\n')}`
    )
  }

  if (context.allActiveTasks.length > 0) {
    parts.push(
      `전체 활성 할 일 (${context.allActiveTasks.length}개):\n${context.allActiveTasks
        .map(
          (t) =>
            `- ${sanitizeUserText(t.name)} (id: ${t.id}, goalId: ${t.goalId || 'null'}, ${t.areaEmoji || '📌'} ${t.goalName ? sanitizeUserText(t.goalName) : '일상'}, ${t.repeatType}, ${t.timeSlot}, ${t.durationMinutes}분, 스트릭: ${t.streakCount}${t.why ? `, why: "${sanitizeUserText(t.why)}"` : ''})`
        )
        .join('\n')}`
    )
  }

  const contextBlock = `<user_data>\n${parts.join('\n\n')}\n</user_data>`

  return `사용자의 인생 로드맵(목표와 할 일)을 분석하고, Goal 단위로 우선순위를 3단계로 정리해주세요.

톤 & 철학:
- "함께 정리하기" 동반자 톤. 판단하거나 비난하지 마세요.
- "죄책감 없음": 3순위도 "중요하지 않은 것"이 아니라 "여유 있을 때" 돌아볼 것입니다.
- 성장 마인드셋: 잘하고 있는 부분을 인정하면서 정리해주세요.

평가 프로세스:
1단계: Goal 수준 평가 — 먼저 각 Goal(목표)을 아래 기준으로 평가하여 tier를 결정합니다.
2단계: Task 배치 — 각 Goal 안의 Task(할 일)를 해당 Goal의 tier에 배치합니다.
3단계: 일상 할 일 — goalId가 null인 Task는 "일상"이라는 가상 Goal 아래 묶어서 적절한 tier에 배치합니다.

우선순위 기준 (가중치 순):

[높은 가중치]
- 가치 정렬 (Value Alignment): Direction/Why Chain과 얼마나 강하게 연결되어 있는가. Why가 명확하고 Direction까지 이어지는 Goal → 높은 순위.
- 임팩트/노력 비율 (Impact/Effort): 적은 시간 투자로 큰 성과. 매일 짧은 습관이 장기적으로 복리 효과를 만드는 경우 높게 평가.

[중간 가중치]
- 연쇄 효과 (Ripple Effect): 기반이 되는 활동(운동→에너지→모든 것). 한 Task가 여러 Goal에 간접적으로 기여하는 경우.
- 모멘텀 보호 (Momentum): 높은 스트릭을 보호. 긍정적 추세를 유지하는 것이 중요.

[낮은 가중치]
- 기한/긴급성 (Urgency): 기한이 다가오는 목표. 단, 긴급하다고 반드시 1순위는 아님 — 가치 정렬이 낮으면 2순위도 가능.

분류 결과:
- Tier 1 "지금 집중할 것" (🔥): 가치 정렬 높음 + 임팩트/노력 비율 높음. 또는 연쇄 효과가 큰 기반 활동.
- Tier 2 "이번 주 중요" (📌): 가치 정렬 보통, 꾸준히 진행해야 할 것. 모멘텀 유지가 필요한 것.
- Tier 3 "여유 있을 때" (🌿): 보조적 활동, 새로 시작한 것, 탐색 중인 것. 여유 시간에 돌아볼 것.

규칙:
1. 반드시 3개 tier로 분류하세요 (tier: 1, 2, 3).
2. 각 tier에 최소 1개 이상의 Goal이 있어야 합니다.
3. Goal 안의 tasks 배열에 해당 Goal에 속하는 모든 활성 Task를 포함하세요.
4. taskId와 goalId는 반드시 아래 목록의 실제 UUID를 사용하세요. 절대 임의로 만들지 마세요.
5. goalId가 null인 Task(일상 할 일)는 goalId: null, goalName: "일상"인 가상 Goal로 묶으세요.
6. 각 Goal에 goalReason(이 Goal이 이 tier인 이유)을 1문장으로 작성하세요.
7. 각 Task에 reason(이 task가 중요한 이유)을 1문장으로 작성하세요.
8. summary에 정리 결과를 한 문장으로 요약하세요.
9. insight에 전략적 관찰(영역 균형, 에너지 배분, 연쇄 효과 등)을 한 문장으로 작성하세요.
10. 영역 다양성을 고려하세요 — Tier 1에 한 영역의 Goal만 몰리지 않게 분배하세요.
11. areaEmoji와 areaName은 해당 Goal이 속한 Area의 정보를 사용하세요.

${contextBlock}

JSON 형식으로 반환:
{
  "type": "priority-rank",
  "summary": "N개 목표를 3단계로 정리했어요",
  "tiers": [
    {
      "tier": 1,
      "label": "지금 집중할 것",
      "emoji": "🔥",
      "goals": [
        {
          "goalId": "실제 목표 UUID 또는 null",
          "goalName": "목표 이름 또는 '일상'",
          "areaEmoji": "💪",
          "areaName": "영역 이름",
          "goalReason": "이 Goal이 이 tier인 이유 (1문장)",
          "tasks": [
            {
              "taskId": "실제 할 일 UUID",
              "taskName": "할 일 이름",
              "reason": "이 task가 중요한 이유 (1문장)"
            }
          ]
        }
      ]
    },
    {
      "tier": 2,
      "label": "이번 주 중요",
      "emoji": "📌",
      "goals": [...]
    },
    {
      "tier": 3,
      "label": "여유 있을 때",
      "emoji": "🌿",
      "goals": [...]
    }
  ],
  "insight": "전략적 관찰 한 문장"
}`
}

function buildReviewInsightPrompt(request: AiReviewInsightRequest): string {
  const ctx = request.context
  const moodTrendStr = ctx.moodTrend.map((m) => `${m.date}: ${m.mood}`).join(', ')
  const streakStr = ctx.topStreaks.map((s) => `${s.taskName}(${s.areaName}): ${s.count}일`).join(', ')
  const areaStr = ctx.areaBalances.map((a) => `${a.areaName}: ${a.completionRate}%`).join(', ')

  const reflectionStr = ctx.weeklyReflection
    ? `\n사용자 회고: 자랑스러운 점="${ctx.weeklyReflection.highlight || '없음'}", 어려웠던 점="${ctx.weeklyReflection.challenge || '없음'}", 다음 다짐="${ctx.weeklyReflection.next_focus || '없음'}"`
    : ''

  return `당신은 inu 앱의 AI 어드바이저입니다. 사용자의 ${ctx.period === 'week' ? '주간' : '월간'} 실천 데이터를 분석해주세요.

## 원칙
- "no guilt" 철학: 절대 비난하지 않음. 못한 것보다 한 것에 집중
- 데이터에 근거한 구체적 패턴만 언급 (빈말 금지)
- 실천 가능한 작은 제안 위주
- 따뜻하지만 현실적인 톤

## 데이터
- 기간: ${ctx.periodLabel}
- 실천율: ${ctx.completionRate}% (${ctx.activeDays}/${ctx.totalDays}일 활동)
- 평균 기분: ${ctx.avgMoodLabel}
- 기분 추이: ${moodTrendStr || '기록 없음'}
- 활성 스트릭: ${streakStr || '없음'}
- 영역별 실천율: ${areaStr || '없음'}${reflectionStr}

## 응답 형식 (JSON)
{
  "type": "review-insight",
  "patterns": [
    { "emoji": "📊", "text": "데이터에서 발견한 패턴 설명" }
  ],
  "coaching": [
    { "emoji": "💡", "text": "다음 기간에 시도해볼 구체적 제안" }
  ],
  "encouragement": "마무리 격려 한 문장 (성장 마인드셋)"
}

patterns는 2-3개, coaching은 1-2개로 간결하게.
데이터가 부족하면 억지로 패턴을 만들지 말고 "아직 데이터가 쌓이는 중이에요"라고 솔직하게.`
}

export function buildPrompt(request: AiGenerateRequest): string {
  if (request.type === 'brain-dump') {
    return buildBrainDumpPrompt(request)
  }

  if (request.type === 'roadmap-diagnosis') {
    return buildRoadmapDiagnosisPrompt(request)
  }

  if (request.type === 'task-suggest') {
    return buildTaskSuggestPrompt(request)
  }

  if (request.type === 'priority-rank') {
    return buildPriorityRankPrompt(request)
  }

  if (request.type === 'review-insight') {
    return buildReviewInsightPrompt(request)
  }

  const contextBlock = buildContextBlock(request.context)

  switch (request.type) {
    case 'goal-brainstorm':
      return `사용자의 맥락을 참고해 이 영역에서 달성할 수 있는 구체적인 목표 아이디어를 5개 제안해주세요.
이미 있는 목표와 겹치지 않게 해주세요.
각 제안은 실행 가능하고 구체적이어야 합니다. SMART 기준을 참고하세요.

${contextBlock}

JSON 형식으로 반환:
{
  "type": "goal-brainstorm",
  "suggestions": [
    { "text": "목표 이름", "description": "간단한 설명 (1문장)" }
  ]
}`

    case 'decompose': {
      const targetDesc =
        request.decomposeTarget === 'groups'
          ? '그룹을 3-4개'
          : request.decomposeTarget === 'tasks'
            ? '할 일(반복 실천)을 3-5개'
            : '그룹 2-3개와 각 그룹별 할 일 2-3개를'

      const jsonFormat =
        request.decomposeTarget === 'tasks'
          ? `{
  "type": "decompose",
  "tasks": [
    { "name": "할 일 이름", "why": "이 행동이 효과적인 이유", "repeat_type": "daily", "duration_minutes": 30, "time_slot": "morning" }
  ]
}`
          : request.decomposeTarget === 'groups'
            ? `{
  "type": "decompose",
  "groups": [
    { "name": "그룹 이름", "description": "그룹 설명 (1문장)" }
  ]
}`
            : `{
  "type": "decompose",
  "groups": [
    {
      "name": "그룹 이름",
      "description": "그룹 설명 (1문장)",
      "tasks": [
        { "name": "할 일 이름", "why": "이 행동이 효과적인 이유", "repeat_type": "daily", "duration_minutes": 30, "time_slot": "morning" }
      ]
    }
  ]
}`

      return `이 목표를 달성하기 위한 ${targetDesc} 구성해주세요.
그룹은 목표를 구성하는 단위이고, 할 일은 매일/매주 반복하는 구체적 실천입니다.
할 일의 repeat_type은 "daily", "weekdays", "weekly" 중 하나.
duration_minutes는 5, 10, 15, 30, 45, 60 중 하나.
time_slot은 "dawn", "morning", "afternoon", "evening", "anytime" 중 하나.

${contextBlock}

JSON 형식으로 반환:
${jsonFormat}`
    }

    case 'why-vision': {
      const targetMap: Record<string, string> = {
        'direction-why': '이 인생 방향이 왜 중요한지, 이 방향으로 나아가면 어떤 의미가 있는지',
        'area-why': '이 영역이 내 인생에서 왜 중요한지',
        'goal-why': '이 목표를 왜 달성하고 싶은지, 달성하면 어떤 변화가 있을지',
        'group-why': '이 그룹을 왜 먼저 해야 하는지',
        'task-why': '이 할 일(실천)이 왜 효과적인지',
      }
      const desc = targetMap[request.target] || '이유'

      return `${desc}를 표현하는 문장을 4개 제안해주세요.
사용자의 맥락(Direction, Area, Goal)을 반영해서 개인화된 문장을 만들어주세요.
진부한 표현은 피하고, 구체적이고 와닿는 문장으로 작성해주세요.
각 문장은 1-2문장 이내로 간결하게.

${contextBlock}

JSON 형식으로 반환:
{
  "type": "why-vision",
  "suggestions": [
    { "text": "제안 문장" }
  ]
}`
    }

    case 'review':
      return `이 목표의 현재 구성을 분석하고 개선점을 제안해주세요.
격려하되 현실적으로, 성장 마인드셋으로 작성해주세요.
비난이나 압박은 절대 하지 마세요.
analysis는 2-3문장, suggestions는 2-3개, encouragement는 1문장으로.

${contextBlock}

JSON 형식으로 반환:
{
  "type": "review",
  "analysis": "현재 상태 분석 (2-3문장)",
  "suggestions": [
    { "text": "개선 제안 제목", "description": "구체적 방법 설명" }
  ],
  "encouragement": "격려 메시지 (1문장)"
}`
  }
}
