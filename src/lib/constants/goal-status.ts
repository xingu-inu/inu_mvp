import type { GoalStatus } from '@/types/entities'

export const STATUS_STYLES: Record<GoalStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  backlog: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500',
}

export const STATUS_LABELS: Record<GoalStatus, string> = {
  active: '진행중',
  backlog: '백로그',
  completed: '완료',
  maintenance: '유지',
  paused: '일시정지',
  archived: '아카이브',
}
