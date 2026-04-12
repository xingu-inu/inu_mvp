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

/** 이누 패널 빈 상태에서 노출되는 환영 문구. */
export const INU_WELCOME_GREETING = '머릿속에 있는 거 편하게 꺼내줘. 이누가 같이 정리할게'

/**
 * 이누 패널 빈 상태 가이드 칩. 대화가 없을 때 즉시 노출되는 대화 시작 칩.
 * 호기심/성장/가벼운 정리 톤으로 — "안 되는 중" 프레임은 피한다.
 */
export const INU_WELCOME_CHIPS = [
  {
    label: '요즘 꽂힌 거 있음',
    message: '요즘 내가 꽂혀 있는 게 있는데 같이 얘기해보고 싶어',
  },
  {
    label: '새로 시작하고 싶은 거',
    message: '새로 시작해보고 싶은 게 있는데 같이 꺼내서 정리해줘',
  },
  {
    label: '재밌는 아이디어 떠오름',
    message: '재밌는 아이디어가 떠올랐는데 같이 풀어보고 싶어',
  },
  {
    label: '다음 한 걸음 같이 보기',
    message: '지금 내 상황에서 다음 한 걸음이 뭐면 좋을지 같이 봐줘',
  },
  {
    label: '방향 다시 짚어보기',
    message: '요즘 방향이 맞는지 같이 한번 짚어보고 싶어',
  },
  {
    label: '머리 복잡해 정리하고파',
    message: '머릿속이 좀 복잡해서 같이 꺼내서 정리해보고 싶어',
  },
  {
    label: '할 게 많아서 뭐부터',
    message: '할 게 여러 개 있는데 뭐부터 잡으면 좋을지 같이 봐줘',
  },
  {
    label: '살짝 힘 빼고 싶어',
    message: '요즘 조금 지쳐 있어서 힘 빼고 가볍게 가는 방법 같이 찾자',
  },
] as const
