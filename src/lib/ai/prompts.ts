import type { AiContext, AiGenerateRequest } from './types'
import { sanitizeUserText } from './sanitize'

function buildContextBlock(context: AiContext): string {
  const parts: string[] = []
  if (context.direction) parts.push(`나의 방향: "${sanitizeUserText(context.direction)}"`)
  if (context.areaName) parts.push(`영역: ${sanitizeUserText(context.areaName)}`)
  if (context.areaWhy) parts.push(`영역의 이유: ${sanitizeUserText(context.areaWhy)}`)
  if (context.goalName) parts.push(`목표: ${sanitizeUserText(context.goalName)}`)
  if (context.goalWhy) parts.push(`목표의 이유: ${sanitizeUserText(context.goalWhy)}`)
  if (context.groupName) parts.push(`현재 그룹: ${sanitizeUserText(context.groupName)}`)
  if (context.groupDescription)
    parts.push(`그룹 설명: ${sanitizeUserText(context.groupDescription)}`)
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

export function buildPrompt(request: AiGenerateRequest): string {
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
