import type { MoodLevel } from '@/types/entities'

/**
 * 체크인율 계산
 */
export function calculateCheckInRate(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * 평균 기분 레이블 계산
 */
export function getAvgMoodLabel(avgMood: number): MoodLevel {
  if (avgMood >= 4.5) return 'great'
  if (avgMood >= 3.5) return 'good'
  if (avgMood >= 2.5) return 'neutral'
  if (avgMood >= 1.5) return 'bad'
  return 'terrible'
}

/**
 * 기분 값 매핑
 */
export const MOOD_VALUES: Record<MoodLevel, number> = {
  terrible: 1,
  bad: 2,
  neutral: 3,
  good: 4,
  great: 5,
}

/**
 * 기분 이모지 매핑
 */
export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  terrible: '😫',
  bad: '😕',
  neutral: '😐',
  good: '🙂',
  great: '😄',
}

/**
 * 기분 한글 레이블
 */
export const MOOD_LABELS: Record<MoodLevel, string> = {
  terrible: '힘들어요',
  bad: '별로예요',
  neutral: '보통이에요',
  good: '좋아요',
  great: '최고예요',
}

/**
 * 최근 체크인 표시 일수
 */
export const RECENT_CHECKINS_LIMIT = 7

/**
 * 완료율 기반 색상 클래스
 */
export function getCompletionColorClass(rate: number): string {
  if (rate >= 80) return 'text-[var(--color-done)]'
  if (rate >= 50) return 'text-[var(--color-primary-500)]'
  return 'text-[var(--color-text-secondary)]'
}
