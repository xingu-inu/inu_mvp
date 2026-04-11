import type { UIMessage } from 'ai'
import type { ChatMessage } from '@/types/entities'

/** Convert DB ChatMessage[] to UIMessage[] */
export function toUIMessages(dbMessages: ChatMessage[]): UIMessage[] {
  return dbMessages
    .filter((m) => !(m.role === 'user' && m.content === ''))
    .map((m) => ({
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
  {
    label: '삶의 방향 점검',
    prompt: '요즘 내 삶의 방향이 지금 내가 원하는 방향과 맞는지 같이 점검해줘',
  },
  {
    label: '이번 시즌 정리',
    prompt: '지금 내 삶의 시즌을 같이 정리해줘. 무엇에 집중하고 무엇을 덜어내면 좋을지 보고 싶어',
  },
  {
    label: '다음 한 걸음',
    prompt: '지금 내 상황을 기준으로 이번 주 가장 중요한 한 걸음을 같이 정해줘',
  },
  {
    label: '나에 대해 정리',
    prompt:
      '지금까지 대화한 내용을 바탕으로 나에 대해 정리해줘. 프로필에 추가할 만한 것들을 제안해줘.',
  },
]

export const GOAL_QUICK_ACTIONS = [
  { label: '방향과의 정합성', prompt: '이 목표가 지금 내 삶의 방향과 잘 맞는지 같이 봐줘' },
  {
    label: '다음 단계 제안',
    prompt: '이 목표를 너무 무겁지 않게 이어가기 위한 다음 단계를 제안해줘',
  },
  { label: '막힘 정리', prompt: '이 목표에서 내가 어디서 막히고 있는지 같이 정리해줘' },
]

export const TASK_QUICK_ACTIONS = [
  {
    label: '꾸준히 하는 팁',
    prompt: '이 할 일을 지금 내 리듬에 맞게 꾸준히 이어가는 방법을 같이 찾아줘',
  },
  { label: '부담 줄이기', prompt: '이 할 일이 너무 버겁다면 어떻게 더 가볍게 바꿀 수 있을까?' },
  { label: '의미 다시 보기', prompt: '이 할 일이 왜 중요한지 지금 내 방향과 연결해서 다시 짚어줘' },
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
export function isProposalPart(part: unknown): part is ProposalToolPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (typeof p.toolCallId !== 'string' || typeof p.state !== 'string') return false
  // DynamicToolUIPart from AI SDK
  if (p.type === 'dynamic-tool' && p.toolName === 'propose_structure') return true
  // Static ToolUIPart (type: 'tool-propose_structure')
  if (p.type === 'tool-propose_structure') return true
  return false
}

/** Narrowed shape for suggest_profile_traits tool parts */
export interface TraitSuggestionToolPart {
  type: string
  toolName?: string
  toolCallId: string
  state: string
  output?: unknown
}

/** Check if a UIMessage part is a suggest_profile_traits tool invocation */
export function isTraitSuggestionPart(part: unknown): part is TraitSuggestionToolPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (typeof p.toolCallId !== 'string' || typeof p.state !== 'string') return false
  if (p.type === 'dynamic-tool' && p.toolName === 'suggest_profile_traits') return true
  if (p.type === 'tool-suggest_profile_traits') return true
  return false
}

/** Narrowed shape for suggest_responses tool parts */
export interface ResponseChipsPart {
  type: string
  toolName?: string
  toolCallId: string
  state: string
  output?: {
    type: 'suggest_responses'
    chips: { label: string; message: string }[]
    multi?: boolean
  }
}

/** Check if a UIMessage part is a suggest_responses tool invocation */
export function isResponseChipsPart(part: unknown): part is ResponseChipsPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (typeof p.toolCallId !== 'string' || typeof p.state !== 'string') return false
  if (p.type === 'dynamic-tool' && p.toolName === 'suggest_responses') return true
  if (p.type === 'tool-suggest_responses') return true
  return false
}

/**
 * 오프닝 모드에서 AI 첫 멘트가 도착하기 전 즉시 렌더되는 폴백 상황 칩.
 * 빈 화면 체감을 0ms로 만들기 위한 용도.
 */
export const FALLBACK_SITUATION_CHIPS = [
  { label: '요즘 운동 안 함', message: '요즘 운동 손 놨는데, 다시 붙일 방법 같이 정리해줘' },
  { label: '이직 고민 중', message: '이직 고민 중이야. 어떤 기준으로 정리해야 할지 같이 봐줘' },
  { label: '관계가 피곤해', message: '요즘 사람 관계가 피곤해. 뭘 줄이고 뭘 지킬지 같이 정리해줘' },
  { label: '돈 걱정', message: '돈 걱정이 계속 머리에 있어. 뭐부터 잡아야 할지 같이 봐줘' },
  { label: '잠이 불규칙', message: '요즘 잠이 완전 불규칙해. 리듬 되찾는 법 같이 찾자' },
  { label: '공부 손 놓음', message: '공부 손 놓은 지 오래야. 다시 붙일 작은 방법 같이 찾자' },
  {
    label: '할 게 너무 많음',
    message: '머릿속에 할 게 너무 많아서 시작을 못 해. 같이 꺼내서 정리해줘',
  },
  {
    label: '아무것도 하기 싫음',
    message: '요즘 아무것도 하기 싫어. 부담 주지 말고 같이 꺼내서 봐줘',
  },
] as const

/** Narrowed shape for suggest_opening tool parts */
export interface OpeningToolPart {
  type: string
  toolName?: string
  toolCallId: string
  state: string
  output?: {
    type: 'suggest_opening'
    greeting: string
    categories: {
      continuing: { label: string; chips: { label: string; message: string }[] }
      fresh: { label: string; chips: { label: string; message: string }[] }
      free: { label: string; hint: string }
    }
  }
}

/** Check if a UIMessage part is a suggest_opening tool invocation */
export function isOpeningPart(part: unknown): part is OpeningToolPart {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>
  if (typeof p.toolCallId !== 'string' || typeof p.state !== 'string') return false
  if (p.type === 'dynamic-tool' && p.toolName === 'suggest_opening') return true
  if (p.type === 'tool-suggest_opening') return true
  return false
}
