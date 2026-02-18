import type { TaskStatus } from '@/types/entities'

export interface TaskStatusConfig {
  label: string
  bg: string
  text: string
  border: string
}

/**
 * Task 상태 표시 설정 -- Single Source of Truth
 * goal-status.ts 패턴과 동일. active=파랑, completed=초록, paused=주황.
 */
export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  active: {
    label: '진행 중',
    bg: 'bg-[var(--color-primary-50)]',
    text: 'text-[var(--color-primary-600)]',
    border: 'border-[var(--color-primary-500)]',
  },
  completed: {
    label: '완료',
    bg: 'bg-[var(--color-done-bg)]',
    text: 'text-[var(--color-done)]',
    border: 'border-[var(--color-done)]',
  },
  paused: {
    label: '일시 정지',
    bg: 'bg-[var(--color-paused-bg)]',
    text: 'text-[var(--color-paused)]',
    border: 'border-[var(--color-paused)]',
  },
}

/**
 * Task 일시정지 이유 태그
 */
export const TASK_PAUSE_REASONS = [
  { value: 'time', label: '시간 부족' },
  { value: 'interest', label: '흥미 감소' },
  { value: 'priority', label: '다른 우선순위' },
  { value: 'difficulty', label: '난이도 조절 필요' },
  { value: 'health', label: '건강/컨디션' },
] as const

/**
 * 상태 전환 시 성장 마인드셋 토스트 메시지
 */
export const TASK_STATUS_MESSAGES: Partial<Record<TaskStatus, string>> = {
  active: '다시 시작하는 것도 용기예요',
  paused: '쉬는 것도 과정의 일부예요. 준비되면 언제든 돌아오세요',
  completed: '해냈어요!',
}
