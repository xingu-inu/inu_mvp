import type { GoalStatus } from '@/types/entities'

export interface GoalStatusConfig {
  label: string
  bg: string
  text: string
  border: string
}

/**
 * Goal 상태 표시 설정 — Single Source of Truth
 * 모든 라벨은 한국어. active=파랑, completed=초록으로 구분.
 */
export const GOAL_STATUS_CONFIG: Record<GoalStatus, GoalStatusConfig> = {
  active: {
    label: '진행 중',
    bg: 'bg-[var(--color-active-bg)]',
    text: 'text-[var(--color-active)]',
    border: 'border-[var(--color-active)]',
  },
  backlog: {
    label: '시작 전',
    bg: 'bg-[var(--color-bg-tertiary)]',
    text: 'text-[var(--color-text-tertiary)]',
    border: 'border-[var(--color-text-tertiary)]',
  },
  paused: {
    label: '일시 정지',
    bg: 'bg-[var(--color-paused-bg)]',
    text: 'text-[var(--color-paused)]',
    border: 'border-[var(--color-paused)]',
  },
  completed: {
    label: '완료',
    bg: 'bg-[var(--color-done-bg)]',
    text: 'text-[var(--color-done)]',
    border: 'border-[var(--color-done)]',
  },
  archived: {
    label: '나중에',
    bg: 'bg-[var(--color-archived-bg)]',
    text: 'text-[var(--color-archived)]',
    border: 'border-[var(--color-archived)]',
  },
  // Legacy status (DB 호환용 — UI에서 신규 설정 불가)
  maintenance: {
    label: '진행 중',
    bg: 'bg-[var(--color-primary-50)]',
    text: 'text-[var(--color-primary-600)]',
    border: 'border-[var(--color-primary-500)]',
  },
}

/**
 * 폼/상태 변경 UI용 옵션 (archived 제외)
 */
export const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: '진행 중' },
  { value: 'backlog', label: '시작 전' },
  { value: 'paused', label: '일시 정지' },
  { value: 'completed', label: '완료' },
  { value: 'archived', label: '나중에 하기' },
]

/**
 * 트리뷰 상태 그룹 (한국어 라벨 + 기본 확장 설정)
 */
export const GOAL_STATUS_GROUPS: {
  id: GoalStatus
  label: string
  defaultExpanded: boolean
}[] = [
  { id: 'active', label: '진행 중', defaultExpanded: true },
  { id: 'backlog', label: '시작 전', defaultExpanded: false },
  { id: 'paused', label: '일시 정지', defaultExpanded: false },
  { id: 'completed', label: '완료', defaultExpanded: false },
  { id: 'archived', label: '나중에 하기', defaultExpanded: false },
]

/**
 * 상태 변경 이유 태그 (일시정지/대기 전환 시 사용)
 */
export const STATUS_CHANGE_REASONS = [
  { value: 'time', label: '시간 부족' },
  { value: 'interest', label: '흥미 변화' },
  { value: 'priority', label: '우선순위 변경' },
  { value: 'redefine', label: '목표 재정의' },
  { value: 'health', label: '건강/컨디션' },
  { value: 'external', label: '외부 요인' },
] as const

/**
 * 상태 전환 시 성장 마인드셋 토스트 메시지
 */
export const STATUS_CHANGE_MESSAGES: Partial<Record<GoalStatus, string>> = {
  active: '다시 시작하는 것도 용기예요',
  backlog: '때가 되면 다시 꺼내볼 수 있어요',
  paused: '쉬는 것도 과정의 일부예요. 준비되면 언제든 돌아오세요',
  completed: '목표를 달성하셨군요! 대단해요',
  archived: '언제든 다시 꺼내볼 수 있어요',
}

/**
 * 다이얼로그가 필요한 상태 전환인지 판별
 */
export function needsTransitionDialog(
  from: GoalStatus,
  to: GoalStatus
): 'pause' | 'complete' | 'archive' | null {
  if (to === 'completed') return 'complete'
  if (to === 'paused' && from === 'active') return 'pause'
  if (to === 'archived') return 'archive'
  return null
}
