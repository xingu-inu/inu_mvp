import type { UIMessage } from 'ai'
import type { ChatMessage } from '@/types/entities'

/** Convert DB ChatMessage[] to UIMessage[] */
export function toUIMessages(dbMessages: ChatMessage[]): UIMessage[] {
  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    createdAt: new Date(m.created_at),
  }))
}

/** Extract text from UIMessage parts */
export function getMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
    .replace(/[\u2588-\u258F]+$/, '')
}

export const DEFAULT_QUICK_ACTIONS = [
  { label: '이번 주 인사이트', prompt: '이번 주 내 실천에 대해 인사이트를 줘' },
  { label: '목표 제안', prompt: '지금 내 상황에서 추가할만한 새 목표를 제안해줘' },
  { label: '동기 부여', prompt: '오늘 하루 동기 부여가 될 한마디 해줘' },
]

export const GOAL_QUICK_ACTIONS = [
  { label: '진행 상황 분석', prompt: '이 목표의 진행 상황을 분석해줘' },
  { label: '다음 단계 제안', prompt: '이 목표를 위한 다음 단계를 제안해줘' },
  { label: '동기 부여', prompt: '이 목표를 계속할 수 있도록 동기 부여해줘' },
]

export const TASK_QUICK_ACTIONS = [
  { label: '꾸준히 하는 팁', prompt: '이 할 일을 꾸준히 하려면 어떻게 해야 할까?' },
  { label: '시간 활용 조언', prompt: '이 할 일을 더 효과적으로 할 시간 활용법을 알려줘' },
  { label: '대안 제안', prompt: '이 할 일의 대안이나 보완 활동을 제안해줘' },
]

/** Narrowed shape for propose_structure tool parts */
export interface ProposalToolPart {
  type: string
  toolName?: string
  toolCallId: string
  state: string
  output?: unknown
}

/** Check if a UIMessage part is a propose_structure tool invocation */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isProposalPart(part: any): part is ProposalToolPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (typeof p.toolCallId !== 'string' || typeof p.state !== 'string') return false
  // DynamicToolUIPart from AI SDK
  if (p.type === 'dynamic-tool' && p.toolName === 'propose_structure') return true
  // Static ToolUIPart (type: 'tool-propose_structure')
  if (p.type === 'tool-propose_structure') return true
  return false
}

export const BRAIN_DUMP_QUICK_ACTIONS = [
  { label: '요즘 관심사 정리', prompt: '요즘 이런 것들에 관심이 있어: ' },
  { label: '새해 목표 세우기', prompt: '올해 이루고 싶은 것들을 정리하고 싶어' },
  { label: '생활 루틴 만들기', prompt: '매일 반복하는 루틴을 만들고 싶어' },
]
