import { parseISO, getDay, getWeek } from 'date-fns'
import type { DayHistory } from '../hooks/use-checkin-history'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 데이터 기반 맥락 서브텍스트 생성
 * 데이터 부족 시 빈 문자열 반환 (빈말 방지)
 */
export function generateInsightText(
  checkInHistory: DayHistory[],
  period: 'week' | 'month'
): string {
  const activeDays = checkInHistory.filter((d) => d.completed > 0)
  if (activeDays.length < 2) return ''

  if (period === 'week') {
    return generateWeekInsight(checkInHistory)
  }
  return generateMonthInsight(checkInHistory)
}

/** 주간: 가장 꾸준한 요일 탐색 */
function generateWeekInsight(history: DayHistory[]): string {
  // Find days with 100% completion
  const perfectDays = history.filter((d) => d.total > 0 && d.completed === d.total)
  if (perfectDays.length >= 2) {
    const dayNames = perfectDays.map((d) => DAY_NAMES[getDay(parseISO(d.date))])
    return `${dayNames.join('·')}에 모두 완료했어요`
  }

  // Find days with highest completion rate
  const activeDays = history
    .filter((d) => d.total > 0)
    .map((d) => ({
      ...d,
      rate: d.completed / d.total,
      dayName: DAY_NAMES[getDay(parseISO(d.date))],
    }))
    .sort((a, b) => b.rate - a.rate)

  if (activeDays.length >= 2) {
    const topDays = activeDays.filter((d) => d.rate >= activeDays[0].rate)
    if (topDays.length <= 3) {
      return `${topDays.map((d) => d.dayName).join('·')}에 가장 꾸준했어요`
    }
  }

  return ''
}

/** 월간: 가장 활발했던 주차 탐색 */
function generateMonthInsight(history: DayHistory[]): string {
  if (history.length < 7) return ''

  // Group by week number
  const weekMap = new Map<number, { total: number; completed: number }>()

  for (const day of history) {
    const weekNum = getWeek(parseISO(day.date), { weekStartsOn: 1 })
    const existing = weekMap.get(weekNum) ?? { total: 0, completed: 0 }
    weekMap.set(weekNum, {
      total: existing.total + day.total,
      completed: existing.completed + day.completed,
    })
  }

  const weeks = Array.from(weekMap.entries())
    .filter(([, data]) => data.total > 0)
    .sort((a, b) => {
      const rateA = a[1].completed / a[1].total
      const rateB = b[1].completed / b[1].total
      return rateB - rateA
    })

  if (weeks.length < 2) return ''

  // Find position of best week
  const bestWeek = weeks[0]
  const allWeeksSorted = Array.from(weekMap.keys()).sort((a, b) => a - b)
  const weekIndex = allWeeksSorted.indexOf(bestWeek[0])

  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const weekLabel = ordinals[weekIndex] ?? `${weekIndex + 1}번째`

  return `${weekLabel} 주가 가장 활발했어요`
}

/**
 * 성장 마인드셋 요약 문구 생성
 * "no guilt" 프레이밍: 어떤 수준이든 긍정적으로
 */
export function generateGrowthSummary(activeDays: number, totalDays: number): string {
  if (activeDays >= totalDays - 1 && activeDays > 0) {
    return '거의 매일 실천했어요!'
  }
  if (activeDays >= totalDays * 0.5) {
    return `${totalDays}일 중 ${activeDays}일 실천했어요`
  }
  if (activeDays > 0) {
    return `${activeDays}일 실천했어요. 시작한 것 자체가 의미있어요`
  }
  return '쉬어가는 것도 여정의 일부예요'
}

/**
 * 여정 프레이밍의 따뜻한 내러티브 생성
 * inu 철학: "no guilt" — 어떤 수준이든 여정의 일부로 프레이밍
 */
export function generateGreeting(
  stats: { checkInRate: number; currentStreak: number },
  checkInHistory: DayHistory[],
  totalDays: number,
  period: 'week' | 'month' = 'week'
): string {
  const activeDays = checkInHistory.filter((d) => d.total > 0).length
  const rate = stats.checkInRate
  const periodLabel = period === 'week' ? '한 주' : '한 달'

  const tone =
    rate >= 80
      ? `활기찬 ${periodLabel}이었어요.`
      : rate >= 50
        ? `꾸준히 걸어온 ${periodLabel}이었어요.`
        : rate > 0
          ? '쉬어가는 것도 여정의 일부예요.'
          : `조용한 ${periodLabel}이었네요. 괜찮아요.`

  let fact: string
  if (activeDays === 0) {
    fact = '새로운 시작을 준비하고 있어요.'
  } else {
    const dayPart = `${totalDays}일 중 ${activeDays}일을 기록했고`
    if (stats.currentStreak > 0) {
      fact = `${dayPart}, 🔥 ${stats.currentStreak}일째 이어가고 있어요.`
    } else {
      fact = `${dayPart}, 새로운 시작을 준비하고 있어요.`
    }
  }

  return `${tone} ${fact}`
}

/**
 * 일별 완료 내러티브 (% 대신 자연어)
 * "no guilt" 철학: 어떤 수준이든 긍정적으로
 */
export function generateDayNarrative(completed: number, total: number): string {
  if (total === 0) return '조용한 하루였어요'
  if (completed === total) return '모두 해냈어요!'
  if (completed === 0) return '쉬어가는 하루였어요'
  return `${total}개 중 ${completed}개를 해냈어요`
}

/**
 * 영역별 활동 내러티브 (프로그레스 바 대신)
 */
export function generateAreaNarrative(completionRate: number): string {
  if (completionRate >= 90) return '매일 해냈어요!'
  if (completionRate >= 70) return '꾸준히 이어가고 있어요'
  if (completionRate >= 40) return '조금씩 해나가고 있어요'
  if (completionRate > 0) return '조용한 주였어요'
  return '쉬어가는 중이에요'
}

/** 성장 지향 회고 프롬프트 */
export const REFLECTION_PROMPTS = {
  daily: [
    '오늘 가장 기억에 남는 순간은?',
    '오늘 뭔가 새롭게 느낀 게 있다면?',
    '오늘을 돌아보면...',
    '오늘 나에게 해주고 싶은 말은?',
  ],
  weekly: [
    '이번 주에서 가장 자랑스러운 건?',
    '다음 주에 다르게 해보고 싶은 건?',
    '이번 주를 한 단어로 표현한다면?',
  ],
  monthly: [
    '이번 달을 한 단어로 표현한다면?',
    '다음 달에 집중하고 싶은 건?',
    '이번 달 가장 큰 변화는?',
  ],
} as const
