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
  output?: { type: 'suggest_responses'; chips: { label: string; message: string }[] }
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

export const BRAIN_DUMP_QUICK_ACTIONS = [
  { label: '마음 정리', prompt: '요즘 머릿속이 복잡해. 있는 그대로 꺼내볼게, 같이 정리해줘: ' },
  { label: '삶의 시즌 정리', prompt: '지금 내 삶의 시즌이 어떤 상태인지 같이 정리하고 싶어' },
  { label: '중요한 것 찾기', prompt: '나는 요즘 무엇을 더 중요하게 살아야 하는지 같이 찾고 싶어' },
]
