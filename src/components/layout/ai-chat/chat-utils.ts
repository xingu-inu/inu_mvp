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
